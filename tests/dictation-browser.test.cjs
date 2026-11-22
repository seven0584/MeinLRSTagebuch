const {before,after,test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {createGuiHarness,makeFamily,openChild,savedFamily,dayKey}=require('./support/v2-fixture.cjs');
const D=require('../Dev/app/dictation.js');
const {loadData}=require('../scripts/audit-dictations.cjs');
const raw=loadData(readFileSync(resolve(__dirname,'../Dev/app/uebungen.js'),'utf8'));
let harness,bank;
before(async()=>{harness=await createGuiHarness();bank=await D.prepare(raw);});
after(async()=>{await harness?.close();});
function familyWith(focus){const family=makeFamily({provider:'off'});if(focus)family.data.one.entries=[{date:dayKey(),text:'Synthetischer Testeintrag.',errCats:{[focus]:10},words:3}];return family;}
async function fixture(t,{family=familyWith(),material,width=1280}={}){
  const result=await harness.fixture(t,{family,width}),{page,context}=result;
  if(material)await context.route('**/app/uebungen.js',route=>route.fulfill({contentType:'application/javascript',body:'window.TB_PRACTICE = '+JSON.stringify(material)+';'}));
  await page.addInitScript(()=>{
    window.__spoken=[];
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{name:'Microsoft Test',lang:'de-DE'}],cancel:()=>{},speak:utterance=>{window.__spoken.push(utterance.text);queueMicrotask(()=>utterance.onend?.());}}});
  });
  await page.reload();await page.waitForFunction(()=>window.__test?.ready());await openChild(page);await page.locator('#tabPractice').click();
  await page.locator('#practiceBox #practiceFocus, #practiceBox .empty').waitFor();return result;
}
async function complete(page,text){
  assert.equal(await page.locator('#dtIn').inputValue(),'','opening or playing a dictation never fills the child input');
  await page.locator('#dtIn').fill(text);
  for(let i=0;i<20 && await page.locator('#dtDone').isDisabled();i++)await page.locator('#dtNext').click();
  await page.locator('#dtDone').click();await page.locator('.cmpgrid').waitFor();
}

test('dictation GUI: a new child explicitly chooses a focus and sees only its reviewed text and correct speech',async t=>{
  const {page,external,errors}=await fixture(t);
  assert.match(await page.locator('#practiceBox').innerText(),/noch kein Fehlerschwerpunkt/);
  assert.equal(await page.locator('#tDict').isDisabled(),true);
  await page.locator('#practiceFocus').selectOption('ie');await page.locator('#tDict').click();
  const entry=bank.entries.find(e=>e.id==='g5-ie-1');
  assert.match(await page.locator('.dict-focus').innerText(),/i und ie/);
  assert.doesNotMatch(await page.locator('#practiceBox').innerText(),/Klexikon|Lexikon|Brief an ihre/);
  await page.locator('#dtAll').click();assert.equal((await page.evaluate(()=>window.__spoken)).at(-1),entry.text);
  assert.equal(await page.locator('#dtIn').inputValue(),'');
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
});
test('dictation GUI: a clean result records exact focus opportunities without reusing legacy ids or changing old logs',async t=>{
  const family=familyWith('umstellung'),old={date:dayKey(),type:'dict',id:12,words:30,errors:0,done:true};
  family.data.one.practice={usedDict:[0,12,1299],badDict:[0,12],log:[old]};
  const {page,errors}=await fixture(t,{family});await page.locator('#tDict').click();
  const entry=bank.entries.find(e=>e.id==='g5-umstellung-1');await complete(page,entry.text);
  assert.match(await page.locator('.dict-focus').innerText(),/4 von 4/);
  const p=(await savedFamily(page)).data.one.practice,last=p.log.at(-1);
  assert.deepEqual(p.usedDict,[0,12,1299]);assert.deepEqual(p.badDict,[0,12]);assert.deepEqual(p.log[0],old);
  assert.equal(last.id,entry.id);assert.equal(last.errors,0);assert.equal(last.focusErrors,0);assert.equal(last.materialHash,entry.review.hash);
  assert.equal(last.curriculum,D.VERSION);assert.ok(p.usedReviewedDict.includes(entry.id));
  assert.deepEqual(errors,[]);
});
test('dictation GUI: a repetition stays at the same focus and is honestly labelled',async t=>{
  const family=familyWith('aeu');family.data.one.practice={usedReviewedDict:bank.entries.map(e=>e.id)};
  const {page}=await fixture(t,{family});await page.locator('#tDict').click();
  assert.match(await page.locator('#practiceBox').innerText(),/übst du noch einmal/);
  assert.match(await page.locator('.dict-focus').innerText(),/äu und eu/);
  await page.locator('#dtAll').click();assert.equal((await page.evaluate(()=>window.__spoken)).at(-1),bank.entries.find(e=>e.id==='g5-aeu-1').text);
});
test('dictation GUI: a changed or unknown focus cannot fall back to another focus, level or old lexicon text',async t=>{
  const changed=JSON.parse(JSON.stringify(raw));changed.entries.find(e=>e.id==='g5-ie-1').text+=' Ein geänderter Satz.';
  const {page}=await fixture(t,{family:familyWith('ie'),material:changed});
  assert.match(await page.locator('#practiceBox').innerText(),/keinen geprüften Text/);
  assert.equal(await page.locator('#tWords').isDisabled(),true);
  await page.locator('#tDict').click();assert.match(await page.locator('#practiceBox').innerText(),/keinen geprüften Text/);
  assert.equal(await page.locator('#dtIn').count(),0);
  const unknown=await fixture(t,{family:familyWith('unbekannt')});await unknown.page.locator('#tDict').click();
  assert.match(await unknown.page.locator('#practiceBox').innerText(),/keinen geprüften Text/);
  assert.equal(await unknown.page.locator('#dtIn').count(),0);
});
test('dictation GUI: punctuation focuses use sentence practice and remain entirely local with grammar enabled',async t=>{
  const family=familyWith('komma');family.parent.grammar=true;
  const {page,external,calls}=await fixture(t,{family});
  assert.equal(await page.locator('#tWords').isDisabled(),true);
  assert.match(await page.locator('#practiceBox').innerText(),/Satzzusammenhang/);
  await page.locator('#tDict').click();await complete(page,bank.entries.find(e=>e.id==='g5-komma-1').text.replace('Halle, weil','Halle weil'));
  const log=(await savedFamily(page)).data.one.practice.log.at(-1);assert.equal(log.focusErrors,1);assert.equal(log.focusOpportunities,2);
  assert.deepEqual(external,[]);assert.equal(calls.filter(c=>c.path.endsWith('/api/chat')).length,0);
});
test('dictation GUI: three clean current-focus results promote only that focus and children remain separate',async t=>{
  const family=familyWith('ie'),entry=bank.entries.find(e=>e.id==='g5-ie-1');
  family.data.one.practice={log:Array.from({length:3},()=>({date:dayKey(),type:'dict',done:true,curriculum:D.VERSION,id:entry.id,focus:'ie',errors:0,focusErrors:0,focusOpportunities:3,materialHash:entry.review.hash}))};
  family.data.two.entries=[{date:dayKey(),text:'Zweiter Testeintrag.',errCats:{komma:10}}];
  const {page}=await fixture(t,{family});await page.locator('#tDict').click();await page.locator('#dtAll').click();
  assert.equal((await page.evaluate(()=>window.__spoken)).at(-1),bank.entries.find(e=>e.id==='g5-ie-2').text);
  await page.locator('#kidView [data-home]').click();await openChild(page,'two');await page.locator('#tabPractice').click();await page.locator('#practiceFocus').waitFor();
  assert.match(await page.locator('.dict-focus').innerText(),/Kommas/);assert.equal(await page.locator('#tWords').isDisabled(),true);
  const stored=await savedFamily(page);assert.deepEqual(stored.data.two.practice?.log||[],[]);assert.equal(stored.data.one.practice.log.length,3);
});
test('dictation GUI: old personal words and contexts never enter a reviewed word exercise',async t=>{
  const family=familyWith('ie');family.data.one.words={falsch:{richtig:'Ungeprüfteswort',fine:'ie',count:5}};
  const {page,external}=await fixture(t,{family});await page.locator('#tWords').click();
  assert.match(await page.locator('#practiceBox .prog').innerText(),/von 3/);
  const pool=D.wordPool(bank,'ie',1).map(w=>w.word);const word=(await page.evaluate(()=>window.__spoken)).at(-1);
  assert.ok(pool.includes(word));assert.notEqual(word,'Ungeprüfteswort');
  await page.locator('#wdIn').fill(word);await page.locator('#wdCheck').click();
  assert.deepEqual(external,[]);
});
test('dictation GUI: a reviewed personal word due tomorrow is not drawn early through the general bank',async t=>{
  const family=familyWith('ie');family.data.one.words={brief:{richtig:'Brief',fine:'ie',due:dayKey(1),lv:1}};
  const {page}=await fixture(t,{family});assert.match(await page.locator('#tWords').innerText(),/2 geprüfte/);
  await page.locator('#tWords').click();assert.match(await page.locator('#practiceBox .prog').innerText(),/von 2/);
  assert.notEqual((await page.evaluate(()=>window.__spoken)).at(-1),'Brief');
});
for(const width of [390,1280])test('dictation GUI: reviewed exercise and focus choice fit '+width+' pixels',async t=>{
  const {page,errors}=await fixture(t,{family:familyWith('klein'),width});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.locator('#tDict').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  mkdirSync(resolve(__dirname,'../test-results/dictation-gui'),{recursive:true});
  await page.screenshot({path:resolve(__dirname,`../test-results/dictation-gui/reviewed-${width}.png`),fullPage:true});
  assert.deepEqual(errors,[]);
});
