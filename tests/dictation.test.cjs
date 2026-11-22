const {before,test}=require('node:test');
const assert=require('node:assert/strict');
const source=require('../content/dictations-grade5.json');
const {entriesFrom}=require('../scripts/build-practice.cjs');
const D=require('../Dev/app/dictation.js');
let bank;
before(async()=>{bank=await D.prepare({version:source.version,entries:entriesFrom(source)});});
const clone=x=>JSON.parse(JSON.stringify(x));

test('all 54 editorially reviewed texts have current hashes and real targets for 27 focuses at both levels',()=>{
  assert.equal(bank.entries.length,54);assert.deepEqual(bank.rejected,[]);
  for(const focus of Object.keys(D.CATEGORIES))for(const level of [1,2]){
    const entry=bank.entries.find(e=>e.focus===focus&&e.level===level);assert.ok(entry,focus+'/'+level);
    assert.equal(entry.minGrade,5);assert.ok(D.targetSpans(entry).length>=2);
  }
  assert.ok(Object.isFrozen(bank.entries[0].targets[0]));
});
test('missing approval, stale content or grade, duplicate ids and partial targets cannot enter the bank',async()=>{
  const entry=clone(bank.entries[0]);
  for(const change of [e=>delete e.review,e=>e.review.status='draft',e=>e.text=e.text.replace('bespricht','betrachtet'),e=>e.minGrade=4,e=>e.targets[0].text='lass']){
    const e=clone(entry);change(e);const result=await D.prepare({version:D.VERSION,entries:[e]});assert.equal(result.entries.length,0);assert.equal(result.rejected.length,1);
  }
  assert.equal((await D.prepare({version:D.VERSION,entries:[entry,clone(entry)]})).entries.length,0);
  assert.equal(D.choose({entries:[entry]},{focus:entry.focus,level:1}).reason,'no-reviewed-text');
});
test('every selection keeps the requested focus and level, including repeat after exhaustion and old numeric ids',()=>{
  for(const focus of Object.keys(D.CATEGORIES))for(const level of [1,2])for(const random of [()=>0,()=>.5,()=>1]){
    const first=D.choose(bank,{focus,level,used:[0,1,2],random});assert.equal(first.entry.focus,focus);assert.equal(first.entry.level,level);assert.equal(first.repeat,false);
    const repeated=D.choose(bank,{focus,level,used:bank.entries.map(e=>e.id),random});assert.equal(repeated.entry.focus,focus);assert.equal(repeated.entry.level,level);assert.equal(repeated.repeat,true);
  }
  assert.equal(D.choose(bank,{focus:'unknown',level:1}).reason,'no-reviewed-text');
  assert.equal(D.choose(bank,{focus:'ie',level:3}).reason,'no-reviewed-text');
  assert.equal(D.choose(bank,{focus:'',level:1}).reason,'choose-focus');
});
test('a rejected text cannot silently cause a switch to another focus or level',async()=>{
  const entries=clone(bank.entries);entries.find(e=>e.focus==='ie'&&e.level===1).text+=' Falsch.';
  const partial=await D.prepare({version:D.VERSION,entries});
  assert.equal(D.choose(partial,{focus:'ie',level:1}).reason,'no-reviewed-text');
  assert.equal(D.choose(partial,{focus:'ie',level:2}).entry.focus,'ie');
});
test('word exercises use only the selected focus and reviewed sentence contexts; punctuation gets no unrelated words',()=>{
  const words=D.wordPool(bank,'ie');assert.ok(words.length);
  for(const item of words){assert.equal(item.cat,'ie');assert.ok(bank.entries.find(e=>e.id===item.entryId).text.includes(item.context));assert.match(item.word,/ie/iu);}
  for(const focus of ['komma','grammatik','satzende','satzz','doppelwort','unknown'])assert.deepEqual(D.wordPool(bank,focus),[]);
});
test('every exact dictation passes all annotated targets, with correct Unicode and punctuation accounting',()=>{
  for(const e of bank.entries){const result=D.evaluate(e,e.text);assert.equal(result.errors,0,e.id);assert.equal(result.focusErrors,0,e.id);assert.equal(result.focusOpportunities,e.targets.length);}
  const e=bank.entries.find(e=>e.id==='g5-aeu-1');assert.equal(D.evaluate(e,e.text.normalize('NFD')).errors,0);
  assert.ok(D.evaluate(e,e.text+' 123').errors>0);assert.ok(D.evaluate(e,e.text+' 🙂').errors>0);
});
test('repeated das and dass targets use whole words and keep occurrences separate',()=>{
  const e=bank.entries.find(e=>e.id==='g5-dassdas-1'),spans=D.targetSpans(e);
  assert.equal(spans[1].text,'das');assert.equal(e.text.slice(spans[1].start,spans[1].end),'das');
  assert.notEqual(spans[0].start,spans[1].start);
  assert.equal(D.evaluate(e,e.text.replace('dass das','das das')).focusErrors,1);
  assert.equal(D.evaluate(e,e.text.replace('das Plakat','dass Plakat')).focusErrors,1);
});
test('missing letters, word boundaries, reordered clauses and duplicate words count at the actual target positions',()=>{
  const cases=[['g5-umstellung-1','Tür','Trü'],['g5-auslassung-1','Geschenk','Geschek'],['g5-leer-1','am Bahnsteig','amBahnsteig'],['g5-grammatik-1','weil sich der Treffpunkt ändert','weil der Treffpunkt sich ändert'],['g5-doppelwort-1','Unser Team plant','Unser Team Team plant'],['g5-komma-1','Halle, weil','Halle weil']];
  for(const [id,from,to] of cases){const e=bank.entries.find(e=>e.id===id),r=D.evaluate(e,e.text.replace(from,to));assert.ok(r.errors>0,id);assert.ok(r.focusErrors>0,id);assert.ok(r.focusErrors<=r.focusOpportunities,id);}
});
test('reviewed practice evidence affects priority while legacy, stale, future and other-child logs provide no credit',()=>{
  const e=bank.entries.find(e=>e.id==='g5-ie-1'),base={type:'dict',curriculum:D.VERSION,done:true,date:'2026-11-22',focus:'ie',focusErrors:0,focusOpportunities:e.targets.length,id:e.id,materialHash:e.review.hash};
  const options={since:'2026-10-24',today:'2026-11-22',bank};
  assert.equal(D.priorities({ie:5,komma:4},[base,base],options)[0].focus,'komma');
  for(const changed of [{...base,curriculum:'legacy'},{...base,materialHash:'old'},{...base,date:'2027-01-01'},{...base,date:'2020-01-01'}])assert.equal(D.priorities({ie:5},[changed],options)[0].score,5);
  assert.equal(D.priorities({},[{...base,focusErrors:1}],options)[0].focus,'ie');
});
test('automatic level changes require three clean current-material dictations of this same focus',()=>{
  const e=bank.entries.find(e=>e.id==='g5-ie-1'),log={type:'dict',curriculum:D.VERSION,done:true,date:'2026-11-22',focus:'ie',errors:0,focusErrors:0,focusOpportunities:3,id:e.id,materialHash:e.review.hash},options={bank,today:'2026-11-22'};
  assert.equal(D.levelFor('auto',[log,log], 'ie',options),1);
  assert.equal(D.levelFor('auto',[log,log,log], 'ie',options),2);
  assert.equal(D.levelFor('auto',[log,log,log], 'ss',options),1);
  assert.equal(D.levelFor('auto',[log,log,{...log,focusErrors:1}], 'ie',options),1);
  assert.equal(D.levelFor('auto',[log,log,{...log,errors:2}], 'ie',options),1);
  assert.equal(D.levelFor('auto',[{...log,materialHash:'stale'},log,log], 'ie',options),1);
  assert.equal(D.levelFor('leicht',[log,log,log], 'ie',options),1);
  assert.equal(D.levelFor('mittel',[], 'ie',options),2);
});
