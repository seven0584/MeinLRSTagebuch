const fs=require('node:fs/promises');
const path=require('node:path');
const Dictation=require('../Dev/app/dictation.js');
const root=path.resolve(__dirname,'..');
function entriesFrom(source){
  return source.entries.map(row=>{
    const counts=new Map();
    const targets=row.targets.map(text=>{const occurrence=counts.get(text)||0;counts.set(text,occurrence+1);return {text,kind:/^[.,!?]$/u.test(text)?'punctuation':/^[\p{L}\p{M}]+$/u.test(text)?'word':'phrase',occurrence};});
    return {id:row.id,topic:row.topic,level:row.level,minGrade:5,focus:row.focus,goal:source.goals[row.focus],text:row.text,targets,review:{status:row.reviewHash?'reviewed':'draft',hash:row.reviewHash||''}};
  });
}
function compatibility(entries){
  const cats=Object.keys(Dictation.CATEGORIES),s=[],t=[],d=[],w=[],b=Object.fromEntries(cats.map(c=>[c,[]]));
  for(const e of entries){
    let topic=t.indexOf(e.topic);if(topic<0){topic=t.length;t.push(e.topic);}
    const indices=(e.text.match(/[^.!?]+[.!?]/gu)||[]).map(sentence=>{s.push(sentence.trim());return s.length-1;});
    d.push([topic,e.level,indices,cats.map(cat=>cat===e.focus?e.targets.length:0)]);
    for(const target of e.targets.filter(t=>t.kind==='word')){
      const sentence=indices.find(i=>s[i].includes(target.text));b[e.focus].push(w.length);w.push([target.text,sentence??-1]);
    }
  }
  return {cats,s,t,d,w,b};
}
async function build(){
  const source=JSON.parse(await fs.readFile(path.join(root,'content/dictations-grade5.json'),'utf8'));
  if(source.version!==Dictation.VERSION)throw Error('Unknown curriculum version');
  const entries=entriesFrom(source),bank=await Dictation.prepare({version:source.version,entries});
  if(bank.rejected.length || bank.entries.length!==entries.length)throw Error('Unreviewed or changed material: '+JSON.stringify(bank.rejected));
  for(const focus of Object.keys(Dictation.CATEGORIES))for(const level of [1,2])if(!bank.entries.some(e=>e.focus===focus && e.level===level))throw Error('Missing reviewed focus/level: '+focus+'/'+level);
  const data={version:source.version,source:source.source,editorialReview:source.editorialReview,entries:bank.entries,...compatibility(bank.entries)};
  await fs.writeFile(path.join(root,'Dev/app/uebungen.js'),'/* Eigene redaktionell geprüfte Übungstexte ab Klasse 5. Quelle und Prüfung: content/dictations-grade5.json und docs/diktatmaterial-klasse-5.md. */\nwindow.TB_PRACTICE = '+JSON.stringify(data,null,2)+';\n');
  console.log('Reviewed practice corpus: '+bank.entries.length+' texts, '+Object.keys(Dictation.CATEGORIES).length+' focus categories, two levels.');
  return data;
}
if(require.main===module)build().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={entriesFrom,compatibility,build};
