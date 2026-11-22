const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {loadData,auditEntry,selectionAudit,summarize}=require('../scripts/audit-dictations.cjs');
const {resumeRows,summarizeLanguage}=require('../scripts/check-dictation-language.cjs');

test('dictation audit parses only data and refuses malformed executable corpus content',()=>{
  const raw='/* Source */\nwindow.TB_PRACTICE = '+JSON.stringify({cats:[],s:[],t:[],d:[],w:[]})+';';
  assert.deepEqual(loadData(raw).s,[]);
  assert.throws(()=>loadData('window.TB_PRACTICE = (()=>{throw Error("executed")})();'));
  assert.throws(()=>loadData('window.TB_PRACTICE = {"s":[]};'),/Missing/);
});

test('missing sentence references and broken focus vectors cannot silently enter corpus statistics',()=>{
  const data={cats:['ie'],s:['Die Biene fliegt.'],t:['Garten']};
  assert.equal(auditEntry(data,[0,1,[0],[1]],0).wordCount,3);
  for(const entry of [[0,1,[9],[1]],[0,1,[0],[]],[0,1,[0],[-1]],[0,3,[0],[1]]])assert.throws(()=>auditEntry(data,entry,0),/Invalid dictation/);
});

test('a context flag is only a review prompt: even an ordinary Es-gibt sentence is never automatically rejected or approved',()=>{
  const data={cats:['ie'],s:['Es gibt viele Bienen.'],t:['Garten'],w:[]};
  const entry=auditEntry(data,[0,1,[0],[1]],0);
  assert.ok(entry.flags.includes('bezug-am-anfang-pruefen'));
  assert.equal(Object.hasOwn(entry,'suitable'),false);
  assert.equal(summarize(data,[entry],[]).automaticPedagogicalApproval,false);
});

test('the audit detects that the actual selector cannot target a category without tagged texts',()=>{
  const data={cats:['ie'],s:['Ein Satz.'],t:['Garten'],d:Array.from({length:60},(_,i)=>[0,i<30?1:2,[0],[1]])};
  const app=readFileSync(require.resolve('../Dev/app/app.js'),'utf8');
  const results=selectionAudit(data,app);
  for(const result of results){
    if(result.focus==='ie')assert.equal(result.selectedWithTaggedFocus,200);
    else assert.equal(result.selectedWithoutTaggedFocus,200);
  }
});

test('resuming language checks rejects duplicate ids, unknown cases and altered input instead of mixing evidence',()=>{
  const items=[{id:'D0000',input:'Die Biene fliegt.'}],row={...items[0],raw:{matches:[]}};
  assert.equal(resumeRows(JSON.stringify(row)+'\n',items).length,1);
  assert.throws(()=>resumeRows(JSON.stringify(row)+'\n'+JSON.stringify(row)+'\n',items),/duplicate/);
  assert.throws(()=>resumeRows(JSON.stringify({...row,input:'Ein anderes Wort.'}),items),/mismatch/);
  assert.throws(()=>resumeRows(JSON.stringify({...row,id:'foreign'}),items),/mismatch/);
});

test('language reports count hints without approving texts and keep unassessed or incomplete checks visible',()=>{
  const items=[{id:'D0000',input:'Ein Satz.'},{id:'D0001',input:'Noch ein Satz.'}];
  const rows=[{...items[0],raw:{matches:[{rule:{id:'R',category:{id:'GRAMMAR'}}}],warnings:{incompleteResults:true}}},{...items[1],error:'timeout'}];
  const summary=summarizeLanguage(rows,items,[{id:'D0000',level:1},{id:'D0001',level:2}]);
  assert.equal(summary.complete,true);assert.equal(summary.errors,1);assert.equal(summary.incompleteResults,1);
  assert.equal(summary.textsWithHints,1);assert.equal(summary.totalHints,1);
  assert.equal(summary.automaticPedagogicalApproval,false);
  assert.equal(summarizeLanguage([{...items[0],raw:{matches:[]}}],items).complete,false);
  assert.equal(summarizeLanguage([{...items[0],raw:{matches:[]}}],[items[0]]).automaticPedagogicalApproval,false);
});
