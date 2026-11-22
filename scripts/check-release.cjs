// Extract the actual ZIP and exercise its own Node runtime and browser assets.
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {createHash}=require('node:crypto');
const {execFile,spawn}=require('node:child_process');
const {promisify}=require('node:util');
const {chromium}=require('playwright');
const {makeFamily,openChild}=require('../tests/support/v2-fixture.cjs');
const exec=promisify(execFile),root=path.resolve(__dirname,'..');
const sha=data=>createHash('sha256').update(data).digest('hex');
async function main(file){
  const zip=await fs.realpath(path.resolve(root,file||''));
  if(!zip.startsWith(path.join(root,'Release')+path.sep)||!/^Tagebuch-2\.0\.0-Windows-x64-.*\.zip$/u.test(path.basename(zip)))throw Error('Expected the generated 2.0.0 ZIP below Release');
  const digest=sha(await fs.readFile(zip)),record=await fs.readFile(zip+'.sha256','utf8');
  if(!record.trim().startsWith(digest+'  '+path.basename(zip)))throw Error('ZIP checksum mismatch');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tagebuch-release-check-'));let browser,server;
  try{
    const command="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[IO.Compression.ZipFile]::OpenRead($env:TAGEBUCH_CHECK_ZIP); try { $zip.Entries.FullName | ConvertTo-Json -Compress } finally { $zip.Dispose() }; Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Archive/Microsoft.PowerShell.Archive.psd1'); Expand-Archive -LiteralPath $env:TAGEBUCH_CHECK_ZIP -DestinationPath $env:TAGEBUCH_CHECK_DEST";
    const extracted=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,env:{...process.env,TAGEBUCH_CHECK_ZIP:zip,TAGEBUCH_CHECK_DEST:directory},maxBuffer:4*1024*1024});
    const files=JSON.parse(extracted.stdout.trim());
    for(const name of files){const n=name.replaceAll('\\','/');if(!n.startsWith('Tagebuch/')||n.split('/').includes('..')||/^Tagebuch\/(?:data|tests|node_modules|\.git|content)\//iu.test(n)||/(?:^|\/)\.env(?:\.|$)/u.test(n))throw Error('Unexpected archive member '+n);}
    const app=path.join(directory,'Tagebuch'),version=JSON.parse(await fs.readFile(path.join(app,'VERSION.json'),'utf8'));
    if(version.version!=='2.0.0'||version.platform!=='win32-x64')throw Error('Incorrect release metadata');
    const node=path.join(app,'runtime/node.exe'),nodeVersion=(await exec(node,['--version'],{windowsHide:true})).stdout.trim();
    if(nodeVersion!==version.node)throw Error('Bundled Node version differs from manifest');
    const launcher=await fs.readFile(path.join(app,'Start.cmd'),'utf8');if(!launcher.includes('runtime\\node.exe')||!launcher.includes('scripts\\start.cjs'))throw Error('Incorrect Start.cmd');
    let checkedAssets=0;
    async function compare(relative){for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){const name=path.join(relative,entry.name);if(entry.isDirectory())await compare(name);else {if(sha(await fs.readFile(path.join(root,name)))!==sha(await fs.readFile(path.join(app,name))))throw Error('Stale bundled asset '+name);checkedAssets++;}}}
    await compare('Dev/app');
    if(sha(await fs.readFile(path.join(root,'Dev/Tagebuch.html')))!==sha(await fs.readFile(path.join(app,'Dev/Tagebuch.html'))))throw Error('Stale entry HTML');
    const runner="const {createDevServer}=require(process.argv[1]);const server=createDevServer({storage:false,ai:false,openai:false});server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));";
    server=spawn(node,['-e',runner,path.join(app,'scripts/dev-server.cjs')],{cwd:app,windowsHide:true,stdio:['ignore','pipe','pipe']});
    const origin=await new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(Error('Packaged server startup timed out')),30000);server.once('error',reject);server.once('exit',()=>reject(Error('Packaged server exited early')));server.stdout.on('data',data=>{buffer+=data;if(buffer.includes('\n')){try{const {port}=JSON.parse(buffer.trim());clearTimeout(timer);resolve('http://127.0.0.1:'+port);}catch(error){clearTimeout(timer);reject(error);}}});});
    browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
    const family=makeFamily({provider:'off'});family.data.one.entries=[{date:new Date().toISOString().slice(0,10),text:'Synthetischer Testeintrag.',errCats:{ie:10}}];
    await page.addInitScript(family=>{localStorage.setItem('schreibheft-v1',JSON.stringify(family));window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Microsoft Test',lang:'de-DE'}],cancel:()=>{},speak:u=>{window.__spoken.push(u.text);queueMicrotask(()=>u.onend?.());}}});},family);
    await page.goto(origin);await page.waitForFunction(()=>window.__test?.ready());await openChild(page);await page.locator('#tabPractice').click();await page.locator('#practiceFocus').waitFor();
    const material=await page.evaluate(async()=>{const bank=await TB_DICTATION.prepare(TB_PRACTICE);return {count:bank.entries.length,rejected:bank.rejected,entry:bank.entries.find(e=>e.id==='g5-ie-1')};});
    if(material.count!==54||material.rejected.length)throw Error('Packaged corpus did not validate');
    await page.locator('#tDict').click();await page.locator('#dtAll').click();if((await page.evaluate(()=>window.__spoken)).at(-1)!==material.entry.text)throw Error('Packaged focus selection mismatch');
    if(await page.locator('#dtIn').inputValue()!=='')throw Error('Packaged app filled the child input automatically');await page.locator('#dtIn').fill(material.entry.text);
    for(let i=0;i<20&&await page.locator('#dtDone').isDisabled();i++)await page.locator('#dtNext').click();await page.locator('#dtDone').click();await page.locator('.cmpgrid').waitFor();
    const log=await page.evaluate(()=>JSON.parse(localStorage.getItem('schreibheft-v1')).data.one.practice.log.at(-1));if(log.errors!==0||log.focusErrors!==0||log.materialHash!==material.entry.review.hash)throw Error('Packaged evaluation mismatch');
    await page.setViewportSize({width:390,height:844});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2))throw Error('Packaged mobile overflow');
    if(errors.length||external.length)throw Error('Unexpected browser error or external request');
    const report={version:version.version,zip:path.basename(zip),sha256:digest,node:nodeVersion,checkedAssets,reviewedTexts:material.count,focus:'ie',dictationErrors:log.errors,browserErrors:errors,externalRequests:external,passed:true};
    await fs.mkdir(path.join(root,'test-results'),{recursive:true});await fs.writeFile(path.join(root,'test-results/release-2.0.0-smoke.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{
    await browser?.close();if(server?.pid && server.exitCode===null && server.signalCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});
    const absolute=await fs.realpath(directory);if(absolute!==directory || !absolute.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(absolute).startsWith('tagebuch-release-check-'))throw Error('Refusing unexpected temporary cleanup path');
    await fs.rm(absolute,{recursive:true,force:true});
  }
}
if(require.main===module)main(process.argv[2]).catch(error=>{console.error(error.stack);process.exitCode=1;});
