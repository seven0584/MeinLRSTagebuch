const {test}=require('node:test');
const assert=require('node:assert/strict');
const corpus=require('./fixtures/correction-corpus.de.json');
const {validateCorpus,locate,helpTasks,modelInput,scoreDetection,scoreHelp,summarize}=require('../scripts/correction-quality.cjs');

test('Fach harness: all reference targets exist and evaluation data is not in model inputs',()=>{
  validateCorpus(corpus);
  for(const entry of corpus.cases)for(const task of helpTasks(entry)){
    assert.deepEqual(Object.keys(modelInput(entry,task)),['sentence','target','mode','checkerHint','question','previousAttempts','previousReplies']);
  }
  assert.throws(()=>validateCorpus({...corpus,cases:[corpus.cases[0],corpus.cases[0]]}),/duplicate/);
  assert.throws(()=>locate('ein Wort','Wort',2),/Missing reference/);
});
test('Fach scoring: both occurrences must be found, broad sentence marks and duplicates are not free successes',()=>{
  const entry=corpus.cases.find(c=>c.id==='wiederholtes-wort');
  const first=locate(entry.text,'Sone'),second=locate(entry.text,'Sone',1);
  assert.equal(scoreDetection(entry,{marks:[first]}).fn,1);
  assert.deepEqual([scoreDetection(entry,{marks:[first,second]}).tp,scoreDetection(entry,{marks:[first,second]}).fp],[2,0]);
  assert.equal(scoreDetection(entry,{marks:[{start:0,end:entry.text.length}]}).tp,0);
  assert.equal(scoreDetection(entry,{marks:[first,first]}).fp,1);
});
test('Fach scoring: unknown-name questions are neutral, correct-word alarms are false positives',()=>{
  const name=corpus.cases.find(c=>c.id==='name-person'),correct=corpus.cases.find(c=>c.id==='richtig-hund');
  assert.equal(scoreDetection(name,{marks:[locate(name.text,'Jorina')]}).neutral,1);
  const result=scoreDetection(correct,{marks:[locate(correct.text,'Hund')]});
  assert.equal(result.controlFalseAlarm,true);assert.equal(result.fp,1);
});
test('Fach scoring: a correct spelling hidden in prose is not a passing correction and prose quality remains open',()=>{
  const entry=corpus.cases.find(c=>c.id==='gross-oma'),task=helpTasks(entry)[0];
  const answer={assessment:'unclear',explanation:'Schreibe Oma groß.',question:'Brauchst du Hilfe?',suggestion:''};
  assert.equal(scoreHelp(task,{reply:answer}).mechanicalPass,false);
  const correct=scoreHelp(task,{reply:{...answer,assessment:'needsChange',suggestion:'Oma'}});
  assert.equal(correct.mechanicalPass,true);assert.equal(correct.manualReviewRequired,true);
});
test('Fach report: infrastructure errors are counted separately and empty samples do not become 100 percent',()=>{
  const entry=corpus.cases[0],task=helpTasks(entry)[0];
  const summary=summarize([{detection:{score:scoreDetection(entry,{error:'timeout'})},help:[{score:scoreHelp(task,{error:'timeout'})}]}]);
  assert.equal(summary.detectionErrors,1);assert.equal(summary.explanationErrors,1);
  assert.equal(summary.unassessedReferenceErrors,1);
  assert.equal(summary.precision,null);assert.equal(summary.recall,null);
  assert.equal(summary.explanationMechanicalRate,0);assert.equal(summary.manualReviewRequired,true);
});

test('Fach command: execution is opt-in and remote endpoints/cloud models are refused',()=>{
  const {options}=require('../scripts/run-correction-quality.cjs');
  assert.equal(options([]).execute,false);assert.equal(options(['--list']).execute,false);
  assert.equal(options(['--execute']).execute,true);
  const transfer=options(['--corrections-only','--corpus','tests/fixtures/correction-transfer.de.json']);
  assert.equal(transfer.execute,false);assert.equal(transfer.correctionsOnly,true);
  assert.equal(transfer.corpus,'tests/fixtures/correction-transfer.de.json');
  assert.throws(()=>options(['--list','--execute']),/cannot be combined/);
  assert.throws(()=>options(['--app-url','https://example.com']),/local HTTP/);
  assert.throws(()=>options(['--models','gpt-oss:20b-cloud']),/local model/);
  assert.throws(()=>options(['--repeat','0']),/repeat/);
});
