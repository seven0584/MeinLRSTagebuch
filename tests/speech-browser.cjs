// Optional control-flow test using simulated speech voices (does not assess sound quality).
// Requires Python 3, Playwright and Chromium. Run: node tests/speech-browser.cjs
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
 const server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
 let browser;
 try {
  for (let i=0;i<50;i++) {
   try { if((await fetch('http://127.0.0.1:8766/Tagebuch.html')).ok)break; }catch(_){}
   if(server.exitCode!==null||i===49)throw Error('Test server unavailable');
   await new Promise(r=>setTimeout(r,100));
  }
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  for(const platform of ['Win32','MacIntel']) {
   const ctx=await browser.newContext();const page=await ctx.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));await ctx.route('https://raw.githubusercontent.com/**',r=>r.abort());
   await page.addInitScript(platform=>{
    Object.defineProperty(navigator,'platform',{get:()=>platform});
    Object.defineProperty(navigator,'userAgentData',{value:{platform:platform==='Win32'?'Windows':'macOS'},configurable:true});
    const synth=new EventTarget();let timer=null;
    const voices=[{name:'Microsoft Hedda',lang:'de-DE',voiceURI:'de-default'},{name:'Clara',lang:'de-DE',voiceURI:'de-custom'},{name:'Tom',lang:'en-US',voiceURI:'en'}];
    window.__speech={voices,calls:[],cancelled:0,hang:false};
    synth.getVoices=()=>__speech.voices;
    synth.cancel=()=>{__speech.cancelled++;clearTimeout(timer);};
    synth.speak=u=>{__speech.calls.push({text:u.text,rate:u.rate,voice:u.voice.voiceURI,lang:u.lang});if(!__speech.hang)timer=setTimeout(()=>u.onend(),5);};
    Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   },platform);
   await page.goto('http://127.0.0.1:8766/Tagebuch.html');
   await page.evaluate(()=>localStorage.setItem('schreibheft-v1',JSON.stringify({v:2,parent:{storage:{mode:'browser'},grammar:false},salt:'',children:['c1'],active:'c1',data:{c1:{id:'c1',name:'Testkind',entries:[],words:{},names:[],draft:'',draftQ:{},reward:null,readLog:{},kidPinHash:''}}})));
   await page.reload();await page.waitForFunction(()=>window.__test?.ready());
   await page.locator('#tileParent').click();await page.waitForFunction(()=>document.activeElement===document.querySelector('#pinBox .p1'));await page.locator('#pinBox .p1').first().fill('1234');await page.locator('#pinBox .p2').first().fill('1234');await page.locator('#pinBox .go').first().click();
   await page.locator('.pm[data-go="settings"]').click();
   assert.equal(await page.locator('#speechVoice option').count(),3);
   assert.equal(await page.locator('#speechVoice option[value="en"]').count(),0);
   assert.equal(await page.locator('#speechMacHelp').evaluate(e=>e.hidden),platform!=='MacIntel');
   assert.equal(await page.locator('#speechWindowsLinks').evaluate(e=>e.hidden),platform!=='Win32');
   assert.equal(await page.locator('#speechWindowsLinks a').first().getAttribute('href'),'ms-settings:speech');
   assert.match(await page.locator('#speechMacHelp a').getAttribute('href'),/^x-apple.systempreferences:/);
   await page.locator('#speechVoice').selectOption('de-custom');
   await page.locator('#speechRate').evaluate(e=>{e.value='0.95';e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'));});
   await page.locator('#speechSample').fill('Ich spiele heute im Garten.');
   await page.locator('#speechTest').click();await page.waitForFunction(()=>document.querySelector('#speechStatus').textContent.startsWith('Hörprobe beendet'));
   let calls=await page.evaluate(()=>__speech.calls);assert.equal(calls.at(-1).voice,'de-custom');assert.equal(calls.at(-1).rate,.95);assert.equal(calls.at(-1).text,'Ich spiele heute im Garten.');
   await page.locator('#speechTestSlow').click();await page.waitForFunction(()=>document.querySelector('#speechStatus').textContent.startsWith('Hörprobe beendet'));
   calls=await page.evaluate(()=>__speech.calls);assert(Math.abs(calls.at(-1).rate-.95*.6/.85)<1e-10);
   await page.evaluate(()=>{__speech.hang=true;});await page.locator('#speechTest').click();await page.locator('#speechStop').click();assert.equal(await page.locator('#speechStatus').innerText(),'Hörprobe gestoppt.');
   await page.evaluate(()=>{__speech.hang=false;__speech.voices=__speech.voices.filter(v=>v.voiceURI!=='de-custom');speechSynthesis.dispatchEvent(new Event('voiceschanged'));});
   assert.match(await page.locator('#speechVoiceInfo').innerText(),/gespeicherte Stimme.*nicht verfügbar/);
   await page.locator('#speechTest').click();await page.waitForFunction(()=>document.querySelector('#speechStatus').textContent.startsWith('Hörprobe beendet'));assert.equal(await page.evaluate(()=>__speech.calls.at(-1).voice),'de-default');
   await page.evaluate(()=>{__speech.voices=[];speechSynthesis.dispatchEvent(new Event('voiceschanged'));});assert(await page.locator('#speechTest').isDisabled());assert.match(await page.locator('#speechVoiceInfo').innerText(),/keine deutsche Stimme/);
   await page.reload();await page.waitForFunction(()=>window.__test?.ready());
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).parent.speech);assert.deepEqual(saved,{voice:'de-custom',rate:.95});
   // The shared speak() path must apply the same selection to the child's dictation.
   await page.locator('[data-kid="c1"]').click();await page.waitForFunction(()=>document.activeElement===document.querySelector('#kidPinBox .p1'));await page.locator('#kidPinBox .p1').fill('5678');await page.locator('#kidPinBox .p2').fill('5678');await page.locator('#kidPinBox .go').click();
   await page.locator('#tabPractice').click();
   await page.locator('#tWords').click();
   await page.waitForFunction(()=>window.__speech.calls.length>0);
   assert.equal(await page.evaluate(()=>__speech.calls[0].voice),'de-custom');
   assert.equal(await page.evaluate(()=>__speech.calls[0].rate),.95);
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS:',platform,'voice selection, rate, sample, slow sample, stop, asynchronous voice list, fallback, persistence and OS help');
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
