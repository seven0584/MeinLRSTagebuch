const {chromium}=require('playwright'),{spawn}=require('node:child_process'),assert=require('node:assert/strict'),path=require('node:path');
const C=require('../app/learning-core.js'),KEY='schreibheft-v1',base='http://127.0.0.1:8768';
function child(){return {id:'c1',name:'Testkind',entries:[],words:{},names:[],draft:'',draftQ:{},reward:{ledger:[]},readLog:{},kidPinHash:''};}
function family(){return {v:2,parent:{pin:'1234',grammar:false,storage:{mode:'browser'}},children:['c1'],data:{c1:child()},active:'c1'};}
async function installFS(ctx,files){await ctx.addInitScript(seed=>{
 window.testFiles=JSON.parse(sessionStorage.getItem('test-files')||'null')||seed;window.testWrites=[];
 const persist=()=>sessionStorage.setItem('test-files',JSON.stringify(window.testFiles));
 const missing=()=>new DOMException('Missing test file','NotFoundError');
 function dir(prefix='') {return {kind:'directory',name:prefix.split('/').filter(Boolean).at(-1)||'Tagebuch',queryPermission:async()=> 'granted',requestPermission:async()=> 'granted',
 async getDirectoryHandle(name,{create}={}){const p=prefix+name+'/';if(!create&&!Object.keys(testFiles).some(k=>k.startsWith(p)))throw missing();return dir(p);},
 async getFileHandle(name,{create}={}){const p=prefix+name;if(!(p in testFiles)){if(!create)throw missing();testFiles[p]='';}
 return {kind:'file',name,async getFile(){return new File([testFiles[p]],name);},async createWritable(){let next;return {async write(value){next=typeof value==='string'?value:await new Blob([value]).text();},async close(){testFiles[p]=next;testWrites.push(p);persist();},async abort(){}};}};},
 async removeEntry(name){delete testFiles[prefix+name];persist();},async *entries(){for(const k of Object.keys(testFiles)){const name=k.slice(prefix.length);if(k.startsWith(prefix)&&!name.includes('/'))yield [name,{kind:'file'}];}}};}
 window.showDirectoryPicker=async()=>dir();
 },files);}
async function openParent(p){await p.locator('#tileParent').click();await p.waitForFunction(()=>document.activeElement===document.querySelector('#pinBox .p1'));await p.locator('#pinBox .p1').fill('1234');await p.locator('#pinBox .go').click();await p.locator('#parentArea').waitFor({state:'visible'});await p.locator('[data-go="settings"]').click();}
(async()=>{const server=spawn('python3',['-m','http.server','8768','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});let browser;
 try{
 for(let i=0;i<50;i++){try{if((await fetch(base+'/Tagebuch.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const c=child(),t=C.assign(c,{category:'ie',count:2,coins:20});C.attempt(c,t.id,0,t.items[0].word);C.skipTaskWord(c,t.id,1,'unknown');C.settleTask(c,t.id);
 const config={app:'tagebuch',v:3,parent:{pin:'1234',grammar:false,storage:{mode:'folder'}},children:[{id:'c1',name:'Testkind',folder:'Testkind'}],active:'c1',key:Buffer.alloc(32,7).toString('base64'),savedAt:Date.now()+100000};
 const seed={'Tagebuch.html':'test','config/familie.json':JSON.stringify(config),'kinder/Testkind/files/tagebuch.json':JSON.stringify(c)};
 const ctx=await browser.newContext();await installFS(ctx,seed);await ctx.route('https://raw.githubusercontent.com/**',r=>r.abort());const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(base+'/Tagebuch.html');await p.evaluate(([k,f])=>localStorage.setItem(k,JSON.stringify(f)),[KEY,family()]);await p.reload();await p.waitForFunction(()=>window.__test?.ready());await openParent(p);await p.locator('#stToFolder').click();await p.locator('#stPick').click();
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.c1.learning.tasks.length===1);
 let data=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);assert.deepEqual(data.data.c1.learning,c.learning);assert.equal(data.data.c1.reward.ledger[0].amount,10);
 await p.locator('[data-go="overview"]').click(); // refresh after importing a folder
 await p.locator('#parentView [data-home]').click();await openParent(p);await p.locator('[data-go="overview"]').click();await p.locator('#assignCount').fill('1');await p.locator('#assignCoins').fill('7');await p.locator('#assignDo').click();
 await p.waitForFunction(()=>window.testWrites.includes('kinder/Testkind/files/tagebuch.json'));
 const restored=await p.evaluate(async()=>{const cfg=JSON.parse(testFiles['config/familie.json']),f=JSON.parse(testFiles['kinder/Testkind/files/tagebuch.json']);const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));const key=await crypto.subtle.importKey('raw',bytes(cfg.key),'AES-GCM',false,['decrypt']);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(f.iv)},key,bytes(f.data))));});
 assert.equal(restored.learning.tasks.length,2);assert.equal(restored.learning.tasks[0].paid,10);assert.equal(restored.reward.ledger[0].amount,10);assert.deepEqual(errors,[]);await ctx.close();
 console.log('PASS: existing folder import and encrypted folder save preserve word cases, task status and ledger');
 // Newer child data must be checked even if an older folder timestamp would normally lose to the browser.
 for(const mode of ['schema','missing','config']){
  const files={...seed},f=JSON.parse(files['config/familie.json']);f.savedAt=1;if(mode==='config')f.v=99;files['config/familie.json']=JSON.stringify(f);
  if(mode==='schema'){const cc=JSON.parse(files['kinder/Testkind/files/tagebuch.json']);cc.learning.schema=99;files['kinder/Testkind/files/tagebuch.json']=JSON.stringify(cc);}if(mode==='missing')delete files['kinder/Testkind/files/tagebuch.json'];
  const cx=await browser.newContext();await installFS(cx,files);await cx.route('https://raw.githubusercontent.com/**',r=>r.abort());const q=await cx.newPage();q.on('dialog',d=>d.accept());await q.goto(base+'/Tagebuch.html');await q.evaluate(([k,f])=>localStorage.setItem(k,JSON.stringify(f)),[KEY,family()]);await q.reload();await q.waitForFunction(()=>window.__test?.ready());await openParent(q);await q.locator('#stToFolder').click();await q.locator('#stPick').click();await q.locator('#startupProblem').waitFor({state:'visible'});
  assert.deepEqual(await q.evaluate(()=>window.testFiles),files);assert.deepEqual(await q.evaluate(()=>window.testWrites),[]);assert.equal((await q.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)).data.c1.learning.tasks.length,0);await cx.close();
 }
 console.log('PASS: future schema, future config and incomplete folders cause actionable notices and zero file writes, even with older timestamps');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
