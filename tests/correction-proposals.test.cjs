const {test}=require('node:test');
const assert=require('node:assert/strict');
const {scoreProposals,summarizeProposals}=require('../scripts/correction-proposals.cjs');
const {locate,validateCorpus,helpTasks,modelInput}=require('../scripts/correction-quality.cjs');
const transfer=require('./fixtures/correction-transfer.de.json');

test('proposal scoring requires the exact correction at each occurrence, including capitalization',()=>{
  const entry={text:'Die Kinder Laufen. Sie Laufen.',issues:[{target:'Laufen',replacements:['laufen']},{target:'Laufen',occurrence:1,replacements:['laufen']}]};
  const first=locate(entry.text,'Laufen'),second=locate(entry.text,'Laufen',1);
  assert.deepEqual(scoreProposals(entry,[{...first,proposal:'laufen'},{...second,proposal:'Laufen'}]),{expected:2,correct:1,incorrect:1,missing:0,unexpected:0,pass:false});
  const missing=scoreProposals(entry,[{...first,proposal:'laufen'}]);
  assert.equal(missing.missing,1);assert.equal(missing.pass,false);
});

test('an unavailable proposal is a missing correction and changing a permitted name is unexpected',()=>{
  const entry=transfer.cases[0],span=locate(entry.text,entry.issues[0].target);
  assert.equal(scoreProposals(entry,[{...span,proposal:'',message:'not checked'}]).missing,1);
  const name=transfer.cases.find(c=>c.id==='transfer-name-roboter'),mark=locate(name.text,'Silberfunke');
  assert.equal(scoreProposals(name,[{...mark,proposal:''}]).unexpected,0);
  assert.equal(scoreProposals(name,[{...mark,proposal:'Silberfuchs'}]).unexpected,1);
  assert.equal(summarizeProposals([]).correctRate,null);
});

test('all transfer references are valid and model inputs never contain evaluation-only fields',()=>{
  validateCorpus(transfer);
  for(const entry of transfer.cases)for(const task of helpTasks(entry)){
    const input=modelInput(entry,task);
    assert.deepEqual(Object.keys(input).sort(),['checkerHint','mode','previousAttempts','previousReplies','question','sentence','target']);
    assert.equal(Object.hasOwn(input,'expect'),false);assert.equal(Object.hasOwn(input,'rubric'),false);
  }
});
