// Read-only corpus audit. Flags are review prompts, never pedagogical approval.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const Dictation=require('../Dev/app/dictation.js');
const root=path.resolve(__dirname,'..');
const sourceFile=path.join(root,'Dev/app/uebungen.js');
const words=text=>text.match(/[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*/gu)||[];
function loadData(raw){
  const body=raw.replace(/^\s*\/\*[\s\S]*?\*\/\s*/u,'');
  const match=body.match(/^window\.TB_PRACTICE\s*=\s*([\s\S]*);\s*$/u);
  if(!match)throw new Error('Unexpected practice data format');
  const data=JSON.parse(match[1]);
  for(const key of ['cats','s','t','d','w'])if(!Array.isArray(data[key]))throw new Error('Missing corpus array '+key);
  return data;
}
function auditEntry(data,entry,index){
  const [topic,level,indices,counts]=entry;
  if(!data.t[topic] || ![1,2].includes(level) || !Array.isArray(indices) || !indices.length || indices.some(i=>!Number.isInteger(i)||!data.s[i]) || !Array.isArray(counts)||counts.length!==data.cats.length || counts.some(n=>!Number.isFinite(n)||n<0))throw new Error('Invalid dictation '+index);
  const sentences=indices.map(i=>data.s[i]),text=sentences.join(' '),tokens=words(text);
  const maxSentenceWords=Math.max(...sentences.map(s=>words(s).length));
  const longWords=[...new Set(tokens.filter(w=>[...w].length>=18))];
  const flags=[];
  if(/^(?:Er|Es|Sie|Ihm|Ihn|Ihnen|Sein(?:e[rmns]?)?|Ihr(?:e[rmns]?)?|Dies(?:e[rmns]?)?|Dadurch|Deshalb|Daher|Dort|Damit|Dabei|Solche|Solcher|Solches)\b/u.test(text))flags.push('bezug-am-anfang-pruefen');
  if(maxSentenceWords>20)flags.push('satz-ueber-20-woerter');
  if(longWords.length)flags.push('wort-ab-18-buchstaben');
  if(/\d/u.test(text))flags.push('zahlen-vorlesen-pruefen');
  if(/[„“"«»:;()[\]–—]/u.test(text))flags.push('weitere-satzzeichen-vorlesen-pruefen');
  if(/\b([\p{L}\p{M}]+)\s+\1\b/iu.test(text))flags.push('wortwiederholung-pruefen');
  if(/\s+[,.!?]|[,.!?][\p{L}]|\s{2,}/u.test(text))flags.push('abstaende-pruefen');
  if(!/[.!?]$/u.test(text))flags.push('satzabschluss-pruefen');
  if(/\b(?:Vergewaltigung|Prostitution|Selbstmord|Suizid|Folter|Hinrichtung|Konzentrationslager|Holocaust|ermordet|Geschlechtsverkehr|Völkermord)\b/iu.test(text))flags.push('sensibler-inhalt-kontext-pruefen');
  return {id:data.entries?.[index]?.id || 'D'+String(index).padStart(4,'0'),index,topic:data.t[topic],level,source:data.source || (level===1?'MiniKlexikon':'Klexikon'),sentenceIndices:indices,text,wordCount:tokens.length,sentenceCount:sentences.length,maxSentenceWords,longWords,focus:Object.fromEntries(data.cats.map((c,i)=>[c,counts[i]])),flags};
}
function stats(values){
  const sorted=[...values].sort((a,b)=>a-b),at=p=>sorted[Math.floor((sorted.length-1)*p)];
  return {min:sorted[0],p50:at(.5),p90:at(.9),p95:at(.95),max:sorted.at(-1)};
}
async function selectionAudit(data,appSource){
  if(data.version!==Dictation.VERSION || !Array.isArray(data.entries))throw new Error('The current selection audit requires reviewed material; inspect the historical audit with its matching application revision.');
  const bank=await Dictation.prepare(data);
  const groups=appSource.match(/const CAT_GROUPS = (\[[\s\S]*?\n  \]);/u);
  if(!groups)throw new Error('Application categories not found');
  const applicationCategories=vm.runInNewContext(groups[1],{},{timeout:1000}).flatMap(g=>Object.keys(g[1])).filter(c=>c!=='other');
  const profiles=[],categories=[...new Set([...data.cats,...applicationCategories])];
  for(const level of [1,2])for(const focus of categories){
    let seed=246813579;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const result=Array.from({length:200},()=>Dictation.choose(bank,{focus,level,random}));
    const positive=result.filter(r=>r.entry?.focus===focus&&r.entry.level===level).length,unavailable=result.filter(r=>!r.entry).length;
    const available=bank.entries.filter(e=>e.focus===focus&&e.level===level).length;
    profiles.push({level,focus,draws:result.length,availableWithTaggedFocus:available,selectedWithTaggedFocus:positive,selectedWithoutTaggedFocus:result.length-positive-unavailable,unavailable,exampleIds:[...new Set(result.flatMap(r=>r.entry?[r.entry.id]:[]))].slice(0,3)});
  }
  return profiles;
}
function summarize(data,rows,selection){
  const flagCounts=Object.fromEntries([...new Set(rows.flatMap(r=>r.flags))].map(flag=>[flag,rows.filter(r=>r.flags.includes(flag)).length]));
  const byLevel=Object.fromEntries([1,2].map(level=>{const group=rows.filter(r=>r.level===level);return [level,{count:group.length,wordCount:stats(group.map(r=>r.wordCount)),maxSentenceWords:stats(group.map(r=>r.maxSentenceWords)),reviewFlags:group.filter(r=>r.flags.length).length}];}));
  const focusCoverage=Object.fromEntries(data.cats.map(cat=>[cat,{positive:rows.filter(r=>r.focus[cat]>0).length,zero:rows.filter(r=>r.focus[cat]===0).length}]));
  const byText=new Map();for(const row of rows){const key=row.text.normalize('NFC');if(!byText.has(key))byText.set(key,[]);byText.get(key).push(row.id);}
  return {automaticPedagogicalApproval:false,dictations:rows.length,sentences:data.s.length,topics:data.t.length,wordBank:data.w.length,byLevel,flagCounts,focusCoverage,duplicateGroups:[...byText.values()].filter(ids=>ids.length>1),selection,limits:['Flags are review prompts, not confirmed errors or unsuitable texts.','Word/sentence lengths are descriptions, not clinical cutoffs or proof of grade suitability.','Focus counts are the existing application metadata, not independently verified learning-word annotations.','Selection draws exercise the actual current selection functions with synthetic profiles; no personal child data.']};
}
function csv(value){const text=String(value??'');return '"'+(/^[=+\-@]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
async function main(){
  const raw=fs.readFileSync(sourceFile,'utf8'),data=loadData(raw);
  const rows=data.d.map((entry,index)=>auditEntry(data,entry,index));
  const app=fs.readFileSync(path.join(root,'Dev/app/app.js'),'utf8'),selection=await selectionAudit(data,app);
  const directory=path.join(root,'test-results/dictations',new Date().toISOString().replaceAll(':','-'));
  fs.mkdirSync(directory,{recursive:true});
  const summary=summarize(data,rows,selection);
  fs.writeFileSync(path.join(directory,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({created:new Date().toISOString(),target:'Ab Klasse 5; individuelle Rechtschreib- und Lesekompetenz gesondert berücksichtigen',source:'Dev/app/uebungen.js',sourceHash:createHash('sha256').update(raw).digest('hex'),applicationHash:createHash('sha256').update(app).digest('hex'),automaticPedagogicalApproval:false},null,2)+'\n');
  fs.writeFileSync(path.join(directory,'dictations.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  fs.writeFileSync(path.join(directory,'corpus.json'),JSON.stringify(rows.map(r=>({id:r.id,input:r.text})),null,2)+'\n');
  const header=['ID','Thema','Stufe','Wörter','Längster Satz (Wörter)','Prüfanlässe, keine Fehlerbestätigung','Text','Sprachlich richtig','Eigenständig verständlich','Für Zielgruppe passend','Fokuswörter geprüft','Notiz'];
  const cells=rows.map(r=>[r.id,r.topic,r.level,r.wordCount,r.maxSentenceWords,r.flags.join(', '),r.text,'','','','','']);
  fs.writeFileSync(path.join(directory,'review.csv'),'\ufeff'+[header,...cells].map(r=>r.map(csv).join(';')).join('\r\n'));
  const selected=new Set();for(const level of [1,2]){const group=rows.filter(r=>r.level===level);for(let i=0;i<32;i++)selected.add(group[Math.floor(i*(group.length-1)/31)].index);}
  for(const flag of ['bezug-am-anfang-pruefen','satz-ueber-20-woerter','wort-ab-18-buchstaben','sensibler-inhalt-kontext-pruefen','weitere-satzzeichen-vorlesen-pruefen'])for(const row of rows.filter(r=>r.flags.includes(flag)).slice(0,4))selected.add(row.index);
  const samples=rows.filter(r=>selected.has(r.index));
  fs.writeFileSync(path.join(directory,'samples.json'),JSON.stringify(samples,null,2)+'\n');
  console.log(JSON.stringify({directory,...summary,selection:undefined,duplicateGroups:summary.duplicateGroups.length,manualSamples:samples.length},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={loadData,auditEntry,stats,selectionAudit,summarize};
