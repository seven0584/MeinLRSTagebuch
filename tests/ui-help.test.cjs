const {before,after,test}=require('node:test');
const assert=require('node:assert/strict');
const {resolve}=require('node:path');
const {chromium}=require('playwright');
const {createDevServer}=require('../scripts/dev-server.cjs');
let browser,server,origin;
before(async()=>{
  server=createDevServer({storage:false});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge',headless:true});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve));});
async function fixture(){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/help-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="de"><head><title>Hilfe-Test</title><style>label{display:block;margin:15px}dialog{max-width:75vw;max-height:80vh}button{margin:3px}</style></head><body>
    <section data-help-topic="tutor"><h1>Lokale Lernhilfe</h1>
    <label class="field">Sprachmodell auswählen<select id="tutorModel"><option>Lokales Testmodell</option></select></label>
    <button id="tutorTest">Beispiel testen</button><button id="tutorSetup" disabled>Lokale KI herunterladen</button></section>
    <label data-help-topic="grammar"><input type="checkbox" id="grammarOn"> Grammatikprüfung verwenden</label>
    <label data-help-topic="writing">Dein Tagebuch<textarea id="ta"></textarea></label>
    <button id="checkBtn">Prüfen</button>
    <label>Eltern-PIN<input id="parentPin" type="password"></label>
    <div id="dynamicArea"></div>
    </body></html>`}));
  await page.goto(origin+'/help-fixture');
  await page.evaluate(()=>{window.TB_HELP_CONTENT={markdown:'# Bedienung\n\n## Prüfung und lokale Lernhilfe\nWähle ein lokales Sprachmodell und prüfe eine Beispielantwort.\n\n## Grammatikprüfung\nHier wird die zusätzliche Grammatikprüfung erklärt.\n\n## Schreiben und Lesen\nHier steht, wie du deinen Text prüfst.\n',topics:{tutor:'Prüfung und lokale Lernhilfe',grammar:'Grammatikprüfung',writing:'Schreiben und Lesen',general:'Bedienung'}};});
  await page.addScriptTag({path:resolve(__dirname,'../Dev/app/ui-help.js')});
  await page.waitForFunction(()=>window.TB_UI_HELP);
  return {page,errors};
}

test('every action has a tooltip and every visible field has exactly one nearby context-help button',async()=>{
  const {page,errors}=await fixture();
  for(const id of ['tutorTest','tutorSetup','checkBtn'])assert.ok((await page.locator('#'+id).getAttribute('title'))?.trim(),id+' needs an action tooltip');
  for(const id of ['tutorModel','grammarOn','ta','parentPin']){
    const help=page.locator('[data-context-help][data-help-for="'+id+'"]');
    await help.waitFor();assert.equal(await help.count(),1);
    assert.ok((await help.getAttribute('aria-label'))?.trim());
    assert.equal(await page.locator('#'+id).evaluate((control,id)=>{
      const help=document.querySelector('[data-context-help][data-help-for="'+id+'"]');
      return control.closest('label')?.contains(help) || control.parentElement.contains(help);
    },id),true,id+' help stays beside its field');
  }
  await page.evaluate(()=>{window.TB_UI_HELP.refresh();window.TB_UI_HELP.refresh();});
  assert.equal(await page.locator('[data-context-help][data-help-for="tutorModel"]').count(),1);
  assert.deepEqual(errors,[]);await page.close();
});

test('context help links to the matching local documentation chapter and Escape restores focus',async()=>{
  const {page,errors}=await fixture();const url=page.url();
  const trigger=page.locator('[data-context-help][data-help-for="tutorModel"]');
  await trigger.click();
  await page.locator('#contextHelpPopover').waitFor();
  assert.ok((await page.locator('#contextHelpPopover .context-help-text').innerText()).trim());
  assert.match(await page.locator('#contextHelpPopover .context-help-title').innerText(),/Modell|Sprachmodell|Lernhilfe/i);
  await page.locator('#contextHelpPopover a[data-help-document]').click();
  await page.locator('#documentationDialog').waitFor();
  assert.equal(page.url(),url);
  assert.equal(page.context().pages().length,1);
  assert.equal(await page.locator('#documentationTitle').innerText(),'Prüfung und lokale Lernhilfe');
  assert.match(await page.locator('#documentationContent').innerText(),/Wähle ein lokales Sprachmodell/);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#documentationDialog').open);
  assert.equal(await trigger.evaluate(button=>button===document.activeElement),true);
  assert.equal(await page.locator('#contextHelpPopover').evaluate(dialog=>dialog.open),false);
  assert.deepEqual(errors,[]);await page.close();
});

test('checkbox help neither toggles its setting nor loses focus after closing',async()=>{
  const {page,errors}=await fixture();
  const checkbox=page.locator('#grammarOn'),help=page.locator('[data-context-help][data-help-for="grammarOn"]');
  await help.click();assert.equal(await checkbox.isChecked(),false);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#contextHelpPopover').open);
  assert.equal(await help.evaluate(button=>button===document.activeElement),true);
  await checkbox.check();await help.click();assert.equal(await checkbox.isChecked(),true);
  await page.locator('#contextHelpPopover [data-help-close]').click();
  assert.equal(await checkbox.isChecked(),true);
  assert.deepEqual(errors,[]);await page.close();
});

test('new fields, action buttons and dialogs acquire help automatically without duplicate controls',async()=>{
  const {page,errors}=await fixture();
  await page.evaluate(()=>{
    document.querySelector('#dynamicArea').innerHTML='<label>Deine Rückfrage<input id="helpQuestion"></label><button id="dynamicAction">Noch einmal versuchen</button><dialog id="fixtureDialog" role="dialog" aria-labelledby="fixtureTitle" data-help-topic="tutor"><h2 id="fixtureTitle">Lokales Modell testen</h2><label>Modellname<input id="dialogField"></label><button id="dialogAction">Test starten</button></dialog>';
  });
  for(const id of ['helpQuestion','dialogField','fixtureDialog']){
    const help=page.locator('[data-context-help][data-help-for="'+id+'"]');
    await page.waitForFunction(id=>document.querySelectorAll('[data-context-help][data-help-for="'+id+'"]').length===1,id);
    assert.equal(await help.count(),1);
  }
  for(const id of ['dynamicAction','dialogAction'])assert.ok((await page.locator('#'+id).getAttribute('title'))?.trim());
  await page.evaluate(()=>document.querySelector('#fixtureDialog').showModal());
  await page.locator('[data-context-help][data-help-for="dialogField"]').click();
  await page.locator('#contextHelpPopover').waitFor();
  assert.ok((await page.locator('#contextHelpPopover .context-help-text').innerText()).trim());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#fixtureDialog').evaluate(dialog=>dialog.open),true);
  assert.deepEqual(errors,[]);await page.close();
});

test('documentation opened from the child writing field excludes parent administration instructions',async()=>{
  const {page,errors}=await fixture();
  await page.evaluate(()=>{
    const parent=document.createElement('div');parent.id='parentView';parent.hidden=true;document.body.append(parent);
    window.TB_HELP_CONTENT.markdown+='\n## Eltern-PIN und Administration\nHier stehen geheime Hinweise für Erwachsene zum Zurücksetzen der Eltern-PIN.\n';
    window.TB_HELP_CONTENT.childMarkdown='# Hilfe für Kinder\n\n## Dein Text\nSchreibe in deinem Tempo und drücke auf Prüfen, wenn du bereit bist.\n';
  });
  await page.locator('[data-context-help][data-help-for="ta"]').click();
  await page.locator('#contextHelpPopover a[data-help-document]').click();
  await page.locator('#documentationDialog').waitFor();
  assert.equal(await page.locator('#documentationTitle').innerText(),'Hilfe für Kinder');
  const content=await page.locator('#documentationContent').innerText();
  assert.match(content,/Schreibe in deinem Tempo/);
  assert.doesNotMatch(content,/Eltern-PIN|Administration|Erwachsene|Zurücksetzen|Wähle ein lokales Sprachmodell/);
  assert.deepEqual(errors,[]);await page.close();
});

test('automatic action tooltips track changed labels and appear when the action receives keyboard focus',async()=>{
  const {page,errors}=await fixture();
  await page.evaluate(()=>{document.querySelector('#dynamicArea').innerHTML='<button id="changingAction">Alte Aktion</button><button id="tutorSelect">Modell automatisch auswählen</button>';});
  await page.waitForFunction(()=>document.querySelector('#changingAction').title.includes('Alte Aktion'));
  await page.locator('#changingAction').evaluate(button=>{button.textContent='Neue Aktion';});
  await page.waitForFunction(()=>document.querySelector('#changingAction').title.includes('Neue Aktion'));
  await page.locator('#changingAction').focus();
  await page.locator('#actionTooltip').waitFor();
  assert.match(await page.locator('#actionTooltip').innerText(),/Neue Aktion/);
  assert.match(await page.locator('#changingAction').getAttribute('aria-describedby'),/actionTooltip/);
  const modelTooltip=await page.locator('#tutorSelect').getAttribute('title');
  assert.match(modelTooltip,/CPU und Grafik/);
  assert.match(modelTooltip,/schnellste Variante|zwei passenden Testantworten/);
  assert.doesNotMatch(modelTooltip,/Führt die Aktion/);
  assert.deepEqual(errors,[]);await page.close();
});
