const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {tmpdir} = require('node:os');
const {join,resolve,dirname,basename} = require('node:path');
const {createHash,webcrypto} = require('node:crypto');
const {chromium} = require('playwright');
const {createDevServer} = require('../scripts/dev-server.cjs');
const {get} = require('node:http');

async function fixture(run){
  const scratch = await fs.mkdtemp(join(tmpdir(),'tagebuch-store-'));
  const dataDir = join(scratch,'data');
  const server = createDevServer({dataDir});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {await run({origin,dataDir,scratch,server});}
  finally {
    await new Promise(resolve => server.close(resolve));
    assert.equal(dirname(resolve(scratch)),resolve(tmpdir()));assert.ok(basename(scratch).startsWith('tagebuch-store-'));
    await fs.rm(scratch,{recursive:true,force:true});
  }
}
async function client(origin){
  const response = await fetch(origin + '/api/storage/session',{headers:{'X-Tagebuch-Client':'1'}});
  assert.equal(response.status,200);const session = await response.json();
  return async (action,payload,headers = {}) => fetch(origin + '/api/storage/' + action,{method:'POST',headers:{'X-Tagebuch-Client':'1','X-Tagebuch-Token':session.token,'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});
}
test('storage requires its local session and rejects foreign origins and filesystem traversal', async () => fixture(async ({origin}) => {
  assert.equal((await fetch(origin + '/api/storage/session')).status,403);
  assert.equal((await fetch(origin + '/api/storage/session',{headers:{'X-Tagebuch-Client':'1',Origin:'https://other.invalid'}})).status,403);
  const invalidHost = await new Promise((resolve,reject) => {get(origin + '/api/storage/session',{headers:{'X-Tagebuch-Client':'1',Host:'other.invalid'}},response => {response.resume();resolve(response.statusCode);}).on('error',reject);});
  assert.equal(invalidHost,403);
  const api = await client(origin);
  assert.equal((await api('read',{path:'config/familie.json'},{'X-Tagebuch-Token':'bad'})).status,403);
  for(const path of ['../outside.json','C:/Windows/test.json','config/../outside.json','kinder/../files/tagebuch.json','kinder/Test/files/../../outside.json']) assert.equal((await api('write',{path,text:'bad'})).status,400);
  assert.equal((await api('remove',{path:'config/familie.json'})).status,400);
}));
test('storage atomically preserves Unicode text, pictures and backup files; missing is distinct from failure', async () => fixture(async ({origin,dataDir}) => {
  const api = await client(origin), file = 'kinder/Prüfkind/files/tagebuch.json';
  assert.deepEqual(await (await api('read',{path:file})).json(),{text:null});
  assert.equal((await api('write',{path:file,text:'verschlüsselt äöü 😀'})).status,200);
  assert.equal((await api('write',{path:file,text:123})).status,500);
  assert.equal((await (await api('read',{path:file})).json()).text,'verschlüsselt äöü 😀');
  await api('write',{path:'kinder/Prüfkind/files/bilder/e123.bild',text:'Bild-Daten'});
  await api('write',{path:'kinder/Prüfkind/files/sicherungen/tagebuch-2026-10-22.json',text:'Tagesstand'});
  assert.deepEqual((await (await api('list',{path:'kinder/Prüfkind/files/sicherungen'})).json()).names,['tagebuch-2026-10-22.json']);
  assert.ok((await fs.readdir(join(dataDir,'kinder/Prüfkind/files'))).every(name => !name.endsWith('.tmp')));
  assert.equal((await fetch(origin + '/data/kinder/Prüfkind/files/tagebuch.json')).status,404);
}));
test('storage rejects directory links before writing outside its data folder', async () => fixture(async ({origin,dataDir,scratch}) => {
  const api = await client(origin);await fs.mkdir(join(scratch,'outside'));await fs.mkdir(join(dataDir,'kinder'),{recursive:true});
  await fs.symlink(join(scratch,'outside'),join(dataDir,'kinder/Link'),process.platform === 'win32'?'junction':'dir');
  assert.equal((await api('write',{path:'kinder/Link/files/tagebuch.json',text:'must not write'})).status,500);
  assert.deepEqual(await fs.readdir(join(scratch,'outside')),[]);
}));
async function waitUntil(check){
  for(let attempt = 0;attempt < 100;attempt++) {if(await check()) return;await new Promise(resolve => setTimeout(resolve,50));}
  assert.fail('Expected persisted data did not become available');
}
async function readChild(dataDir){
  const cfg = JSON.parse(await fs.readFile(join(dataDir,'config/familie.json'),'utf8'));
  const entry = JSON.parse(await fs.readFile(join(dataDir,'kinder/' + cfg.children[0].folder + '/files/tagebuch.json'),'utf8'));
  assert.equal(entry.tagebuch,1);
  const key = await webcrypto.subtle.importKey('raw',Buffer.from(cfg.key,'base64'),'AES-GCM',false,['decrypt']);
  return JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(entry.iv,'base64')},key,Buffer.from(entry.data,'base64'))));
}
test('Windows Dev skips the picker, saves encrypted entries, and reloads them in a fresh browser', async () => fixture(async ({origin,dataDir}) => {
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge',headless:true});
  try {
    const page = await browser.newPage(), errors = [];page.on('pageerror',error => errors.push(error.message));
    const hash = pin => createHash('sha256').update('test-salt:' + pin).digest('hex');
    const state = {v:2,salt:'test-salt',savedAt:1,children:['test'],active:'test',parent:{pinHash:hash('4321'),grammar:false,topic:'',storage:{mode:'folder'},moodSharing:{enabled:false,ai:false}},data:{test:{id:'test',name:'Prüfkind',entries:[],words:{},names:[],readLog:{},draft:'',draftQ:{},kidPinHash:hash('1234'),reward:{cfg:{entryWords:1,entrySentences:1,sentenceWords:1}}}}};
    await page.addInitScript(state => localStorage.setItem('schreibheft-v1',JSON.stringify(state)),state);
    await page.goto(origin);await page.waitForFunction(() => window.__test?.ready());
    await page.locator('[data-kid=test]').waitFor();assert.equal(await page.locator('#gatePick').count(),0);
    assert.equal(await page.locator('#dangerDlg').isVisible(),false);
    await page.locator('[data-kid=test]').click();await page.locator('#kidPinBox .p1').fill('1234');await page.locator('#kidPinBox .go').click();
    const sentence = 'Heute habe ich ein schönes Buch gelesen.';
    await page.locator('#ta').fill(sentence);await page.locator('#checkBtn').click();await page.locator('#doneArea').waitFor();
    await waitUntil(async () => {try {return (await readChild(dataDir)).entries[0]?.text === sentence;}catch {return false;}});
    assert.deepEqual(errors,[]);await page.close();
    const fresh = await browser.newPage();await fresh.goto(origin);
    await fresh.locator('[data-kid=test]').waitFor();assert.equal(await fresh.locator('#gatePick').count(),0);
    await fresh.locator('[data-kid=test]').click();await fresh.locator('#kidPinBox .p1').fill('1234');await fresh.locator('#kidPinBox .go').click();
    await fresh.locator('#tabRead').click();
    assert.match(await fresh.locator('#readPage').innerText(),/schönes Buch gelesen/);
    await fresh.locator('#kidView [data-home]').click();await fresh.locator('#tileParent').click();
    await fresh.locator('#pinBox .p1').fill('4321');await fresh.locator('#pinBox .go').click();await fresh.locator('.pm[data-go=settings]').click();
    assert.ok((await fresh.locator('#storeCard').innerText()).includes(dataDir));assert.equal(await fresh.locator('#stPick').count(),0);
    await fresh.close();
  } finally {await browser.close();}
}));
test('unreadable family data blocks startup instead of replacing it with empty browser data', async () => fixture(async ({origin,dataDir}) => {
  const api = await client(origin);await api('write',{path:'config/familie.json',text:'broken config'});
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge',headless:true});
  try {const page = await browser.newPage();await page.goto(origin);await page.locator('#gateRetry').waitFor();
    assert.match(await page.locator('#folderGate').innerText(),/nicht verfügbar/);assert.equal(await page.locator('#gatePick').count(),0);
    assert.equal(await fs.readFile(join(dataDir,'config/familie.json'),'utf8'),'broken config');
  } finally {await browser.close();}
}));
