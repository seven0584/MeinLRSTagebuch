const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const { createDevServer } = require('../scripts/dev-server.cjs');
let browser, server, origin;
before(async () => {
  server = createDevServer({storage:false});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge',headless:true});
  await mkdir(resolve(__dirname,'../test-results'),{recursive:true});
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });
test('the development server never serves config, child folders, or repository files', async () => {
  for(const path of ['/config/LIESMICH.txt','/kinder/LIESMICH.txt','/app/../../README.md','/.gitignore']) {
    const response = await fetch(origin + path); assert.equal(response.status,404);
  }
});
async function setupPage(enabled = false, grammar = false, moods = false, initialOrders = []) {
  const page = await browser.newPage({viewport:{width:1280,height:900}}), errors = [], requests = [], chatPayloads = [], reviewRequests=[],reviewPayloads=[];
  const controls={models:['test:local'],gpuVram:1024,chat:null};
  async function chatResponse(payload){
    const input=JSON.parse(payload.messages[1].content);chatPayloads.push(payload);
    if(payload.format?.properties?.decisions){
      reviewRequests.push(input);
      let reply=reviewPayloads.length?reviewPayloads.shift():{decisions:input.candidates.map(candidate=>({id:candidate.id,verdict:'unclear',correction:''})),additional:[]};
      if(typeof reply==='function')reply=reply(input);
      return {message:{content:JSON.stringify(reply)}};
    }
    requests.push(input);
    if(controls.chat){const custom=await controls.chat(payload,input);if(custom)return custom;}
    const suggestion=input.target==='oma'?'Oma':input.target==='geefühl'?'Gefühl':'Hund';
    return {message:{content:JSON.stringify(payload.format?.properties?.moods?{moods:['calm'],unclear:false}:{assessment:'needsChange',explanation:'Sag einmal Hunde. Vor dem e hörst du ein d.',question:'',suggestion:input.mode==='solution'?suggestion:''})}};
  }
  page.on('pageerror', e => errors.push(e.message));
  const hash = pin => createHash('sha256').update('test-salt:' + pin).digest('hex');
  const child = {id:'test',name:'Testkind',entries:[],words:{},names:[],readLog:{},draft:'Ich spiele mit meinem Hunt.',draftQ:{},kidPinHash:hash('1234'),reward:{cfg:{entryWords:1,entrySentences:1,sentenceWords:1},orders:initialOrders}};
  const state = {v:2,salt:'test-salt',children:['test'],active:'test',parent:{pinHash:hash('4321'),grammar,topic:'',storage:{mode:'browser'},moodSharing:{enabled:moods,ai:moods},learningHelp:{provider:enabled?'ollama':'off',model:'test:local'}},data:{test:child}};
  await page.addInitScript(state => localStorage.setItem('schreibheft-v1',JSON.stringify(state)),state);
  await page.route('http://127.0.0.1:11434/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let body;
    if(request.method() === 'OPTIONS') { await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}}); return; }
    if(path === '/api/tags') body = {models:controls.models.map(name=>({name}))};
    else if(path === '/api/show') body = {details:{},model_info:{},capabilities:['completion']};
    else if(path === '/api/ps') body={models:controls.models.map(name=>({name,size_vram:controls.gpuVram}))};
    else body=await chatResponse(request.postDataJSON());
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
  });
  await page.route('**/api/ai/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    let body;
    if(path==='/api/ai/session') body={token:'test-token',supported:true};
    else if(path==='/api/ai/status') body={phase:'idle',busy:false,installed:true};
    else if(path.endsWith('/api/tags')) body={models:[...controls.models.map(name=>({name})),{name:'embed'},{name:'remote:cloud'}]};
    else if(path.endsWith('/api/show')) body={details:{},model_info:{},capabilities:[req.postDataJSON().model==='embed'?'embedding':'completion']};
    else if(path.endsWith('/api/ps')) body={models:controls.models.map(name=>({name,size_vram:controls.gpuVram}))};
    else if(path.endsWith('/api/chat')) body=await chatResponse(req.postDataJSON());
    else throw new Error('Unexpected AI request: '+path);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin); await page.waitForFunction(() => window.__test?.ready(),null,{timeout:30000});
  return {page,errors,requests,chatPayloads,reviewRequests,reviewPayloads,controls};
}
async function openChild(page) {
  await page.locator('[data-kid=test]').click(); await page.locator('#kidPinBox .p1').fill('1234'); await page.locator('#kidPinBox .go').click(); await page.locator('#ta').waitFor();
}
async function openParents(page, step) {
  await page.locator('#tileParent').click();
  await page.locator('#pinBox .p1').fill('4321');
  await page.locator('#pinBox .go').click();
  if(step) {
    await page.locator('.pm[data-go=settings]').click();
    await page.locator('[data-settings-step="'+step+'"]').click();
  }
}
async function mark(page, word) {
  await page.locator('#checkBtn').click(); await page.locator('#result .err').filter({hasText:word}).first().click();
}
test('Windows Dev works without a tutor and permits unresolved marks without false success', async () => {
  const {page,errors,requests} = await setupPage(); await openChild(page); await mark(page,'Hunt');
  assert.equal(await page.locator('[data-help]').count(),0);
  await page.locator('.correction-options summary').click();
  await page.locator('#deferBtn').click(); await page.locator('#doneArea').waitFor();
  assert.match(await page.locator('#doneArea').innerText(),/offen/);
  assert.doesNotMatch(await page.locator('#doneArea').innerText(),/Alles richtig|selbst gefunden/);
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0]);
  assert.equal(await page.locator('#moodDialog').evaluate(dialog=>dialog.open),false);
  assert.equal(entry.deferred,1); assert.equal(requests.length,0); assert.deepEqual(errors,[]); await page.close();
});

test('uncertain hints allow finishing the current text with feelings and ordinary rewards',async()=>{
  const {page,errors}=await setupPage(true,false,true);await openChild(page);
  await mark(page,'Hunt');
  assert.match(await page.locator('#result').innerText(),/nicht jede Stelle sicher prüfen/);
  const openHints=await page.locator('#result .err').count();
  assert.equal(await page.locator('#finishToday button').count(),0);
  const current='Ich spiele mit meinem Hunn. Heute ist es schön.';
  await page.locator('#ta').fill(current);
  await page.locator('#finishToday').click();await page.locator('#moodDialog').waitFor();
  assert.equal(await page.locator('#moodSave').isDisabled(),true);
  await page.locator('#moodCancel').click();
  assert.equal(await page.locator('#finishToday').isVisible(),true);
  assert.equal(await page.locator('#ta').inputValue(),current);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries.length),0);
  await page.locator('#finishToday').click();
  await page.locator('#moodPicker [data-mood=happy]').click();
  await page.locator('#moodSave').evaluate(button=>{button.click();button.click();});
  await page.locator('#doneArea').waitFor();
  const entries=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries);
  assert.equal(entries.length,1);const entry=entries[0];
  assert.equal(entry.text,current);assert.equal(entry.deferred,openHints);
  assert.equal(entry.checkCompletion.changedSinceCheck,true);
  assert.deepEqual(entry.mood.self,['happy']);assert.ok(entry.coins>0);
  assert.match(await page.locator('#doneArea').innerText(),/noch nicht geprüft/);
  assert.doesNotMatch(await page.locator('#doneArea').innerText(),/fehlerfrei|Alles richtig|Fehler selbst/);
  assert.deepEqual(errors,[]);await page.close();
});

test('no detected hints do not claim that the entry is error free',async()=>{
  const {page,errors}=await setupPage();await openChild(page);
  await page.locator('#ta').fill('Ich spiele mit meinem Hund.');await page.locator('#checkBtn').click();
  await page.locator('#doneArea').waitFor();
  assert.doesNotMatch(await page.locator('#doneArea').innerText(),/fehlerfrei|Alles richtig|Fehler selbst/i);
  assert.deepEqual(errors,[]);await page.close();
});

test('the selected child name is accepted without teaching it as a spelling mistake',async()=>{
  const {page,errors}=await setupPage();await openChild(page);
  const marks=await page.evaluate(()=>window.__test.check('Hallo, ich bin Testkind.'));
  assert.equal(marks.some(mark=>mark.w==='Testkind'),false);assert.deepEqual(errors,[]);await page.close();
});
test('parents find and test a local model and save the provider independently of grammar', async () => {
  const {page,errors,requests,chatPayloads} = await setupPage();
  await openParents(page,'tutor');
  assert.equal(await page.locator('#tutorExecution').inputValue(),'cpu');
  await page.locator('#tutorModel').selectOption(''); await page.locator('#tutorFind').click();
  await page.waitForFunction(() => document.getElementById('tutorModel').value === 'test:local');
  assert.equal(await page.locator('#tutorModel option[value="embed"]').count(),0);
  assert.equal(await page.locator('#tutorModel option[value="remote:cloud"]').count(),0);
  assert.match(await page.locator('#tutorModel').innerText(),/Qwen 3/);
  await page.locator('#tutorExecution').selectOption('auto');
  await page.waitForFunction(()=>document.querySelector('#tutorSelectCancel').hidden);
  assert.equal(requests.length,2);
  assert.deepEqual(requests.map(request=>request.target),['oma','geefühl']);
  await page.locator('#tutorTest').click(); await page.locator('#tutorExample').waitFor();
  assert.equal(requests.at(-1).sentence,'Ich spiele mit meinem Hunt.');
  assert.equal(Object.hasOwn(chatPayloads.at(-1).options,'num_gpu'),false);
  await page.locator('#tutorProvider').selectOption('ollama'); await page.locator('#tutorSave').click();
  const parent = await page.evaluate(() => JSON.parse(localStorage.getItem('schreibheft-v1')).parent);
  assert.equal(parent.learningHelp.provider,'ollama'); assert.equal(parent.grammar,false);
  assert.equal(parent.learningHelp.execution,'auto');
  await page.locator('#tutorExecution').selectOption('cpu');
  await page.locator('#tutorTest').click();
  await page.waitForFunction(()=>!document.querySelector('#tutorTest').disabled);
  assert.equal(chatPayloads.length,4);
  assert.equal(chatPayloads.at(-1).options.num_gpu,0);
  await page.locator('#tutorSave').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp.execution),'cpu');
  assert.deepEqual(errors,[]); await page.close();
});
test('child help uses current context, remembers failed correction and marks supported completion honestly', async () => {
  const {page,errors,requests} = await setupPage(true); await openChild(page); await mark(page,'Hunt');
  await page.locator('[data-help=hint]').click(); await page.getByText('Sag einmal Hunde.',{exact:false}).waitFor();
  assert.equal(requests[0].target,'Hunt');
  const reply=await page.locator('#result .tutor-reply').boundingBox();
  const lastHelpButton=await page.locator('[data-help=solution]').boundingBox();
  assert.ok(reply.y+reply.height<=900,'the short learning reply stays within the desktop viewport');
  assert.ok(lastHelpButton.y+lastHelpButton.height<=900,'all learning help actions stay within the desktop viewport');
  await page.locator('#ta').fill('Ich spiele mit meinem Hunn.');
  assert.equal(await page.locator('#helpQuestion').count(),0);
  await page.locator('[data-help=simpler]').click();
  await page.getByText('Sag einmal Hunde.',{exact:false}).waitFor();
  await page.waitForFunction(() => document.querySelector('[data-help=simpler]')?.disabled === false);
  assert.equal(requests.at(-1).target,'Hunn');
  assert.equal(requests.at(-1).sentence,'Ich spiele mit meinem Hunn.');
  assert.ok(requests.at(-1).previousAttempts.includes('Ich spiele mit meinem Hunt.'));
  assert.equal(requests.at(-1).question,'');
  assert.equal(await page.locator('#warn').isVisible(),false);
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-lernhilfe.png'),fullPage:true});
  await page.locator('#ta').fill('Ich spiele mit meinem Hund.'); await page.locator('#checkBtn').click(); await page.locator('#doneArea').waitFor();
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0]);
  assert.equal(entry.helped,true); assert.doesNotMatch(await page.locator('#doneArea').innerText(),/selbst gefunden/);
  assert.deepEqual(errors,[]); await page.close();
});

test('changing the marked word hides its old reply, blocks unrelated help and removes stale marks after broader edits',async()=>{
  const {page,errors,chatPayloads}=await setupPage(true);await openChild(page);await mark(page,'Hunt');
  await page.locator('[data-help=hint]').click();await page.locator('#result .tutor-reply').waitFor();
  assert.match(await page.locator('#result .tutor-reply').innerText(),/Sag einmal Hunde/);
  const before=chatPayloads.length;
  await page.locator('#ta').fill('Ich spiele mit meinem weisste.');
  assert.equal(await page.locator('#result .tutor-reply').count(),0);
  assert.match(await page.locator('#result .result-msg').innerText(),/Text wurde verändert/);
  await page.locator('[data-help=hint]').click();
  assert.match(await page.locator('#result .tutor-box [role=status]').innerText(),/anderes Wort|Nochmal prüfen/);
  assert.equal(chatPayloads.length,before,'an unrelated replacement needs a fresh check before help');
  await page.locator('#ta').fill('Heute war ein schöner Tag. Wir waren im Park.');
  assert.equal(await page.locator('#result .mark-list .err').count(),0);
  assert.equal(await page.locator('#result [data-help]').count(),0);
  assert.equal(await page.locator('.editor-backdrop .inline-mark').count(),0);
  assert.doesNotMatch(await page.locator('#result').innerText(),/Sag einmal Hunde|\bHunt\b/);
  assert.match(await page.locator('#result').innerText(),/Nochmal prüfen/);
  assert.equal(chatPayloads.length,before);
  assert.deepEqual(errors,[]);await page.close();
});

test('parents select a suggested model, download without an installer and see progress and readiness',async()=>{
  const {page,errors}=await setupPage();let active=false,polls=0;
  await page.route('**/api/ai/**',async route=>{
    const path=new URL(route.request().url()).pathname;let body;
    if(path==='/api/ai/setup'){
      assert.deepEqual(route.request().postDataJSON(),{model:'qwen3:4b-instruct-2507-q4_K_M'});active=true;
      await route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'});return;
    }
    if(active && path==='/api/ai/status') body=++polls<3?{phase:'model',busy:true,model:'qwen3:4b-instruct-2507-q4_K_M',completed:25,total:100}:{phase:'ready',busy:false,model:'qwen3:4b-instruct-2507-q4_K_M',message:'Modell bereit. Bitte testen.'};
    else if(active && path.endsWith('/api/tags')) body={models:[{name:'qwen3:4b-instruct-2507-q4_K_M'}]};
    else {await route.fallback();return;}
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await openParents(page,'tutor');await page.locator('#tutorModel').selectOption('qwen3:4b-instruct-2507-q4_K_M');
  assert.match(await page.locator('#tutorModelInfo').innerText(),/Apache-2.0/);
  await page.locator('#tutorSetup').click();await page.locator('#tutorProgress').waitFor();
  assert.equal(await page.locator('#tutorModel').isDisabled(),true);
  await page.waitForFunction(()=>document.querySelector('#tutorModel option[value="qwen3:4b-instruct-2507-q4_K_M"]').textContent.includes('heruntergeladen'));
  assert.equal(await page.locator('#tutorProgress').isHidden(),true);assert.equal(await page.locator('#tutorModel').inputValue(),'qwen3:4b-instruct-2507-q4_K_M');
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-ki-einrichtung.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
});

test('parent settings guide forwards and back while overview and direct child creation remain available',{timeout:30000},async()=>{
  const {page,errors}=await setupPage();
  await openParents(page);
  const overview=page.locator('.psec[data-sec=overview]');
  await overview.waitFor();
  const originalOverview=await overview.innerHTML();
  const settings=page.locator('.pm[data-go=settings]'),subnav=page.locator('#settings-subnav');
  assert.equal(await settings.getAttribute('aria-controls'),'settings-subnav');
  assert.equal(await settings.getAttribute('aria-expanded'),'false');
  assert.equal(await subnav.isHidden(),true);
  assert.equal(await page.locator('.pmenu > .pm[data-go=settings] + #settings-subnav.settings-stepnav').count(),1);
  assert.equal(await page.locator('.psec[data-sec=settings] .settings-stepnav').count(),0);
  await page.locator('.pm[data-go=settings]').click();
  assert.equal(await settings.getAttribute('aria-expanded'),'true');
  assert.equal(await subnav.isVisible(),true);
  assert.equal(await page.locator('.settings-step-panel:not([hidden])').getAttribute('id'),'settings-step-storage');
  await page.locator('.settings-wizard-actions .btn').click();
  assert.equal(await page.locator('.settings-step-panel:not([hidden])').getAttribute('id'),'settings-step-children');
  await page.locator('.settings-wizard-actions .btn-ghost').click();
  assert.equal(await page.locator('.settings-step-panel:not([hidden])').getAttribute('id'),'settings-step-storage');
  await settings.click();
  assert.equal(await settings.getAttribute('aria-expanded'),'false');
  assert.equal(await subnav.isHidden(),true);
  assert.equal(await page.locator('.psec[data-sec=settings]').isVisible(),true);
  assert.equal(await page.locator('.settings-step-panel:not([hidden])').getAttribute('id'),'settings-step-storage');
  await settings.click();await page.locator('[data-settings-step=tutor]').click();
  assert.equal(await settings.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('[data-settings-step=tutor]').getAttribute('aria-current'),'step');
  assert.equal(await page.locator('.settings-step-panel:not([hidden])').getAttribute('id'),'settings-step-tutor');
  await page.locator('.pm[data-go=overview]').click();
  assert.equal(await overview.innerHTML(),originalOverview);
  await page.locator('#addKidTop').click();
  assert.equal(await settings.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('.settings-step-panel:not([hidden])').getAttribute('id'),'settings-step-children');
  assert.equal(await page.locator('#newKidName').evaluate(el=>el===document.activeElement),true);
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-eltern-wizard.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
});

test('the collapsible settings child navigation stays reachable at a narrow viewport without horizontal overflow',async()=>{
  const {page,errors}=await setupPage();await page.setViewportSize({width:390,height:844});
  await openParents(page);const settings=page.locator('.pm[data-go=settings]');
  await settings.click();
  for(const step of ['storage','children','goals','tutor','security','maintenance']){
    const button=page.locator('#settings-subnav [data-settings-step="'+step+'"]');
    await button.click();
    assert.equal(await button.getAttribute('aria-current'),'step');
    assert.equal(await page.locator('.settings-step-panel:not([hidden])').getAttribute('id'),'settings-step-'+step);
    const bounds=await button.boundingBox();
    if(bounds.x<0 || bounds.x+bounds.width>391)await page.screenshot({path:resolve(__dirname,'../test-results/mobile-eltern-navigation-overflow.png'),fullPage:true});
    assert.ok(bounds.x>=0 && bounds.x+bounds.width<=391,step+' stays within the narrow viewport: '+JSON.stringify(bounds));
  }
  assert.equal(await settings.getAttribute('aria-expanded'),'true');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.screenshot({path:resolve(__dirname,'../test-results/mobile-eltern-navigation.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
});

test('rewards child navigation preserves edits, saves coin rules explicitly and retains the parent order badge',async()=>{
  const order={id:'pending-test',name:'Testbelohnung',icon:'🎁',qty:1,total:10,status:'open',at:Date.now()};
  const {page,errors}=await setupPage(false,false,false,[order]);await openParents(page);
  const parent=page.locator('.pm[data-go=rewards]');
  assert.equal(await parent.getAttribute('aria-controls'),'rewards-subnav');
  assert.equal(await parent.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('.pmenu > .pm[data-go=rewards] + #rewards-subnav').count(),1);
  assert.equal(await parent.locator('#orderBadge').innerText(),'1');
  assert.equal(await parent.locator('#orderBadge').isVisible(),true);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.reward);
  await parent.click();
  assert.equal(await parent.getAttribute('aria-expanded'),'true');
  for(const section of ['orders','coins','shop','games','pauses','jokers']){
    await page.locator('[data-rewards-section="'+section+'"]').click();
    assert.equal(await page.locator('[data-rewards-section="'+section+'"]').getAttribute('aria-current'),'page');
    assert.equal(await page.locator('.rewards-panel:not([hidden])').getAttribute('id'),'rewards-panel-'+section);
  }
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.reward),before);
  await page.locator('[data-rewards-section=coins]').click();await page.locator('#cfgWord').fill('7');
  await page.locator('[data-rewards-section=shop]').click();await page.locator('[data-rewards-section=coins]').click();
  assert.equal(await page.locator('#cfgWord').inputValue(),'7');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.reward),before);
  await page.locator('#saveCfg').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.reward);
  assert.equal(saved.cfg.perWord,7);assert.deepEqual(saved.orders,[order]);
  assert.equal(await parent.locator('#orderBadge').innerText(),'1');
  await parent.click();assert.equal(await parent.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#rewards-panel-coins').isVisible(),true);
  await parent.click();
  await page.mouse.move(0,0);
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-belohnungen-navigation.png'),fullPage:true});
  await page.locator('.pm[data-go=overview]').click();
  await page.locator('[data-goto=rewards][data-subsection=coins]').click();
  assert.equal(await page.locator('#rewards-panel-coins').isVisible(),true);
  await page.locator('.pm[data-go=overview]').click();
  await page.locator('[data-goto=rewards][data-subsection=orders]').click();
  assert.equal(await page.locator('#rewards-panel-orders').isVisible(),true);
  assert.deepEqual(errors,[]);await page.close();
});

test('the child PIN reset uses an explained app dialog and cancellation leaves the PIN unchanged',async()=>{
  const {page,errors}=await setupPage();let nativeDialogs=0;
  page.on('dialog',async dialog=>{nativeDialogs++;await dialog.dismiss();});
  await openParents(page,'security');
  const initialHash=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.kidPinHash);
  await page.locator('#resetKidPin').click();
  await page.locator('#dangerDlg .choicebox').waitFor();
  await page.locator('#dangerDlg .choicebox h3 [data-context-help]').click();
  await page.locator('#contextHelpPopover').waitFor();
  assert.match(await page.locator('#contextHelpPopover .context-help-title').innerText(),/Kinder-PIN zurücksetzen/);
  assert.match(await page.locator('#contextHelpPopover .context-help-text').innerText(),/Testkinds PIN wirklich zurücksetzen/);
  assert.match(await page.locator('#contextHelpPopover .context-help-text').innerText(),/neue PIN/);
  await page.locator('#contextHelpPopover [data-help-close]').click();
  await page.locator('#chA').click();await page.waitForFunction(()=>document.querySelector('#dangerDlg').hidden);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.kidPinHash),initialHash);
  await page.locator('#resetKidPin').click();await page.locator('#chB').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.kidPinReset===true);
  const child=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test);
  assert.equal(child.kidPinHash,'');assert.equal(child.kidPinReset,true);
  assert.equal(nativeDialogs,0);assert.deepEqual(errors,[]);await page.close();
});

test('the tutor wizard exposes local field help in its real layout',async()=>{
  const {page,errors}=await setupPage();await openParents(page,'tutor');
  await page.locator('[data-context-help][data-help-for="tutorModel"]').click();
  await page.locator('#contextHelpPopover').waitFor();
  assert.match(await page.locator('#contextHelpPopover .context-help-text').innerText(),/Modell|Sprachmodell/);
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-kontexthilfe.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
});

test('correction stays editable in the original writing block with nearby check and a desktop sidebar',{timeout:30000},async()=>{
  const {page,errors}=await setupPage(true);await openChild(page);await mark(page,'Hunt');
  assert.equal(await page.locator('#result .sheet.checked').count(),0);
  assert.equal(await page.locator('.editor-backdrop .inline-mark').filter({hasText:'Hunt'}).isVisible(),true);
  assert.equal(await page.locator('#ta').evaluate(el=>el.readOnly),false);
  assert.equal(await page.locator('.sheet-head #checkBtn').count(),1);
  const text=await page.locator('#ta').boundingBox(),check=await page.locator('#checkBtn').boundingBox();
  const sidebar=await page.locator('#writeSidebar').boundingBox();
  assert.ok(check.y+check.height<=text.y,'check action stays above the text');
  assert.ok(sidebar.x>=text.x+text.width,'desktop hints and questions stay to the right');
  await page.setViewportSize({width:375,height:812});
  await page.screenshot({path:resolve(__dirname,'../test-results/mobile-schreibblock.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
});

test('an outdated tutor response is cancelled when the child edits the text',{timeout:30000},async()=>{
  const {page,errors}=await setupPage(true);await openChild(page);await mark(page,'Hunt');
  let release,started,finished;
  const waiting=new Promise(resolve=>{release=resolve;});
  const requested=new Promise(resolve=>{started=resolve;});
  const settled=new Promise(resolve=>{finished=resolve;});
  await page.route('**/api/ai/ollama/api/chat',async route=>{
    started();await waiting;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({message:{content:JSON.stringify({assessment:'needsChange',explanation:'VERALTETE ANTWORT',question:'',suggestion:''})}})}).catch(()=>{});
    finished();
  });
  await page.locator('[data-help=hint]').click();await requested;
  await page.locator('#ta').fill('Ich spiele mit meinem Hunn.');
  release();
  await settled;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForFunction(()=>!document.querySelector('#helpCancel'));
  assert.equal(await page.getByText('VERALTETE ANTWORT',{exact:true}).count(),0);
  assert.equal(await page.locator('[data-help=simpler]').isDisabled(),false);
  assert.deepEqual(errors,[]);await page.close();
});

for(const answer of ['müde','🙂']) {
  test('a voluntary '+answer+' reflection saves without spelling or AI judgment',{timeout:30000},async()=>{
    const {page,errors,requests}=await setupPage(true,true);let grammarRequests=0;
    await page.route('https://api.languagetool.org/**',async route=>{grammarRequests++;await route.fulfill({status:200,contentType:'application/json',body:'{"matches":[]}'});});
    await openChild(page);await page.locator('#ta').fill('');
    await page.locator('textarea[data-q=feeling]').fill(answer);
    assert.equal(await page.locator('#checkBtn').innerText(),'Antworten speichern');
    assert.equal(await page.locator('#checkBtn').isDisabled(),false);
    await page.locator('#checkBtn').click();await page.locator('#doneArea').waitFor();
    const entry=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0]);
    assert.equal(entry.text,'');assert.equal(entry.answers.feeling,answer);
    assert.equal(entry.answerLabels.feeling,'Wie fühlst du dich gerade?');
    assert.doesNotMatch(await page.locator('#doneArea').innerText(),/fehlerfrei|alles richtig|Fehler selbst/i);
    assert.equal(requests.length,0);assert.equal(grammarRequests,0);assert.deepEqual(errors,[]);await page.close();
  });
}

test('private reflection answers stay out of a tutor request for the free text',{timeout:30000},async()=>{
  const {page,errors,requests,reviewRequests}=await setupPage(true);await openChild(page);
  await page.locator('textarea[data-q=feeling]').fill('GEHEIMES GEFÜHL');
  await page.getByText('Gab es auch etwas Schwieriges?',{exact:true}).click();
  await page.locator('textarea[data-q=difficult]').fill('PRIVATER MOMENT');
  await mark(page,'Hunt');await page.locator('[data-help=hint]').click();
  await page.getByText('Sag einmal Hunde.',{exact:false}).waitFor();
  assert.equal(requests.at(-1).sentence,'Ich spiele mit meinem Hunt.');
  assert.equal(reviewRequests.length,1);
  assert.deepEqual(Object.keys(reviewRequests[0]).sort(),['candidates','text']);
  assert.equal(reviewRequests[0].text,'Ich spiele mit meinem Hunt.');
  assert.doesNotMatch(JSON.stringify([...requests,...reviewRequests]),/GEHEIMES|PRIVATER/);
  assert.deepEqual(errors,[]);await page.close();
});

test('unavailable graphics fail the strict test and restore compatible mode without saving',async()=>{
  const {page,errors,controls,requests}=await setupPage();controls.gpuVram=0;
  await openParents(page,'tutor');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp);
  await page.locator('#tutorExecution').selectOption('auto');
  await page.waitForFunction(()=>document.querySelector('#tutorSelectCancel').hidden);
  assert.equal(await page.locator('#tutorExecution').inputValue(),'cpu');
  assert.match(await page.locator('#tutorStatus').innerText(),/nicht zuverlässig|nicht verfügbar/);
  assert.match(await page.locator('#tutorSelectionResults').innerText(),/keine Nutzung des Grafikspeichers/);
  assert.equal(requests.length,1);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp),before);
  assert.deepEqual(errors,[]);await page.close();
});

test('parents can cancel a graphics test before another probe starts',async()=>{
  const {page,errors,controls,requests}=await setupPage();
  let release,started;
  const waiting=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{started=resolve;});
  controls.chat=async()=>{started();await waiting;return null;};
  await openParents(page,'tutor');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp);
  await page.locator('#tutorExecution').selectOption('auto');await requested;
  await page.locator('#tutorSelectCancel').click();
  await page.waitForFunction(()=>document.querySelector('#tutorSelectCancel').hidden);
  assert.match(await page.locator('#tutorStatus').innerText(),/abgebrochen/);
  assert.equal(await page.locator('#tutorExecution').inputValue(),'cpu');
  assert.equal(requests.length,1);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp),before);
  release();assert.deepEqual(errors,[]);await page.close();
});

test('automatic selection compares installed models on both hardware modes and saves only on demand',async()=>{
  const {page,errors,controls,requests}=await setupPage();controls.models=['test:local','fast:local'];
  controls.chat=async payload=>{
    await new Promise(resolve=>setTimeout(resolve,payload.model==='fast:local' && payload.options.num_gpu!==0?5:80));
    return null;
  };
  await openParents(page,'tutor');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp);
  await page.locator('#tutorSelect').click();
  await page.waitForFunction(()=>document.querySelector('#tutorSelectCancel').hidden);
  assert.equal(await page.locator('#tutorModel').inputValue(),'fast:local');
  assert.equal(await page.locator('#tutorExecution').inputValue(),'auto');
  assert.equal(await page.locator('#tutorSelectionResults tbody tr').count(),4);
  assert.equal(requests.length,8);
  assert.deepEqual(requests.map(input=>input.target),Array(4).fill(['oma','geefühl']).flat());
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp),before);
  await page.locator('#tutorProvider').selectOption('ollama');await page.locator('#tutorSave').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.learningHelp),{provider:'ollama',model:'fast:local',execution:'auto'});
  assert.equal(requests.length,8);
  assert.deepEqual(errors,[]);await page.close();
});

test('context review produces grounded Geefühl help without inventing letter rules or sending private answers',async()=>{
  const {page,errors,reviewPayloads,reviewRequests,chatPayloads}=await setupPage(true);
  reviewPayloads.push(input=>({decisions:input.candidates.map(candidate=>({id:candidate.id,verdict:candidate.word==='Geefühl'?'error':'unclear',correction:candidate.word==='Geefühl'?'Gefühl':''})),additional:[]}));
  await openChild(page);await page.locator('#ta').fill('Ich habe ein Geefühl.');
  await page.locator('textarea[data-q=feeling]').fill('PRIVATE ANTWORT');
  await mark(page,'Geefühl');
  assert.equal(reviewRequests.length,1);
  assert.equal(chatPayloads.length,1);
  assert.match(await page.locator('#result').innerText(),/ein e zu viel/);
  await page.locator('[data-help=hint]').click();
  await page.locator('#result .tutor-reply').waitFor();
  assert.match(await page.locator('#result .tutor-reply').innerText(),/ein e zu viel/);
  assert.equal(chatPayloads.length,1,'a verified simple difference is explained without another model generation');
  assert.doesNotMatch(JSON.stringify(reviewRequests),/PRIVATE ANTWORT/);
  assert.deepEqual(errors,[]);await page.close();
});

test('two and three word changes are explained locally while writing stays free of duplicate practice and entry sections',async()=>{
  const {page,errors,reviewPayloads,chatPayloads}=await setupPage(true);await openChild(page);
  for(const id of ['patHead','entriesHead','entries'])assert.equal(await page.locator('#'+id).count(),0,id+' is absent below writing');
  for(const [word,count] of [['Geefüll',2],['geefüll',3]]){
    reviewPayloads.push(input=>({decisions:input.candidates.map(candidate=>({id:candidate.id,verdict:candidate.word===word?'error':'unclear',correction:candidate.word===word?'Gefühl':''})),additional:[]}));
    await page.locator('#ta').fill('Ich habe ein '+word+'.');await mark(page,word);
    assert.match(await page.locator('.word-change-count').innerText(),new RegExp(count+' Stellen'));
    const before=chatPayloads.length;
    await page.locator('[data-help=hint]').click();await page.locator('#result .tutor-reply').waitFor();
    const help=await page.locator('#result .tutor-reply').innerText();
    assert.match(help,count===2?/zwei Stellen/:/drei Stellen/);
    assert.match(help,/Entferne das e/);assert.match(help,/h statt l/);
    if(count===3)assert.match(help,/großem G/);
    assert.equal(chatPayloads.length,before,'verified word changes do not require another model answer');
  }
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-mehrere-wortfehler.png'),fullPage:true});
  await page.locator('#tabRead').click();await page.locator('#readView').waitFor();
  assert.equal(await page.locator('#tabPractice').isVisible(),true);
  assert.deepEqual(errors,[]);await page.close();
});

test('a local lowercase noun rule explains hasen without generating an unrelated model answer',async()=>{
  const {page,errors,chatPayloads,requests}=await setupPage(true);await openChild(page);
  await page.locator('#ta').fill('Ich sehe hasen.');await mark(page,'hasen');
  const before=chatPayloads.length;
  await page.locator('[data-help=hint]').click();await page.locator('#result .tutor-reply').waitFor();
  assert.match(await page.locator('#result .tutor-reply').innerText(),/großem H/);
  assert.equal(chatPayloads.length,before);assert.equal(requests.length,0);
  assert.deepEqual(errors,[]);await page.close();
});

test('a reviewed two-word correction explains the missing space locally and offers the checked phrase',async()=>{
  const {page,errors,reviewPayloads,chatPayloads}=await setupPage(true);
  reviewPayloads.push(input=>({decisions:input.candidates.map(candidate=>({id:candidate.id,verdict:candidate.word==='weisste'?'error':'unclear',correction:candidate.word==='weisste'?'weißt du':''})),additional:[]}));
  await openChild(page);await page.locator('#ta').fill('Ich weisste das.');await mark(page,'weisste');
  const before=chatPayloads.length;
  await page.locator('[data-help=hint]').click();await page.locator('#result .tutor-reply').waitFor();
  assert.match(await page.locator('#result .tutor-reply').innerText(),/zwei Wörter/);
  assert.match(await page.locator('#result .tutor-reply').innerText(),/Leerzeichen/);
  await page.locator('[data-help=solution]').click();
  assert.match(await page.locator('#result .tutor-reply').innerText(),/Möglicher Vorschlag: weißt du/);
  assert.equal(chatPayloads.length,before);
  assert.deepEqual(errors,[]);await page.close();
});

test('a copied explanation about an unrelated word is rejected for weisste',async()=>{
  const {page,errors,controls,requests}=await setupPage(true);
  controls.chat=async()=>({message:{content:JSON.stringify({assessment:'needsChange',explanation:'Du meinst dein Rad. Verlängere Rad zu Räder: Dann hörst du das d.',question:'',suggestion:''})}});
  await openChild(page);await page.locator('#ta').fill('Ich weisste das.');await mark(page,'weisste');
  await page.locator('[data-help=hint]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-help=hint]').disabled);
  assert.equal(requests.length,1);assert.equal(requests[0].target,'weisste');
  assert.equal(await page.locator('#result .tutor-reply').count(),0);
  assert.doesNotMatch(await page.locator('#result').innerText(),/Du meinst dein Rad|Verlängere Rad zu Räder/);
  assert.match(await page.locator('#result .tutor-box [role=status]').innerText(),/passt nicht|keine passende Antwort|nicht verständlich/);
  assert.deepEqual(errors,[]);await page.close();
});

test('a model name verdict cannot silently hide Geefühl without explicit name context',async()=>{
  const {page,errors,reviewPayloads}=await setupPage(true);
  reviewPayloads.push(input=>({decisions:input.candidates.map(candidate=>({id:candidate.id,verdict:'name',correction:''})),additional:[]}));
  await openChild(page);await page.locator('#ta').fill('Ich habe ein Geefühl.');await mark(page,'Geefühl');
  assert.equal(await page.locator('#result .err').filter({hasText:'Geefühl'}).count(),1);
  assert.match(await page.locator('#result').innerText(),/Ist das hier ein Name/);
  assert.deepEqual(errors,[]);await page.close();
});

test('an explicit unknown friend name is accepted while a lowercase noun remains marked',async()=>{
  const {page,errors,reviewPayloads,reviewRequests}=await setupPage(true);
  reviewPayloads.push(input=>({decisions:input.candidates.map(candidate=>({id:candidate.id,verdict:'name',correction:''})),additional:[]}));
  await openChild(page);const text='Meine Freundin Majaluna besucht meine oma.';
  const original=await page.evaluate(text=>window.__test.check(text),text);
  assert.ok(original.some(mark=>mark.w==='Majaluna'));
  assert.ok(original.some(mark=>mark.w==='oma'));
  await page.locator('#ta').fill(text);await mark(page,'oma');
  assert.ok(reviewRequests[0].candidates.some(candidate=>candidate.word==='Majaluna'));
  assert.equal(await page.locator('#result .err').filter({hasText:'Majaluna'}).count(),0);
  assert.equal(await page.locator('#result .err').filter({hasText:'oma'}).count(),1);
  assert.deepEqual(errors,[]);await page.close();
});

for(const behavior of ['failed','skipped']){
  test('a '+behavior+' context review preserves dictionary marks and unlocks writing',async()=>{
    const {page,errors}=await setupPage(true);await openChild(page);
    let release,started;
    const waiting=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{started=resolve;});
    await page.route('**/api/ai/ollama/api/chat',async route=>{
      if(!route.request().postDataJSON().format?.properties?.decisions){await route.fallback();return;}
      started();
      if(behavior==='skipped')await waiting;
      await route.fulfill({status:500,contentType:'application/json',body:'{"error":"model unavailable"}'}).catch(()=>{});
    });
    await page.locator('#checkBtn').click();await requested;
    if(behavior==='skipped')await page.locator('#reviewCancel').click();
    await page.locator('#result .err').filter({hasText:'Hunt'}).waitFor();
    assert.equal(await page.locator('#ta').evaluate(el=>el.readOnly),false);
    assert.equal(await page.locator('#reviewCancel').isHidden(),true);
    if(behavior==='failed'){
      assert.match(await page.locator('#result').innerText(),/konnte nicht abgeschlossen/);
      assert.match(await page.locator('#result').innerText(),/model unavailable/);
    }
    release();await page.locator('#finishToday').click();await page.locator('#doneArea').waitFor();
    const entry=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0]);
    assert.equal(entry.checkCompletion.reviewState,behavior);assert.ok(entry.deferred>0);
    assert.doesNotMatch(await page.locator('#doneArea').innerText(),/fehlerfrei|Alles richtig/i);
    assert.deepEqual(errors,[]);await page.close();
  });
}

test('feelings are required only for saving, allow up to three and keep the selected love emoji',async()=>{
  const {page,errors,requests}=await setupPage(false,false,true);await openChild(page);
  assert.equal(await page.locator('#writeSidebar #moodPicker').count(),0);
  assert.equal(await page.locator('#moodDialog').evaluate(dialog=>dialog.open),false);
  await mark(page,'Hunt');
  assert.equal(await page.locator('#moodDialog').evaluate(dialog=>dialog.open),false,'the feeling question waits until correction is finished');
  await page.locator('#ta').fill('Ich spiele mit meinem Hund.');await page.locator('#checkBtn').click();
  await page.locator('#moodDialog').waitFor();
  assert.match(await page.locator('#moodFinishTitle').innerText(),/Klasse gemacht, Testkind/);
  await page.locator('[data-context-help][data-help-for="moodDialog"]').waitFor();
  assert.ok((await page.locator('#moodDialog .mood-encouragement').innerText()).trim());
  assert.equal(await page.locator('#doneArea').isHidden(),true);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries.length),0);
  assert.equal(await page.locator('#moodSave').isDisabled(),true);
  assert.equal(await page.locator('#moodPicker [data-mood]').count(),13);
  assert.match(await page.locator('#moodPicker [data-mood=loved]').innerText(),/😍/);
  for(const id of ['happy','loved','tired'])await page.locator('#moodPicker [data-mood='+id+']').click();
  assert.equal(await page.locator('#moodPicker [data-mood=angry]').isDisabled(),true);
  await page.locator('#moodPicker [data-mood=happy]').click();await page.locator('#moodPicker [data-mood=unsure]').click();
  assert.equal(await page.locator('#moodSave').isDisabled(),false);
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-gefuehlauswahl.png'),fullPage:true});
  await page.locator('#moodSave').click();await page.locator('#doneArea').waitFor();
  const entry=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0]);
  assert.deepEqual(entry.mood.self,['loved','tired','unsure']);assert.equal(entry.mood.ai.status,'off');assert.equal(requests.length,0);
  await page.locator('#kidView [data-home]').click();await openParents(page);
  assert.equal(await page.locator('#moodSummary').isVisible(),true);
  assert.equal(await page.locator('#moodOverview').isVisible(),false);
  assert.equal(await page.locator('#moodSummary [data-period=day]').count(),1);
  assert.equal(await page.locator('#moodSummary [data-period=all]').count(),1);
  assert.equal(await page.locator('#moodSummary select, #moodSummary table').count(),0);
  assert.match(await page.locator('#moodSummary').innerText(),/Gesamtdurchschnitt|100 %/);
  await page.locator('#moodSummary button').click();
  assert.equal(await page.locator('.psec[data-sec=moods]').isVisible(),true);
  assert.equal(await page.locator('.pm[data-go=moods]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#moodOverview option[value=week]').evaluate(o=>o.disabled),true,await page.locator('#moodOverview').innerText());
  assert.equal(await page.locator('#moodOverview option[value=month]').evaluate(o=>o.disabled),true);
  assert.equal(await page.locator('#moodOverview option[value=all]').evaluate(o=>o.disabled),false);
  assert.match(await page.locator('#moodOverview').innerText(),/KW/);assert.doesNotMatch(await page.locator('#moodOverview').innerText(),/Ich spiele mit meinem Hund/);
  assert.deepEqual(errors,[]);await page.close();
});

test('AI mood hints are separate from the required selection and never receive private reflection answers',async()=>{
  const {page,errors,requests}=await setupPage(true,false,true);await openChild(page);
  await page.locator('#ta').fill('Ich spiele mit meinem Hund.');
  await page.locator('textarea[data-q=feeling]').fill('PRIVATE RÜCKBLICKANTWORT');
  await page.locator('#checkBtn').click();await page.locator('#moodDialog').waitFor();
  await page.locator('#moodPicker [data-mood=angry]').click();await page.locator('#moodSave').click();await page.locator('#doneArea').waitFor();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0].mood.ai.status==='ready');
  const entry=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0]);
  assert.deepEqual(entry.mood.self,['angry']);assert.deepEqual(entry.mood.ai.moods,['calm']);
  assert.deepEqual(requests,[{text:'Ich spiele mit meinem Hund.'}]);assert.doesNotMatch(JSON.stringify(requests),/PRIVATE|angry/);
  await page.locator('#kidView [data-home]').click();await openParents(page);
  assert.match(await page.locator('#moodSummary [data-source=self]').first().innerText(),/Wütend|wütend/);
  assert.match(await page.locator('#moodSummary [data-source=ai]').first().innerText(),/Ruhig|ruhig/);
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-uebersicht-kompakt.png'),fullPage:true});
  await page.locator('.pm[data-go=moods]').click();
  assert.match(await page.locator('.mood-source-self').innerText(),/Wütend|wütend/);
  assert.match(await page.locator('.mood-source-ai').innerText(),/Ruhig|ruhig/);
  assert.doesNotMatch(await page.locator('#moodOverview').innerText(),/PRIVATE|Ich spiele mit meinem Hund/);
  await page.screenshot({path:resolve(__dirname,'../test-results/windows-gefuehlsuebersicht.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
});

test('failed AI mood analysis does not prevent saving or overwrite the self report',async()=>{
  const {page,errors}=await setupPage(true,false,true);await openChild(page);
  await page.route('**/api/ai/ollama/api/chat',async route=>route.fulfill({status:500,contentType:'application/json',body:'{"error":"model unavailable"}'}));
  await page.locator('#ta').fill('Ich spiele mit meinem Hund.');await page.locator('#checkBtn').click();await page.locator('#moodDialog').waitFor();
  await page.locator('#moodPicker [data-mood=unsure]').click();await page.locator('#moodSave').click();
  await page.locator('#doneArea').waitFor();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0].mood.ai.status==='error');
  const entry=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries[0]);
  assert.deepEqual(entry.mood.self,['unsure']);assert.deepEqual(entry.mood.ai.moods,[]);assert.equal(entry.text,'Ich spiele mit meinem Hund.');
  assert.deepEqual(errors,[]);await page.close();
});

for(const cancel of ['button','Escape']){
  test('cancelling the finish-time feeling dialog with '+cancel+' preserves the draft without saving',async()=>{
    const {page,errors}=await setupPage(false,false,true);await openChild(page);
    const text='Ich spiele mit meinem Hund.';
    await page.locator('#ta').fill(text);await page.locator('#checkBtn').click();await page.locator('#moodDialog').waitFor();
    await page.locator('#moodPicker [data-mood=happy]').click();
    if(cancel==='button')await page.locator('#moodCancel').click();else await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#moodDialog').open);
    assert.equal(await page.locator('#ta').inputValue(),text);
    assert.equal(await page.locator('#ta').evaluate(field=>field.readOnly),false);
    await page.waitForFunction(text=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.draft===text,text);
    const child=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test);
    assert.equal(child.draft,text);assert.equal(child.entries.length,0);
    await page.locator('#checkBtn').click();await page.locator('#moodDialog').waitFor();
    await page.locator('#moodPicker [data-mood=unsure]').click();await page.locator('#moodSave').click();await page.locator('#doneArea').waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries.length),1);
    assert.deepEqual(errors,[]);await page.close();
  });
}

test('finish actions open reading and games without creating duplicate entries',async()=>{
  const {page,errors}=await setupPage(false,false,true);await openChild(page);
  await page.locator('#ta').fill('Ich spiele mit meinem Hund.');await page.locator('#checkBtn').click();await page.locator('#moodDialog').waitFor();
  await page.locator('#moodPicker [data-mood=calm]').click();
  await page.locator('#moodSave').evaluate(button=>{button.click();button.click();});
  await page.locator('#doneArea').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries.length),1);
  assert.match(await page.locator('#readFinished').innerText(),/Deinen Text nochmal lesen/);
  await page.locator('#readFinished').click();await page.locator('#readView').waitFor();
  assert.match(await page.locator('#readView').innerText(),/Ich spiele mit meinem Hund/);
  await page.locator('#tabWrite').click();await page.locator('#playFinished').click();await page.locator('#gameView').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.test.entries.length),1);
  assert.equal(await page.locator('#moodDialog').evaluate(dialog=>dialog.open),false);
  assert.deepEqual(errors,[]);await page.close();
});
