const {mkdir,open,readFile,writeFile,stat,unlink} = require('node:fs/promises');
const {resolve,join} = require('node:path');
const {randomBytes,timingSafeEqual,createHash} = require('node:crypto');
const {spawn} = require('node:child_process');
const {createServer} = require('node:net');
const models = require('../Dev/app/model-catalog.js');

// Immutable release and hashes from the official GitHub release API. No installer,
// PATH edits, registry writes or global environment changes.
const RELEASE = {version:'v0.40.8',assets:{
  x64:{name:'ollama-windows-amd64.zip',bytes:1582537058,sha256:'04d1d43ac62c2deb0393307bb49fed7caf6b192de41bdd497aaa9488089d5552'},
  arm64:{name:'ollama-windows-arm64.zip',bytes:210719486,sha256:'b3e5c85dd5cd6708df8f49d04706e979ba5164ad39567c1794a45afb2252d2a2'}
}};
const wait = ms => new Promise(r => setTimeout(r,ms));
function command(exe,args,options){
  return new Promise((done,reject) => {
    const child = spawn(exe,args,{windowsHide:true,stdio:'ignore',...options});
    child.once('error',reject);child.once('exit',code => code === 0 ? done() : reject(new Error('Entpacken fehlgeschlagen. Bitte freien Speicherplatz prüfen und erneut versuchen.')));
  });
}
async function downloadRuntime(asset,directory,progress,{fetchImpl=fetch,extract=command,signal}={}){
  await mkdir(directory,{recursive:true});
  const archive = join(directory,'runtime.zip');
  const timeout=AbortSignal.timeout(30*60*1000);
  const response = await fetchImpl('https://github.com/ollama/ollama/releases/download/' + RELEASE.version + '/' + asset.name,{signal:signal?AbortSignal.any([signal,timeout]):timeout});
  if(!response.ok || !response.body) throw new Error('Die KI-Laufzeit konnte nicht heruntergeladen werden. Bitte Internetverbindung prüfen.');
  const file = await open(archive,'w'), hash = createHash('sha256');let bytes = 0;
  try {
    for await(const chunk of response.body){
      bytes += chunk.length;if(bytes > asset.bytes) throw new Error('Der Laufzeit-Download hat eine unerwartete Größe.');
      hash.update(chunk);await file.writeFile(chunk);progress({phase:'runtime',completed:bytes,total:asset.bytes});
    }
  } finally {await file.close();}
  if(bytes !== asset.bytes || hash.digest('hex') !== asset.sha256) throw new Error('Die Sicherheitsprüfung des Downloads ist fehlgeschlagen. Es wird nichts gestartet.');
  progress({phase:'extract',completed:0,total:0});
  await extract('powershell.exe',['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath $env:TAGEBUCH_AI_ARCHIVE -DestinationPath $env:TAGEBUCH_AI_DEST -Force'],{
    env:{...process.env,TAGEBUCH_AI_ARCHIVE:archive,TAGEBUCH_AI_DEST:join(directory,'bin')},signal
  });
  await stat(join(directory,'bin','ollama.exe'));
  await writeFile(join(directory,'ready.json'),JSON.stringify({version:RELEASE.version,sha256:asset.sha256}));
  await unlink(archive);
}
async function consumeProgress(response,progress){
  if(!response.ok || !response.body) throw new Error('Das Modell konnte nicht geladen werden. Bitte erneut versuchen.');
  const decoder = new TextDecoder();let pending = '',success = false;
  function line(value){
    if(!value.trim()) return;const item = JSON.parse(value);
    if(item.error) throw new Error('Modell-Download fehlgeschlagen: ' + String(item.error).slice(0,240));
    if(item.status === 'success') success = true;
    progress({phase:'model',message:String(item.status || ''),completed:item.completed || 0,total:item.total || 0});
  }
  for await(const chunk of response.body){
    pending += decoder.decode(chunk,{stream:true});if(pending.length > 1024*1024) throw new Error('Ungültiger Downloadfortschritt.');
    let end;while((end=pending.indexOf('\n')) >= 0){line(pending.slice(0,end));pending=pending.slice(end+1);}
  }
  line(pending + decoder.decode());if(!success) throw new Error('Der Modell-Download wurde unterbrochen. Bitte erneut versuchen.');
}
function createAiRuntime({directory,platform=process.platform,arch=process.arch,fetchImpl=fetch,provision=downloadRuntime,spawnImpl=spawn}={}){
  const base = resolve(directory), asset = RELEASE.assets[arch], token = randomBytes(32).toString('hex');
  const runtimeDir = join(base,RELEASE.version + '-' + arch), executable = join(runtimeDir,'bin','ollama.exe');
  let child = null,port = null,starting = null,closed = false;
  const lifetime=new AbortController();
  let job = {phase:'idle',busy:false,completed:0,total:0,message:''};
  function update(value){job={...job,...value};}
  async function installed(){
    if(!asset) return false;
    try {const ready=JSON.parse(await readFile(join(runtimeDir,'ready.json'),'utf8'));await stat(executable);return ready.sha256 === asset.sha256 && ready.version === RELEASE.version;} catch {return false;}
  }
  async function start(){
    if(closed) throw new Error('Der lokale Server wurde beendet.');
    if(child && port) return port;
    if(starting) return starting;
    starting=(async () => {
      if(!await installed()) throw new Error('Bitte zuerst die lokale KI in den Eltern-Einstellungen einrichten.');
      const socket=createServer();await new Promise((ok,no)=>{socket.once('error',no);socket.listen(0,'127.0.0.1',ok);});
      const selected=socket.address().port;await new Promise(ok=>socket.close(ok));
      await mkdir(join(base,'models'),{recursive:true});await mkdir(join(base,'home'),{recursive:true});
      const processChild=spawnImpl(executable,['serve'],{cwd:runtimeDir,windowsHide:true,stdio:'ignore',env:{...process.env,
        OLLAMA_HOST:'127.0.0.1:'+selected,OLLAMA_MODELS:join(base,'models'),OLLAMA_NO_CLOUD:'1',OLLAMA_ORIGINS:'',
        HOME:join(base,'home'),USERPROFILE:join(base,'home'),OLLAMA_KEEP_ALIVE:'2m'}});
      child=processChild;let failure=null;
      processChild.once('error',e=>{failure=e;});processChild.once('exit',()=>{if(child===processChild){child=null;port=null;}});
      for(let n=0;n<120;n++){
        if(closed || failure || processChild.exitCode !== null) break;
        try {const r=await fetchImpl('http://127.0.0.1:'+selected+'/api/version',{signal:AbortSignal.timeout(800)});if(r.ok){port=selected;return port;}}catch{}
        await wait(250);
      }
      processChild.kill();if(child===processChild) child=null;
      throw new Error('Die lokale KI konnte nicht starten. Bitte Windows-Version, Treiber und freien Speicher prüfen.');
    })();
    try{return await starting;}finally{starting=null;}
  }
  async function setup(model){
    try {
      if(!await installed()) await provision(asset,runtimeDir,update,{fetchImpl,signal:lifetime.signal});
      update({phase:'start',completed:0,total:0});const port=await start();
      update({phase:'model',completed:0,total:0});
      await consumeProgress(await fetchImpl('http://127.0.0.1:'+port+'/api/pull',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model,stream:true}),signal:AbortSignal.any([lifetime.signal,AbortSignal.timeout(2*60*60*1000)])}),update);
      update({phase:'ready',busy:false,message:'Modell bereit. Bitte mit „Beispiel testen“ prüfen.',completed:0,total:0});
    }catch(e){update({phase:'error',busy:false,message:e.message,completed:0,total:0});}
  }
  function respond(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
  async function handle(req,res,path){
    if(!path.startsWith('/api/ai/')) return false;
    const host=req.headers.host;
    if(!['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort].includes(host) ||
      (req.headers.origin && req.headers.origin !== 'http://'+host) || req.headers['x-tagebuch-client'] !== '1' ||
      (req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site']))){respond(res,403,{error:'Zugriff nur durch die lokale Tagebuch-App.'});return true;}
    if(path === '/api/ai/session' && req.method === 'GET'){respond(res,200,{token,supported:platform==='win32' && !!asset,runtimeBytes:asset?.bytes || 0});return true;}
    const supplied=Buffer.from(req.headers['x-tagebuch-token'] || '');
    if(supplied.length!==token.length || !timingSafeEqual(supplied,Buffer.from(token))){respond(res,403,{error:'Bitte die App neu laden.'});return true;}
    try {
      if(path==='/api/ai/status' && req.method==='GET'){respond(res,200,{...job,installed:await installed()});return true;}
      if(req.method!=='POST' || !String(req.headers['content-type']).startsWith('application/json')){respond(res,405,{error:'Ungültige Anfrage.'});return true;}
      const chunks=[];let bytes=0;
      for await(const part of req){bytes+=part.length;if(bytes>32768) throw new Error('Anfrage zu groß.');chunks.push(part);}
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(path==='/api/ai/setup'){
        if(platform!=='win32' || !asset) throw new Error('Die automatische Einrichtung unterstützt derzeit Windows x64 und ARM64.');
        if(!models.some(m=>m.id===input.model)) throw new Error('Bitte ein Modell aus der Auswahl verwenden.');
        if(job.busy){respond(res,409,{error:'Ein Download läuft bereits.'});return true;}
        update({phase:'runtime',busy:true,model:input.model,message:'',completed:0,total:0});
        void setup(input.model);respond(res,202,{ok:true});return true;
      }
      const endpoint=path.slice('/api/ai/ollama'.length);
      const readOnly=['/api/tags','/api/ps'].includes(endpoint);
      if(!path.startsWith('/api/ai/ollama/') || !['/api/tags','/api/show','/api/chat','/api/ps'].includes(endpoint)) {respond(res,404,{error:'Unbekannte KI-Anfrage.'});return true;}
      if(!readOnly && (typeof input.model !== 'string' || /(?:^|[:/.-])cloud(?:$|[:/.-])/i.test(input.model))) throw new Error('Bitte ein lokales Modell wählen.');
      const active=await start();
      const controller=new AbortController();const disconnected=()=>controller.abort();res.once('close',disconnected);
      try {
        const response=await fetchImpl('http://127.0.0.1:'+active+endpoint,{method:readOnly?'GET':'POST',
          headers:{'Content-Type':'application/json'},body:readOnly?undefined:JSON.stringify({...input,stream:false}),
          redirect:'error',signal:AbortSignal.any([controller.signal,lifetime.signal,AbortSignal.timeout(185000)])});
        respond(res,response.status,await response.json());
      }finally{res.removeListener('close',disconnected);}
    }catch(e){if(!res.destroyed) respond(res,400,{error:e.message});}
    return true;
  }
  function close(){closed=true;lifetime.abort();child?.kill();child=null;port=null;}
  return {handle,close};
}
module.exports={createAiRuntime,downloadRuntime,consumeProgress,RELEASE};
