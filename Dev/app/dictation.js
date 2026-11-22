(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;else root.TB_DICTATION=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='grade5-v1';
  const preparedBanks=new WeakSet();
  function freeze(value){if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  const CATEGORIES={gross:'Nomen großschreiben',klein:'Verben und Adjektive kleinschreiben',ss:'s, ss und ß',ie:'i und ie',dehnung:'Stummes h',dopp:'Doppelte Konsonanten',ae:'ä und e',aeu:'äu und eu',hartweich:'b/p, d/t und g/k',fvw:'f, v und w',spiegel:'b/d und p/q',formaehnlich:'m, n und u',eiie:'ei und ie',umstellung:'Reihenfolge der Buchstaben',auslassung:'Alle Buchstaben schreiben',zusatz:'Zusätzliche Buchstaben vermeiden',komma:'Kommas',satzende:'Satzende',leer:'Wortgrenzen und Leerzeichen',satzz:'Frage- und Ausrufezeichen',fall:'Fälle und Endungen',verb:'Passende Verbformen',grammatik:'Satzbau',doppelwort:'Wörter einmal schreiben',verwechselt:'Ähnliche Wörter im Zusammenhang',dassdas:'das und dass',getrennt:'Getrennt und zusammen'};
  const tokenize=text=>[...text.matchAll(/[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*|[^\s]/gu)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
  function payload(e){return JSON.stringify([e.id,e.topic,e.level,e.minGrade,e.focus,e.goal,e.text,e.targets]);}
  async function fingerprint(e){
    const result=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload(e)));
    return [...new Uint8Array(result)].map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  function targetSpans(entry){
    const occupied=[];
    return entry.targets.map(target=>{
      if(!target || !['word','phrase','punctuation'].includes(target.kind) || typeof target.text!=='string' || !target.text || !Number.isInteger(target.occurrence??0) || (target.occurrence??0)<0)throw Error('Invalid target');
      const matches=[];let found=-1;
      while((found=entry.text.indexOf(target.text,found+1))>=0){const after=found+target.text.length;if(target.kind==='punctuation' || !/\p{L}/u.test(entry.text[found-1]||'') && !/\p{L}/u.test(entry.text[after]||''))matches.push(found);}
      const start=matches[target.occurrence??0];if(start===undefined)throw Error('Missing target');
      const end=start+target.text.length;
      if(target.kind!=='punctuation' && (/\p{L}/u.test(entry.text[start-1]||'') || /\p{L}/u.test(entry.text[end]||'')))throw Error('Partial target');
      if(target.kind==='word' && !/^[\p{L}\p{M}]+$/u.test(target.text))throw Error('Invalid word');
      if(target.kind==='punctuation' && !/^[.,!?]$/u.test(target.text))throw Error('Invalid punctuation');
      if(occupied.some(s=>start<s.end && end>s.start))throw Error('Overlapping targets');
      const span={...target,start,end};occupied.push(span);return span;
    });
  }
  function validateEntry(e){
    if(!e || !/^g5-[a-z0-9-]+$/u.test(e.id) || !CATEGORIES[e.focus] || ![1,2].includes(e.level) || e.minGrade!==5 || typeof e.topic!=='string' || !e.topic.trim() || typeof e.goal!=='string' || !e.goal.trim() || typeof e.text!=='string' || !/^[\p{Lu}]/u.test(e.text) || !/[.!?]$/u.test(e.text) || /[^\p{L}\p{M}\s,.!?]/u.test(e.text) || !Array.isArray(e.targets) || e.targets.length<2)throw Error('Invalid reviewed dictation');
    const wordCount=tokenize(e.text).filter(t=>/\p{L}/u.test(t.text)).length;
    if(wordCount<15 || wordCount>65)throw Error('Dictation length');
    for(const sentence of e.text.match(/[^.!?]+[.!?]/gu)||[])if(tokenize(sentence).filter(t=>/\p{L}/u.test(t.text)).length>18)throw Error('Sentence length');
    if(e.text!==e.text.normalize('NFC'))throw Error('Non-normalized text');targetSpans(e);return e;
  }
  async function prepare(data){
    if(data?.version!==VERSION || !Array.isArray(data.entries))return {version:VERSION,entries:[],rejected:[]};
    const ids=new Set(),repeated=new Set();for(const e of data.entries){if(ids.has(e.id))repeated.add(e.id);ids.add(e.id);}
    const entries=[],rejected=[];
    for(const entry of data.entries){
      try{
        validateEntry(entry);
        if(repeated.has(entry.id) || entry.review?.status!=='reviewed' || !/^[a-f0-9]{64}$/u.test(entry.review.hash||'') || await fingerprint(entry)!==entry.review.hash)throw Error('Review missing or stale');
        entries.push(JSON.parse(JSON.stringify(entry)));
      }catch(error){rejected.push({id:entry?.id||'',reason:error.message});}
    }
    const bank=freeze({version:VERSION,entries,rejected});preparedBanks.add(bank);return bank;
  }
  function validLog(log,since,today,bank){
    if(!(log?.curriculum===VERSION && log.done && typeof log.date==='string' && /^\d{4}-\d\d-\d\d$/u.test(log.date) && (!since||log.date>=since) && (!today||log.date<=today) && CATEGORIES[log.focus] && Number.isInteger(log.focusErrors) && Number.isInteger(log.focusOpportunities) && log.focusOpportunities>0 && log.focusErrors>=0 && log.focusErrors<=log.focusOpportunities))return false;
    if(!bank)return true;
    const materials=log.type==='dict'?[{id:log.id,hash:log.materialHash}]:log.type==='words'?log.materials:[];
    return Array.isArray(materials) && materials.length>0 && materials.every(m=>bank.entries.some(e=>e.id===m.id && e.focus===log.focus && e.review.hash===m.hash));
  }
  function priorities(diary={},logs=[],{since='',today='',bank}={}){
    const scores={};for(const [cat,n] of Object.entries(diary))if(cat!=='other' && Number.isFinite(n) && n>0)scores[cat]=n;
    for(const log of [...logs].filter(l=>validLog(l,since,today,bank)).sort((a,b)=>a.date.localeCompare(b.date))){
      scores[log.focus]=Math.max(0,(scores[log.focus]||0)+log.focusErrors-(log.focusErrors===0?1:0));
    }
    return Object.entries(scores).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([focus,score])=>({focus,score}));
  }
  function levelFor(setting,logs,focus,{since='',today='',bank}={}){
    if(setting==='leicht')return 1;if(setting==='mittel')return 2;
    const recent=logs.filter(l=>l.type==='dict' && l.focus===focus && validLog(l,since,today,bank)).slice(-5);
    return recent.length>=3 && recent.every(l=>l.focusErrors===0 && l.errors===0)?2:1;
  }
  function choose(bank,{focus,level,used=[],recent=[],random=Math.random}={}){
    if(typeof focus!=='string' || !focus)return {reason:'choose-focus'};
    if(!preparedBanks.has(bank))return {reason:'no-reviewed-text',focus,level};
    const candidates=bank.entries.filter(e=>e.focus===focus && e.level===level);
    if(!candidates.length)return {reason:'no-reviewed-text',focus,level};
    const unseen=candidates.filter(e=>!used.includes(e.id)),repeat=!unseen.length;
    let pool=unseen.length?unseen:candidates;
    const fresh=pool.filter(e=>!recent.includes(e.id));if(fresh.length)pool=fresh;
    const index=Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)));
    return {entry:pool[index],repeat,focus,level};
  }
  function wordPool(bank,focus,level){
    const words=new Map();
    if(!preparedBanks.has(bank))return [];
    for(const e of bank.entries.filter(e=>e.focus===focus && (level===undefined || e.level===level)))for(const t of targetSpans(e).filter(t=>t.kind==='word')){
      const sentence=(e.text.match(/[^.!?]+[.!?]/gu)||[]).find(s=>s.includes(t.text));
      if(!words.has(t.text))words.set(t.text,{word:t.text,context:sentence?.trim()||e.text,cat:focus,entryId:e.id});
    }
    return [...words.values()];
  }
  function evaluate(entry,input){
    const expected=tokenize(entry.text),typed=tokenize(input.normalize('NFC')),a=typed.map(t=>t.text),b=expected.map(t=>t.text);
    const d=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+Number(a[i-1]!==b[j-1]));
    const pairs=[];let i=a.length,j=b.length;
    while(i||j){
      if(i&&j&&d[i][j]===d[i-1][j-1]+Number(a[i-1]!==b[j-1])){pairs.push({typed:a[--i],expected:b[--j],expectedIndex:j});}
      else if(j&&d[i][j]===d[i][j-1]+1){pairs.push({typed:null,expected:b[--j],expectedIndex:j});}
      else {pairs.push({typed:a[--i],expected:null,expectedIndex:null,beforeExpected:j});}
    }
    pairs.reverse();
    const targets=targetSpans(entry).map(span=>{
      const indices=expected.map((t,k)=>t.start<span.end && t.end>span.start?k:-1).filter(k=>k>=0);
      const affected=pairs.filter(p=>indices.includes(p.expectedIndex) || p.expectedIndex===null && p.beforeExpected>indices[0] && p.beforeExpected<=indices.at(-1));
      return {...span,correct:affected.length>0 && affected.every(p=>p.typed===p.expected)};
    });
    return {pairs,words:expected.filter(t=>/\p{L}/u.test(t.text)).length,errors:pairs.filter(p=>p.typed!==p.expected).length,focusOpportunities:targets.length,focusErrors:targets.filter(t=>!t.correct).length,targets};
  }
  return {VERSION,CATEGORIES,payload,fingerprint,validateEntry,targetSpans,prepare,priorities,levelFor,choose,wordPool,evaluate,tokenize};
});
