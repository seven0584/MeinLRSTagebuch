const {chromium}=require('playwright'),{spawn}=require('node:child_process'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const C=require('../app/learning-core.js');
const KEY='schreibheft-v1',base='http://127.0.0.1:8767';
const child=(id,name)=>({id,name,entries:[],words:{},names:[],draft:'',draftQ:{},reward:{cfg:{entryWords:5,entrySentences:1,sentenceWords:3,days:7,perSentence:10,perWord:2,comma:5}},readLog:{},kidPinHash:''});
const family=()=>({v:2,parent:{grammar:false,storage:{mode:'browser'}},salt:'',children:['c1','c2'],data:{c1:child('c1','Anna'),c2:child('c2','Ben')},active:'c1'});
async function parent(p,first=false){await p.locator('#tileParent').click();await p.waitForFunction(()=>document.activeElement===document.querySelector('#pinBox .p1'));await p.locator('#pinBox .p1').fill('1234');if(first)await p.locator('#pinBox .p2').fill('1234');await p.locator('#pinBox .go').click();await p.locator('#parentArea').waitFor({state:'visible'});}
async function kid(p,id='c1',first=false){await p.locator(`[data-kid="${id}"]`).click();await p.waitForFunction(()=>document.activeElement===document.querySelector('#kidPinBox .p1'));await p.locator('#kidPinBox .p1').fill('5678');if(first)await p.locator('#kidPinBox .p2').fill('5678');await p.locator('#kidPinBox .go').click();await p.locator('#kidView').waitFor({state:'visible'});}
async function data(p){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);}
(async()=>{
 const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});let browser;
 try{
  for(let i=0;i<50;i++){try{if((await fetch(base+'/Tagebuch.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});
  await ctx.route('https://raw.githubusercontent.com/**',r=>r.abort());
  await ctx.addInitScript(()=>{window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};const mock={getVoices:()=>[{name:'Teststimme',lang:'de-DE',voiceURI:'test',localService:true}],addEventListener(){},cancel(){},speak(u){window.lastSpoken=u.text;setTimeout(()=>u.onend?.(),10);}};Object.defineProperty(window,'speechSynthesis',{value:mock,configurable:true});});
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/Tagebuch.html');await p.evaluate(([k,f])=>localStorage.setItem(k,JSON.stringify(f)),[KEY,family()]);await p.reload();await p.waitForFunction(()=>window.__test?.ready());
  await parent(p,true);await p.locator('[data-go="setup"]').click();
  assert.equal(await p.locator('#setupWords').inputValue(),'5');await p.locator('#setupSample').fill('Die Sonne scheint im Garten.');
  assert.match(await p.locator('#setupPreview').innerText(),/5 Wörter, 1 zählender Satz.*erreicht.*14 Tagebuch-Coins/s);
  await p.locator('#setupDays').fill('5');await p.locator('#setupSave').click();assert.equal((await data(p)).data.c1.reward.cfg.days,5);
  await p.locator('#childSel').selectOption('c2');assert.equal(await p.locator('#setupDays').inputValue(),'7');await p.locator('#childSel').selectOption('c1');
  await p.locator('[data-go="overview"]').click();await p.locator('#assignCategory').selectOption('dopp');await p.locator('#assignCount').fill('2');await p.locator('#assignCoins').fill('12');await p.locator('#assignDo').click();
  let d=await data(p);const offeredId=d.data.c1.learning.tasks[0].id;await p.locator('[data-edit-task]').click();await p.locator('#assignCoins').fill('12');await p.locator('#assignDo').click();d=await data(p);assert.equal(d.data.c1.learning.tasks[0].id,offeredId);assert.equal(d.data.c1.learning.tasks.length,1);assert.equal(d.data.c2.learning?.tasks.length||0,0);
  await p.screenshot({path:'/tmp/tagebuch-parent-overview.png',fullPage:true});
  await p.locator('#lockParent').click();await kid(p,'c1',true);
  assert.equal(await p.locator('#optionalQuestions').getAttribute('open'),null);
  await p.locator('#optionalQuestions summary').click();await p.locator('[data-q="best"]').fill('Das war gut.');await p.locator('#optionalQuestions summary').click();assert.equal(await p.locator('[data-q="best"]').inputValue(),'Das war gut.');
  await p.locator('#optionalQuestions summary').click();await p.locator('[data-q="best"]').fill('');await p.locator('#optionalQuestions summary').click();
  await p.locator('#ta').fill('Die Sonne scheint auf die blume.');await p.locator('#checkBtn').click();await p.locator('#wordEdit').waitFor();
  await p.locator('#wordHint').click();await p.locator('#wordHelp').click();await p.locator('#wordUnknown').click();await p.locator('#doneArea').waitFor({state:'visible'});
  d=await data(p);assert.equal(d.data.c1.entries.length,1);assert.match(d.data.c1.entries[0].text,/blume/);assert.equal(d.data.c1.entries[0].learningSummary.deferred,1);assert.match(await p.locator('#doneArea').innerText(),/Wörter bleiben offen/);
  assert.match(await p.locator('#weekCoinNum').innerText(),/16/);assert.equal(await p.locator('#coinNum').innerText(),'0');
  await p.locator('#kidView [data-home]').click();await parent(p);
  await p.locator('#learningParent details summary').click();assert.match(await p.locator('#learningParent').innerText(),/Privater Tagebuchtext/);assert(!((await p.locator('#learningParent').innerText()).includes('blume')));
  await p.locator('#lockParent').click();await kid(p);
  await p.locator('#openLearning summary').click();await p.locator('[data-share]').click();await p.locator('#openLearning summary').click();
  await p.locator('#kidView [data-home]').click();await parent(p);await p.locator('#learningParent details summary').click();assert.match(await p.locator('#learningParent').innerText(),/blume/);
  await p.locator('[data-review="confirmed"]').first().click();await p.locator('#lockParent').click();await kid(p);
  await p.locator('#openLearning summary').click();await p.locator('[data-retry-word]').fill('Blume');await p.locator('[data-retry]').click();
  d=await data(p);assert.match(d.data.c1.entries[0].text,/Blume/);assert.equal(d.data.c1.entries[0].learningSummary.resolved,1,JSON.stringify(d.data.c1.learning.cases));assert.equal(d.data.c1.entries[0].coins,16);
  if(await p.locator('#againBtn').isVisible())await p.locator('#againBtn').click();
  await p.locator('#ta').fill('Meine Muter geht in die Schule.');await p.locator('#checkBtn').click();await p.locator('#wordEdit').waitFor();await p.locator('#wordEdit').fill('Mutter');await p.locator('#wordApply').click();await p.locator('#doneArea').waitFor({state:'visible'});assert.match((await data(p)).data.c1.entries[0].text,/Mutter/);
  await p.locator('#tabPractice').click();await p.locator('[data-task]').first().click();await p.locator('#taskSpeak').click();await p.waitForFunction(()=>window.lastSpoken?.includes('Wir kommen zu dir'));
  await p.locator('#taskWord').fill('komen');await p.locator('#taskCheck').click();assert.match(await p.locator('#assignmentBox').innerText(),/Aufgaben-Schreibweise ist: kommen/);
  await p.locator('#taskHint').click();await p.locator('#taskWord').fill('kommen');await p.locator('#taskCheck').click();await p.locator('#taskUnknown').click();assert.match(await p.locator('#assignmentBox').innerText(),/6 Extra-Coins/);
  assert.equal((await data(p)).data.c1.reward.ledger.filter(l=>l.type==='task').length,1);
  await p.locator('#taskBack').click();await p.locator('[data-task]').first().click();await p.locator('#taskWord').fill('Sonne');await p.locator('#taskCheck').click();assert.match(await p.locator('#assignmentBox').innerText(),/12 Extra-Coins/);assert.equal(await p.locator('#coinNum').innerText(),'12');
  await p.reload();await p.waitForFunction(()=>window.__test?.ready());await kid(p);await p.locator('#tabPractice').click();await p.locator('[data-task]').first().click();assert.equal((await data(p)).data.c1.reward.ledger.filter(l=>l.type==='task').length,2);
  await p.locator('#kidView [data-home]').click();await parent(p);await p.locator('#assignCategory').selectOption('ie');await p.locator('#assignType').selectOption('text');await p.locator('#assignCoins').fill('11');await p.locator('#assignDo').click();
  const textTask=(await data(p)).data.c1.learning.tasks.at(-1);
  await p.locator('#lockParent').click();await kid(p);await p.locator('#tabPractice').click();await p.locator('[data-task]').first().click();await p.locator('#taskText').fill(textTask.text);await p.locator('#taskPause').click();await p.reload();await p.waitForFunction(()=>window.__test?.ready());await kid(p);await p.locator('#tabPractice').click();await p.locator('[data-task]').first().click();assert.equal(await p.locator('#taskText').inputValue(),textTask.text);
  await p.locator('#taskSubmitText').click();assert.match(await p.locator('#assignmentBox').innerText(),/11 Extra-Coins/);
  await p.screenshot({path:'/tmp/tagebuch-child-result.png',fullPage:true});
  // Backup downloads contain the same learning data after encrypted roundtrip through real restore UI.
  await p.locator('#kidView [data-home]').click();await parent(p);await p.locator('[data-go="settings"]').click();await p.locator('#bkPw1').fill('Test-Passwort-2026');await p.locator('#bkPw2').fill('Test-Passwort-2026');
  const download=await Promise.all([p.waitForEvent('download'),p.locator('#bkDo').click()]).then(x=>x[0]);const backup='/tmp/tagebuch-test-backup.json';await download.saveAs(backup);const savedLearning=(await data(p)).data.c1.learning;
  await p.locator('#rsFile').evaluate(el=>el.closest('details').open=true);await p.locator('#rsFile').setInputFiles(backup);await p.locator('#rsPw').fill('Test-Passwort-2026');p.once('dialog',d=>d.accept());await p.locator('#rsDo').click();await p.waitForEvent('load');await p.waitForFunction(()=>window.__test?.ready());assert.deepEqual((await data(p)).data.c1.learning,savedLearning);
  assert.deepEqual(errors,[]);
  console.log('PASS: setup preview, per-child settings, private word cases, hint events, deferred diary finish, direct correction, word/text tasks, proportional coins, reload/pause, encrypted backup/restore');
  // Fresh browser contexts isolate compatibility failures from the normal profile.
  const future=await browser.newContext();await future.route('https://raw.githubusercontent.com/**',r=>r.abort());const q=await future.newPage();await q.goto(base+'/Tagebuch.html');const f=family();C.ensure(f.data.c1).schema=99;const raw=JSON.stringify(f);await q.evaluate(([k,s])=>localStorage.setItem(k,s),[KEY,raw]);await q.reload();await q.locator('#startupProblem').waitFor({state:'visible'});assert.equal(await q.evaluate(k=>localStorage.getItem(k),KEY),raw);assert.match(await q.locator('#startupProblem').innerText(),/Für Kinder.*Für Eltern/s);assert.equal(await q.evaluate(()=>!!window.__test),false);
  await q.evaluate(k=>localStorage.removeItem(k),KEY);await q.route('**/app/app.js',r=>r.abort());await q.reload();await q.locator('#startupProblem').waitFor({state:'visible',timeout:12000});assert.match(await q.locator('#startupProblem').innerText(),/vollständige aktuelle Version/);await future.close();
  console.log('PASS: future schema remains byte-for-byte unchanged; missing program file displays actionable parent/child fallback');
  // Actual browser quota error: no task or coins can be committed partially.
  await parent(p);await p.evaluate(()=>{const original=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(k==='schreibheft-v1')throw new DOMException('Test quota','QuotaExceededError');return original.call(this,k,v);};});
  const before=await data(p);await p.locator('#assignDo').click();assert.match(await p.locator('#learningMessage').innerText(),/nicht gespeichert/);assert.deepEqual(await data(p),before);await p.evaluate(()=>window.restoreStorage());
  console.log('PASS: browser quota failure leaves stored learning state and ledger unchanged');
  await p.locator('#assignCount').fill('1');await p.locator('#assignCoins').fill('7');await p.locator('#assignDo').click();const unpaid=(await data(p)).data.c1.learning.tasks.at(-1);await p.locator('#lockParent').click();await kid(p);await p.locator('#tabPractice').click();await p.locator('[data-task]').first().click();
  await p.locator('#taskWord').fill(unpaid.items[0].word);await p.evaluate(()=>{const original=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(k==='schreibheft-v1')throw new DOMException('Test quota','QuotaExceededError');return original.call(this,k,v);};});const unpaidBefore=await data(p);await p.locator('#taskCheck').click();assert.deepEqual(await data(p),unpaidBefore);await p.evaluate(()=>window.restoreStorage());await p.locator('#taskCheck').click();assert.equal((await data(p)).data.c1.learning.tasks.at(-1).paid,7);assert.equal((await data(p)).data.c1.reward.ledger.filter(l=>l.taskId===unpaid.id).length,1);
  console.log('PASS: a failed task finish does not pay; a successful retry pays exactly once');
  await ctx.close();
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
