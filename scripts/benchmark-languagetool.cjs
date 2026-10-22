// Isolated, loopback-only LanguageTool baseline. No app data or machine settings.
const fs=require('node:fs/promises');
const {createWriteStream}=require('node:fs');
const {createHash}=require('node:crypto');
const {resolve,join}=require('node:path');
const {Readable}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const net=require('node:net');
const exec=promisify(execFile);
const root=resolve(__dirname,'../tests/benchmark-artifacts');
const runtime=join(root,'languagetool-runtime');
const manifestPath=join(runtime,'manifest.json');
const ADOPTIUM='https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&heap_size=normal&image_type=jre&jvm_impl=hotspot&os=windows&vendor=eclipse';
const LT_URL='https://languagetool.org/download/LanguageTool-6.6.zip';
const exists=path=>fs.access(path).then(()=>true,()=>false);
async function digest(path){const hash=createHash('sha256');for await(const block of require('node:fs').createReadStream(path))hash.update(block);return hash.digest('hex');}
async function download(url,path,expected){
  if(await exists(path)){
    const actual=await digest(path);
    if(!expected || expected===actual){console.log('Reuse '+path);return actual;}
    throw new Error('Existing archive checksum mismatch: '+path);
  }
  console.log('Download '+url);
  const response=await fetch(url,{signal:AbortSignal.timeout(300000)});
  if(!response.ok)throw new Error('Download HTTP '+response.status+' '+url);
  let bytes=0,last=0;const hash=createHash('sha256');
  const source=Readable.fromWeb(response.body);
  source.on('data',block=>{hash.update(block);bytes+=block.length;if(bytes-last>=25*1024*1024){console.log('Downloaded '+Math.round(bytes/1024/1024)+' MiB');last=bytes;}});
  await pipeline(source,createWriteStream(path,{flags:'wx'}));
  const actual=hash.digest('hex');
  if(expected && actual!==expected)throw new Error('Downloaded archive checksum mismatch: '+path);
  return actual;
}
async function extract(zip,destination){
  await fs.mkdir(destination,{recursive:true});
  const quote=value=>"'"+value.replace(/'/g,"''")+"'";
  await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath '+quote(zip)+' -DestinationPath '+quote(destination)+' -Force'],{windowsHide:true,maxBuffer:4*1024*1024});
}
async function prepare(){
  await fs.mkdir(runtime,{recursive:true});
  let manifest;
  if(await exists(manifestPath))manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
  else{
    const response=await fetch(ADOPTIUM,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error('Adoptium metadata HTTP '+response.status);
    const [asset]=await response.json();
    manifest={created:new Date().toISOString(),java:{version:asset.version.semver,...asset.binary.package},languagetool:{version:'6.6',link:LT_URL},baseline:'LanguageTool 6.6 local rules, without n-grams or cloud AI'};
    await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2));
  }
  const javaZip=join(runtime,manifest.java.name),ltZip=join(runtime,'LanguageTool-6.6.zip');
  manifest.java.actualSha256=await download(manifest.java.link,javaZip,manifest.java.checksum);
  manifest.languagetool.actualSha256=await download(LT_URL,ltZip,manifest.languagetool.actualSha256);
  const javaRoot=join(runtime,'jre'),ltRoot=join(runtime,'distribution');
  const findJava=async()=>{if(!await exists(javaRoot))return null;for(const entry of await fs.readdir(javaRoot)){const path=join(javaRoot,entry,'bin/java.exe');if(await exists(path))return path;}return null;};
  let java=await findJava();if(!java){console.log('Extract portable JRE');await extract(javaZip,javaRoot);java=await findJava();}
  const jar=join(ltRoot,'LanguageTool-6.6','languagetool-server.jar');
  if(!await exists(jar)){console.log('Extract LanguageTool');await extract(ltZip,ltRoot);}
  if(!java || !await exists(jar))throw new Error('Portable runtime extraction incomplete');
  const version=await exec(java,['-version'],{windowsHide:true});manifest.java.runtimeVersion=(version.stdout+version.stderr).trim();
  manifest.java.executable=java;manifest.languagetool.jar=jar;
  await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2));
  console.log('Portable baseline ready; manifest '+manifestPath);
  return manifest;
}
async function freePort(){const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
function corrected(input,matches){
  const accepted=[];
  for(const match of [...matches].sort((a,b)=>a.offset-b.offset || b.length-a.length)){
    const replacement=match.replacements?.[0]?.value;
    if(typeof replacement!=='string' || !Number.isInteger(match.offset) || !Number.isInteger(match.length) || match.offset<0 || match.offset+match.length>input.length)continue;
    const start=match.offset,end=start+match.length;
    if(accepted.some(edit=>start<edit.end && end>edit.start || start===edit.start))continue;
    accepted.push({start,end,replacement});
  }
  let result=input;for(const edit of accepted.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.replacement+result.slice(edit.end);
  return result;
}
async function run(corpusPath,outPath){
  const manifest=await prepare(),port=await freePort();
  const config=join(runtime,'server.properties');await fs.writeFile(config,'# Local benchmark: no n-grams, no cloud, default enabled rules.\n');
  const args=['-Xmx1024m','-cp',manifest.languagetool.jar,'org.languagetool.server.HTTPServer','--config',config,'--port',String(port)];
  const log=createWriteStream(join(runtime,'server.log'));
  const server=spawn(manifest.java.executable,args,{windowsHide:true,cwd:resolve(manifest.languagetool.jar,'..'),stdio:['ignore','pipe','pipe']});
  server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});let exitCode=null,spawnError;server.on('exit',code=>{exitCode=code;});server.on('error',error=>{spawnError=error;});
  const started=performance.now(),url='http://127.0.0.1:'+port;
  try{
    while(true){
      if(spawnError)throw spawnError;
      if(exitCode!==null)throw new Error('LanguageTool exited '+exitCode+'; see server.log');
      try{const response=await fetch(url+'/v2/languages',{signal:AbortSignal.timeout(1000)});if(response.ok)break;}catch{}
      if(performance.now()-started>120000)throw new Error('LanguageTool startup timed out');
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    const listening=await exec('netstat.exe',['-ano','-p','TCP'],{windowsHide:true});
    const listeners=listening.stdout.split(/\r?\n/).map(line=>line.trim().split(/\s+/)).filter(parts=>parts[0]==='TCP' && parts[1]?.endsWith(':'+port) && Number(parts.at(-1))===server.pid);
    if(!listeners.length || listeners.some(parts=>!['127.0.0.1:'+port,'[::1]:'+port].includes(parts[1])))throw new Error('Server listener is not exclusively loopback: '+JSON.stringify(listeners));
    console.log('LanguageTool loopback port '+port+'; server startup '+Math.round(performance.now()-started)+' ms');
    const corpus=JSON.parse(await fs.readFile(corpusPath,'utf8'));
    const items=Array.isArray(corpus)?corpus:[...corpus.items,...corpus.controls];
    await fs.mkdir(resolve(outPath,'..'),{recursive:true});await fs.writeFile(outPath,'');
    const summary={...manifest,port,listeners:listeners.map(parts=>parts[1]),startedAt:new Date().toISOString(),startupMs:performance.now()-started,request:{language:'de-DE',level:'default'},correctionPolicy:'Apply first replacement of each non-overlapping match; ascending offset, longer match first on ties. No names/reference/gold/personal dictionary or automatic register rewriting supplied.',items:items.length};
    for(let index=0;index<items.length;index++){
      const item=items[index],begin=performance.now();let result;
      try{
        const response=await fetch(url+'/v2/check',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({language:'de-DE',text:item.input,level:'default'}),signal:AbortSignal.timeout(60000)});
        const raw=await response.json();if(!response.ok)throw new Error('LanguageTool HTTP '+response.status+' '+JSON.stringify(raw));
        result={id:item.id,input:item.input,correction:corrected(item.input,raw.matches||[]),elapsedMs:performance.now()-begin,raw};
        summary.version=raw.software;
      }catch(error){result={id:item.id,input:item.input,elapsedMs:performance.now()-begin,error:error.message};}
      await fs.appendFile(outPath,JSON.stringify(result)+'\n');console.log((index+1)+'/'+items.length+' '+item.id+' '+Math.round(result.elapsedMs)+' ms '+(result.error?'ERROR':result.raw.matches.length+' matches'));
    }
    summary.finishedAt=new Date().toISOString();summary.resultsPath=outPath;
    await fs.writeFile(outPath.replace(/\.jsonl$/,'')+'-manifest.json',JSON.stringify(summary,null,2));
    console.log('Results '+outPath);
  }finally{
    server.kill();await new Promise(resolve=>{if(server.exitCode!==null || server.signalCode!==null || spawnError)resolve();else server.once('exit',resolve);});log.end();console.log('LanguageTool server stopped');
  }
}
if(require.main===module){
  const args=process.argv.slice(2),argument=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:resolve(args[i+1]);};
  (args.includes('--prepare')?prepare():run(argument('--corpus',join(root,'corpus.json')),argument('--out',join(root,'languagetool-results.jsonl')))).catch(error=>{console.error(error.stack);process.exitCode=1;});
}
module.exports={corrected};
