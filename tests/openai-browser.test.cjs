const {before,after,test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const {createDevServer}=require('../scripts/dev-server.cjs');
let browser,server,origin;
before(async()=>{server=createDevServer({storage:false,openai:false,ai:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));});
const sample='Libes Tagebuch. heute hab ich was toles gemmacht.Mein Pappa hat mir geholven ein baumhauss zu bauen. unsere Kaze ist die ganze zeit durch den Garten gerant. Henry war auch da der hat auch geholven aber auch generft.';
const issue=(original,correction,occurrence=0,category='spelling')=>({original,correction,occurrence,category,hint:'Schau dir die markierte Stelle genau an.',detail:'Hier kannst du die passende Schreibweise üben.'});
async function setup({enabled=true,review={issues:[issue('Libes','Liebes'),issue('geholven','geholfen'),issue('geholven','geholfen',1),issue('gemmacht.Mein','gemacht. Mein',0,'punctuation')],uncertain:false},status=200}={}){
  const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage(),errors=[],calls=[],external=[];
  const hash=pin=>createHash('sha256').update('test-salt:'+pin).digest('hex');
  const state={v:2,salt:'test-salt',children:['test'],active:'test',parent:{pinHash:hash('4321'),grammar:true,storage:{mode:'browser'},moodSharing:{enabled:true,ai:true},learningHelp:{provider:enabled?'openai':'off',model:'gpt-5.4'}},data:{test:{id:'test',name:'Testkind',entries:[],words:{},names:[],readLog:{},draft:sample,draftQ:{},kidPinHash:hash('1234'),reward:{cfg:{entryWords:1,entrySentences:1,sentenceWords:1},orders:[]}}}};
  const config={model:'gpt-5.4',enabled,allowChildData:enabled,zdrConfirmed:enabled,keyConfigured:enabled,persistent:false,ready:enabled};
  await context.addInitScript(state=>localStorage.setItem('schreibheft-v1',JSON.stringify(state)),state);
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/openai/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname,body=req.postData()?req.postDataJSON():undefined;
    calls.push({path,body,method:req.method(),headers:req.headers()});let response=config,code=200;
    if(path.endsWith('/session'))response={token:'mock-cloud-token'};
    else if(path.endsWith('/config')){
      if(req.method()==='DELETE')Object.assign(config,{enabled:false,keyConfigured:false,ready:false});
      else if(body){for(const name of ['model','enabled','allowChildData','zdrConfirmed'])if(Object.hasOwn(body,name))config[name]=body[name];if(body.apiKey)config.keyConfigured=true;config.ready=config.enabled&&config.allowChildData&&config.zdrConfirmed&&config.keyConfigured;}
    }else if(path.endsWith('/test'))response={ok:true,message:'Erfundenes Beispiel erfolgreich geprüft.'};
    else if(path.endsWith('/review')){response=review;code=status;}
    else if(path.endsWith('/explain'))response={assessment:'needsChange',explanation:body.mode==='simpler'?'Schau diesmal auf den Anfang des Wortes.':'Sprich die Stelle ruhig und langsam.',question:'',suggestion:''};
    else throw Error('Unexpected cloud endpoint '+path);
    await route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(response)});
  });
  await context.route('**/api/ai/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.includes('/api/chat'))external.push(path);
    const response=path.endsWith('/session')?{token:'mock-local',supported:true}:path.endsWith('/api/tags')?{models:[]}:path.endsWith('/api/show')?{details:{},model_info:{},capabilities:['completion']}:{phase:'idle',busy:false,installed:false};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
  });
  await context.route('https://api.languagetool.org/**',async route=>{external.push(route.request().url());await route.fulfill({json:{matches:[]}});});
  await context.route('http://127.0.0.1:11434/**',async route=>{external.push(route.request().url());await route.fulfill({json:{models:[]}});});
  await page.goto(origin);await page.waitForFunction(()=>window.__test?.ready());return {page,context,errors,calls,external,config};
}
async function child(page){await page.locator('[data-kid=test]').click();await page.locator('#kidPinBox .p1').fill('1234');await page.locator('#kidPinBox .go').click();await page.locator('#ta').waitFor();}
async function parents(page){await page.locator('#tileParent').click();await page.locator('#pinBox .p1').fill('4321');await page.locator('#pinBox .go').click();await page.locator('.pm[data-go=settings]').click();await page.locator('[data-settings-step=tutor]').click();await page.waitForFunction(()=>document.querySelector('#openaiKeyStatus').textContent.length>0);}
const family=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')));
test('parents save a secret only to the local server, test a synthetic example, then explicitly enable child text',async()=>{
  const {page,context,calls,errors}=await setup({enabled:false});await parents(page);
  await page.locator('#tutorProvider').selectOption('openai');
  assert.equal(await page.locator('#openaiApiKey').getAttribute('type'),'password');
  await page.locator('#openaiApiKey').fill('sk-test-placeholder-never-live');await page.locator('#openaiSaveKey').click();
  await page.getByText('Schlüssel und Modell gespeichert. Als Nächstes das OpenAI-Beispiel testen.').waitFor();
  assert.equal(await page.locator('#openaiApiKey').inputValue(),'');
  assert.equal(JSON.stringify(await family(page)).includes('sk-test-placeholder-never-live'),false);
  assert.equal((await family(page)).parent.learningHelp.provider,'off');
  await page.locator('#openaiTest').click();await page.getByText('Erfundenes Beispiel erfolgreich geprüft.').waitFor();
  assert.deepEqual(calls.find(call=>call.path.endsWith('/test')).body,{});
  assert.equal(calls.some(call=>call.path.endsWith('/review')),false);
  await page.locator('#tutorSave').click();await page.waitForFunction(()=>document.querySelector('#tutorStatus').textContent.includes('beide Freigaben'));
  assert.equal((await family(page)).parent.learningHelp.provider,'off');
  await page.locator('#openaiAllowChildData').check();await page.locator('#openaiZdrConfirmed').check();await page.locator('#tutorSave').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp.provider==='openai');
  assert.deepEqual(errors,[]);await context.close();
});
test('full-text cloud review replaces local marks, preserves names, and sends only the main text',async()=>{
  const {page,context,calls,external,errors}=await setup();await child(page);await page.locator('#checkBtn').click();await page.locator('#result .err').first().waitFor();
  assert.deepEqual(await page.locator('#result .err').allTextContents(),['Libes','gemmacht.Mein','geholven','geholven']);
  assert.equal(await page.locator('#result .err').filter({hasText:'Henry'}).count(),0);
  assert.deepEqual(calls.find(call=>call.path.endsWith('/review')).body,{text:sample});
  await page.locator('#result .err').first().click();assert.match(await page.locator('#result .hint').innerText(),/Prüfhinweis · OpenAI/);
  assert.equal(await page.locator('#ta').inputValue(),sample);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await context.close();
});

test('cloud hints about the original spelling are preserved instead of replaced by a generic local tip',async()=>{
  const hint='Du schreibst zeit klein. Prüfe, ob du hier ein Namenwort brauchst.';
  const {page,context,errors}=await setup({review:{issues:[{...issue('zeit','Zeit',0,'capitalization'),hint}],uncertain:false}});
  await child(page);await page.locator('#checkBtn').click();await page.locator('#result .err').click();
  assert.match(await page.locator('#result .hint').innerText(),/Du schreibst zeit klein/);
  assert.doesNotMatch(await page.locator('#result .hint').innerText(),/Hör genau auf jeden Laut/);
  assert.deepEqual(errors,[]);await context.close();
});
test('cloud hints react to the current in-place edit and retain previous attempts and replies',async()=>{
  const {page,context,calls,errors}=await setup();await child(page);await page.locator('#checkBtn').click();await page.locator('#result .err').first().click();
  await page.locator('[data-help=hint]').click();await page.locator('#result .tutor-reply').waitFor();
  const edited=sample.replace('Libes','Libeses');await page.locator('#ta').fill(edited);await page.locator('[data-help=simpler]').click();
  await page.getByText('Schau diesmal auf den Anfang des Wortes.',{exact:true}).waitFor();
  const explanations=calls.filter(call=>call.path.endsWith('/explain')).map(call=>call.body);
  assert.equal(explanations.length,2);assert.equal(explanations[1].target,'Libeses');assert.match(explanations[1].sentence,/Libeses Tagebuch/);
  assert.ok(explanations[1].previousAttempts.some(text=>text.includes('Libes Tagebuch')));
  assert.ok(explanations[1].previousReplies.includes('Sprich die Stelle ruhig und langsam.'));
  assert.equal(await page.locator('#ta').inputValue(),edited);assert.deepEqual(errors,[]);await context.close();
});
for(const failure of ['uncertain','rate_limit'])test(failure+' permits finishing with required feelings and normal rewards without remote mood inference',async()=>{
  const {page,context,calls,external,errors}=await setup(failure==='uncertain'?{review:{issues:[],uncertain:true}}:{status:429,review:{code:'rate_limit',message:'Bitte später erneut versuchen.'}});
  await child(page);await page.locator('#checkBtn').click();await page.locator('#finishToday').waitFor();
  if(failure==='uncertain')assert.match(await page.locator('#result').innerText(),/nicht sicher beurteilen/);
  else assert.match(await page.locator('#result').innerText(),/OpenAI konnte die Prüfung nicht abschließen/);
  await page.locator('#finishToday').click();await page.locator('#moodDialog').waitFor();assert.equal(await page.locator('#moodSave').isDisabled(),true);
  await page.locator('#moodPicker [data-mood=happy]').click();await page.locator('#moodSave').click();await page.locator('#doneArea').waitFor();
  const entry=(await family(page)).data.test.entries[0];assert.equal(entry.text,sample);assert.deepEqual(entry.mood.self,['happy']);assert.ok(entry.coins>0);
  assert.doesNotMatch(await page.locator('#doneArea').innerText(),/fehlerfrei|Alles richtig|Fehler selbst/i);
  assert.equal(calls.filter(call=>call.path.endsWith('/review')).length,1);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await context.close();
});
test('oversize review fails visibly without sending a truncated text or any cloud review request',async()=>{
  const {page,context,calls,errors}=await setup();await child(page);await page.locator('#ta').fill('Hallo. '.repeat(1720));await page.locator('#checkBtn').click();
  await page.locator('#finishToday').waitFor();assert.match(await page.locator('#result').innerText(),/12.000 Zeichen/);
  assert.equal(calls.some(call=>call.path.endsWith('/review')),false);assert.deepEqual(errors,[]);await context.close();
});
test('removing the API key switches off the persisted family provider',async()=>{
  const {page,context,calls,errors}=await setup();await parents(page);await page.locator('#openaiRemoveKey').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp.provider==='off');
  assert.equal(await page.locator('#tutorProvider').inputValue(),'off');assert.ok(calls.some(call=>call.method==='DELETE'));
  assert.equal(await page.locator('#openaiApiKey').inputValue(),'');assert.deepEqual(errors,[]);await context.close();
});

test('withdrawing permission disables child requests without deleting the saved key',async()=>{
  const {page,context,calls,errors,config}=await setup();await parents(page);
  await page.locator('#openaiAllowChildData').uncheck();await page.locator('#tutorSave').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp.provider==='off');
  assert.equal(config.enabled,false);assert.equal(config.allowChildData,false);assert.equal(config.keyConfigured,true);
  assert.equal(calls.some(call=>call.path.endsWith('/review')),false);assert.deepEqual(errors,[]);await context.close();
});

test('replacing a key resets the previous child-data permissions',async()=>{
  const {page,context,config,errors}=await setup();await parents(page);
  await page.locator('#openaiApiKey').fill('sk-replacement-placeholder');await page.locator('#openaiSaveKey').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp.provider==='off');
  assert.equal(config.enabled,false);assert.equal(config.allowChildData,false);assert.equal(config.zdrConfirmed,false);
  assert.equal(config.keyConfigured,true);assert.equal(await page.locator('#openaiApiKey').inputValue(),'');
  assert.deepEqual(errors,[]);await context.close();
});
