const {before,after,test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdir}=require('node:fs/promises');
const {resolve}=require('node:path');
const {createGuiHarness,makeFamily,openChild,savedFamily,dayKey}=require('./support/v2-fixture.cjs');
let harness;
before(async()=>{harness=await createGuiHarness();});
after(async()=>{if(harness)await harness.close();});

test('GUI: reaching the goal and a clean recheck do not save or open the feelings dialog',async t=>{
  const family=makeFamily({moods:true});
  const {page,errors,external}=await harness.fixture(t,{family});await openChild(page);
  await page.locator('#ta').fill('Ich spiele mit meinem Hund.');await page.locator('#checkBtn').click();
  await page.locator('#finishToday').waitFor();
  assert.equal(await page.locator('#moodDialog').evaluate(d=>d.open),false);
  assert.equal((await savedFamily(page)).data.one.entries.length,0);
  await page.locator('#ta').fill('Ich spiele mit meinem Hund. Danach lese ich ein Buch.');
  await page.locator('#checkBtn').click();
  await page.waitForFunction(()=>!document.querySelector('#checkBtn').disabled);
  await page.locator('#finishToday').focus();await page.keyboard.press('Enter');
  await page.locator('#moodDialog').waitFor();await page.locator('#moodCancel').click();
  assert.match(await page.locator('#ta').inputValue(),/Danach lese/);
  assert.equal((await savedFamily(page)).data.one.entries.length,0);
  await page.locator('#finishToday').click();await page.locator('#moodPicker [data-mood=happy]').click();
  await page.locator('#moodSave').evaluate(b=>{b.click();b.click();});await page.locator('#doneArea').waitFor();
  assert.equal((await savedFamily(page)).data.one.entries.length,1);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
});

test('GUI: dismissing the final hint still requires a separate save decision',async t=>{
  const {page,errors}=await harness.fixture(t);await openChild(page);
  await page.locator('#ta').fill('Ich spiele mit meinem Hunt.');await page.locator('#checkBtn').click();
  await page.locator('#result .err').first().waitFor();
  assert.equal(await page.locator('#result .err').count(),1);
  await page.locator('#result .err').first().click();await page.locator('.correction-options summary').click();
  await page.locator('#deferBtn').click();
  assert.equal((await savedFamily(page)).data.one.entries.length,0);
  assert.equal(await page.locator('#doneArea').isHidden(),true);
  await page.locator('#finishToday').click();await page.locator('#doneArea').waitFor();
  assert.ok((await savedFamily(page)).data.one.entries[0].deferred>0);
  assert.deepEqual(errors,[]);
});

test('GUI: saving is visibly disabled while a second check is waiting for the model',async t=>{
  let release,count=0;const pending=new Promise(resolve=>{release=resolve;});t.after(()=>release());
  const {page}=await harness.fixture(t,{family:makeFamily({moods:true}),review:async input=>{
    if(++count===2)await pending;return {decisions:input.candidates.map(c=>({id:c.id,verdict:'unclear',correction:''})),additional:[]};
  }});
  await openChild(page);await page.locator('#ta').fill('Ich spiele mit meinem Hund.');await page.locator('#checkBtn').click();await page.locator('#finishToday').waitFor();
  await page.locator('#ta').fill('Ich spiele mit meinem Hund. Danach lese ich ein Buch.');await page.locator('#checkBtn').click();
  await page.waitForFunction(()=>document.querySelector('#checkBtn').disabled);
  assert.equal(await page.locator('#finishToday').isDisabled(),true);
  await page.locator('#finishToday').evaluate(b=>b.click());
  assert.equal(await page.locator('#moodDialog').evaluate(d=>d.open),false);
  assert.equal((await savedFamily(page)).data.one.entries.length,0);
  release();await page.waitForFunction(()=>!document.querySelector('#checkBtn').disabled);
  assert.equal(await page.locator('#finishToday').isDisabled(),false);
});

test('GUI: a shorter supplement is checked alone, adds coins once, and survives reopening',async t=>{
  const family=makeFamily({goal:12});
  const old={id:'saved',date:dayKey(),text:'Heute spiele ich mit meinem Hund im Garten und lese ein Buch.',answers:{},words:12,sentences:1,coins:32};
  family.data.one.entries=[old];
  const {page,calls,errors}=await harness.fixture(t,{family});await openChild(page);
  assert.equal(await page.locator('#todayHistory textarea, #todayHistory input, #todayHistory [contenteditable=true]').count(),0);
  await page.locator('#ta').fill('Du schreibstt.');assert.equal(await page.locator('#checkBtn').isDisabled(),false);
  await page.locator('#checkBtn').click();await page.locator('#result .err').first().waitFor();
  const input=JSON.parse(calls.filter(c=>c.path.endsWith('/api/chat')).at(-1).body.messages[1].content);
  assert.equal(input.text,'Du schreibstt.');assert.doesNotMatch(JSON.stringify(input),/lese ein Buch/);
  await page.locator('#ta').fill('Du schreibst.');await page.locator('#checkBtn').click();await page.locator('#finishToday').click();
  await page.locator('#doneArea').waitFor();const entries=(await savedFamily(page)).data.one.entries;
  assert.equal(entries.length,2);assert.deepEqual(entries[1],old);assert.equal(entries[0].coins,12);
  await page.locator('#againBtn').click();assert.equal(await page.locator('#checkBtn').isDisabled(),true);
  await page.reload();await page.waitForFunction(()=>window.__test?.ready());await openChild(page);
  assert.match(await page.locator('#todayHistory').innerText(),/Du schreibst/);
  assert.match(await page.locator('#todayHistory').innerText(),/lese ein Buch/);
  assert.deepEqual((await savedFamily(page)).data.one.entries,entries);
  assert.deepEqual(errors,[]);
});

for(const width of [390,1280])test(`GUI: history respects day/child boundaries and stays readable at ${width}px`,async t=>{
  const family=makeFamily({goal:8});
  family.data.one.entries=[{id:'today',date:dayKey(),text:'Ich lese ein Buch.',answers:{},coins:16},{id:'yesterday',date:dayKey(-1),text:'GEHEIM VON GESTERN',answers:{},coins:0}];
  family.data.two.entries=[{id:'foreign',date:dayKey(),text:'PRIVAT ANDERES KIND',answers:{},coins:0}];
  const {page,errors}=await harness.fixture(t,{family,width});await openChild(page);
  const history=await page.locator('#todayHistory').innerText();
  assert.match(history,/Ich lese ein Buch/);assert.doesNotMatch(history,/GEHEIM|PRIVAT/);
  await page.locator('#ta').fill('Du schreibst.');assert.equal(await page.locator('#checkBtn').isDisabled(),true);
  assert.match(await page.locator('#sentenceCount').innerText(),/6 von 8/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await mkdir(resolve(__dirname,'../test-results/gui-v2'),{recursive:true});
  await page.screenshot({path:resolve(__dirname,`../test-results/gui-v2/history-${width}.png`),fullPage:true});
  await page.locator('#kidView [data-home]').click();await openChild(page,'two');
  assert.match(await page.locator('#todayHistory').innerText(),/PRIVAT ANDERES KIND/);
  assert.doesNotMatch(await page.locator('#todayHistory').innerText(),/Ich lese ein Buch/);
  assert.deepEqual(errors,[]);
});

test('GUI: explanation is expandable without a second model request',async t=>{
  const {page,calls,errors}=await harness.fixture(t,{review:input=>({decisions:input.candidates.map(c=>({id:c.id,verdict:'error',correction:'Hund'})),additional:[]})});
  await openChild(page);await page.locator('#ta').fill('Ich spiele mit meinem Hnud.');await page.locator('#checkBtn').click();
  await page.locator('#result .err').filter({hasText:'Hnud'}).click();
  const before=calls.filter(c=>c.path.endsWith('/api/chat')).length;
  await page.locator('.spelling-explanation summary').focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('.spelling-explanation p').innerText(),/richtige Reihenfolge/);
  assert.equal(calls.filter(c=>c.path.endsWith('/api/chat')).length,before);
  assert.deepEqual(errors,[]);
});

test('GUI: a spacing hint identifies punctuation instead of changing the correctly written next word',async t=>{
  const {page,errors}=await harness.fixture(t);await openChild(page);
  await page.locator('#ta').fill('Ich spiele.Du liest.');await page.locator('#checkBtn').click();
  await page.locator('#result .err').filter({hasText:'Du'}).first().click();
  assert.match(await page.locator('.hint .cat').innerText(),/Leerzeichen/);
  assert.match(await page.locator('.hint').innerText(),/Satzzeichen|Leerzeichen/);
  await page.locator('.spelling-explanation summary').click();
  assert.ok((await page.locator('.spelling-explanation p').innerText()).trim());
  assert.equal(await page.locator('#ta').inputValue(),'Ich spiele.Du liest.');
  assert.equal((await savedFamily(page)).data.one.entries.length,0);
  assert.deepEqual(errors,[]);
});

test('GUI: local AI offers only the checked correction without generating an explanation or editing text',async t=>{
  const {page,calls,errors}=await harness.fixture(t,{
    review:input=>({decisions:input.candidates.map(c=>({id:c.id,verdict:'error',correction:'Hund'})),additional:[]}),
    explain:()=>assert.fail('Free local AI explanations must remain disabled below the quality threshold')
  });
  await openChild(page);const original='Ich spiele mit meinem Hnud.';
  await page.locator('#ta').fill(original);await page.locator('#checkBtn').click();
  await page.locator('#result .err').filter({hasText:'Hnud'}).click();
  assert.equal(await page.locator('[data-help=hint], [data-help=simpler]').count(),0);
  await page.locator('[data-help=solution]').click();
  assert.match(await page.locator('.tutor-box .tutor-reply').innerText(),/Möglicher Vorschlag: Hund/);
  assert.doesNotMatch(await page.locator('.tutor-box .tutor-reply').innerText(),/weil|verlängere|hörst|Position|Reihenfolge/i);
  assert.equal(calls.filter(c=>c.path.endsWith('/api/chat')).length,1);
  assert.equal(await page.locator('#ta').inputValue(),original);
  assert.equal((await savedFamily(page)).data.one.entries.length,0);
  assert.deepEqual(errors,[]);
});

test('GUI: parents see the local correction-only restriction and the explanation quality threshold',async t=>{
  const {page,errors}=await harness.fixture(t);
  await page.locator('#tileParent').click();await page.locator('#pinBox .p1').fill('4321');await page.locator('#pinBox .go').click();
  await page.locator('.pm[data-go=settings]').click();await page.locator('[data-settings-step=tutor]').click();
  const notice=page.locator('#localAiQualityNotice');await notice.waitFor();
  const text=await notice.innerText();
  assert.match(text,/Korrekturvorschläge/);assert.match(text,/90\s*%/);
  assert.match(text,/Erklärungen.*ausgeschaltet/s);
  assert.match(text,/was.*falsch.*warum/s);
  assert.deepEqual(errors,[]);
});
