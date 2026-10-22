const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {join,dirname,resolve,basename} = require('node:path');
const {tmpdir} = require('node:os');
const {createHash} = require('node:crypto');
const {EventEmitter} = require('node:events');
const {spawn} = require('node:child_process');
const {createDevServer} = require('../scripts/dev-server.cjs');
const {downloadRuntime,consumeProgress,RELEASE} = require('../scripts/ai-runtime.cjs');
async function temporary(run){
  const dir=await fs.mkdtemp(join(tmpdir(),'tagebuch-ai-'));
  try {await run(dir);}finally{
    assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('tagebuch-ai-'));
    await fs.rm(dir,{recursive:true,force:true});
  }
}
test('runtime archive must match pinned size and hash before extraction or execution',async()=>temporary(async dir=>{
  const content=Buffer.from('invented archive'),asset={name:'fixture.zip',bytes:content.length,sha256:createHash('sha256').update(content).digest('hex')};
  let extracted=0;const phases=[];
  const options={fetchImpl:async()=>new Response(content),extract:async(exe,args,opts)=>{
    extracted++;assert.equal(exe,'powershell.exe');assert.ok(args.at(-1).includes('-LiteralPath $env:TAGEBUCH_AI_ARCHIVE'));
    await fs.mkdir(opts.env.TAGEBUCH_AI_DEST,{recursive:true});await fs.writeFile(join(opts.env.TAGEBUCH_AI_DEST,'ollama.exe'),'fake');
  }};
  await assert.rejects(downloadRuntime({...asset,sha256:'0'.repeat(64)},dir,p=>phases.push(p.phase),options),/Sicherheitsprüfung/);
  assert.equal(extracted,0);await assert.rejects(fs.stat(join(dir,'ready.json')));
  await downloadRuntime(asset,dir,p=>phases.push(p.phase),options);
  assert.equal(extracted,1);assert.ok(phases.includes('extract'));await assert.rejects(fs.stat(join(dir,'runtime.zip')));
}));
test('streamed model progress handles split UTF-8 and rejects failed or truncated pulls',async()=>{
  const bytes=Buffer.from('{"status":"lädt","completed":2,"total":4}\n{"status":"success"}\n');
  const stream=new ReadableStream({start(c){for(const part of bytes)c.enqueue(Uint8Array.of(part));c.close();}}),events=[];
  await consumeProgress(new Response(stream),p=>events.push(p));assert.equal(events[0].message,'lädt');assert.equal(events[0].total,4);
  await assert.rejects(consumeProgress(new Response('{"status":"pulling"}\n'),()=>{}),/unterbrochen/);
  await assert.rejects(consumeProgress(new Response('{"error":"disk full"}\n'),()=>{}),/disk full/);
});
test('Windows extracts a verified portable archive into a path with spaces and umlauts', {skip:process.platform!=='win32'},async()=>temporary(async dir=>{
  const source=join(dir,'Quelle ä'),target=join(dir,'Laufzeit ö'),archive=join(dir,'fixture.zip');
  await fs.mkdir(source);await fs.writeFile(join(source,'ollama.exe'),'fake executable, never run');
  await new Promise((done,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command','Compress-Archive -LiteralPath $env:TAGEBUCH_TEST_FILE -DestinationPath $env:TAGEBUCH_TEST_ZIP'],{
      windowsHide:true,stdio:'ignore',env:{...process.env,TAGEBUCH_TEST_FILE:join(source,'ollama.exe'),TAGEBUCH_TEST_ZIP:archive}});
    child.once('error',reject);child.once('exit',code=>code===0?done():reject(new Error('Fixture ZIP failed')));
  });
  const bytes=await fs.readFile(archive),asset={name:'fixture.zip',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  await downloadRuntime(asset,target,()=>{},{fetchImpl:async()=>new Response(bytes)});
  assert.equal(await fs.readFile(join(target,'bin','ollama.exe'),'utf8'),'fake executable, never run');
  assert.equal(JSON.parse(await fs.readFile(join(target,'ready.json'),'utf8')).sha256,asset.sha256);
}));
test('local setup protects its session, provisions once, pulls allowlisted models and stops only its own process',async()=>temporary(async dir=>{
  let provisions=0,kills=0,spawns=0;const sent=[];
  const server=createDevServer({storage:false,dataDir:dir,aiOptions:{platform:'win32',arch:'x64',
    provision:async(asset,directory,progress)=>{
      provisions++;progress({phase:'runtime',completed:1,total:2});await fs.mkdir(join(directory,'bin'),{recursive:true});
      await fs.writeFile(join(directory,'bin','ollama.exe'),'fixture');
      await fs.writeFile(join(directory,'ready.json'),JSON.stringify({version:RELEASE.version,sha256:asset.sha256}));
    },
    spawnImpl:(exe,args,opts)=>{
      spawns++;assert.deepEqual(args,['serve']);assert.equal(opts.windowsHide,true);assert.equal(opts.env.OLLAMA_NO_CLOUD,'1');
      assert.ok(opts.env.OLLAMA_MODELS.startsWith(dir));assert.match(opts.env.OLLAMA_HOST,/^127\.0\.0\.1:\d+$/);
      const child=new EventEmitter();child.exitCode=null;child.kill=()=>{kills++;child.exitCode=0;child.emit('exit',0);};return child;
    },
    fetchImpl:async(url,options)=>{
      sent.push({url,options});assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\/api\//);
      if(url.endsWith('/api/pull')){assert.equal(JSON.parse(options.body).model,'qwen3:4b-instruct-2507-q4_K_M');return new Response('{"status":"success"}\n');}
      return Response.json(url.endsWith('/api/tags')?{models:[{name:'qwen3:4b-instruct-2507-q4_K_M'}]}:{version:RELEASE.version});
    }
  }});
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
  try {
    assert.equal((await fetch(origin+'/api/ai/session')).status,403);
    assert.equal((await fetch(origin+'/api/ai/session',{headers:{'X-Tagebuch-Client':'1',Origin:'https://foreign.test'}})).status,403);
    const session=await(await fetch(origin+'/api/ai/session',{headers:{'X-Tagebuch-Client':'1'}})).json();
    const headers={'X-Tagebuch-Client':'1','X-Tagebuch-Token':session.token,'Content-Type':'application/json'};
    const post=(path,data,h=headers)=>fetch(origin+'/api/ai/'+path,{method:'POST',headers:h,body:JSON.stringify(data)});
    assert.equal((await post('setup',{model:'qwen3:4b-instruct-2507-q4_K_M'},{...headers,'X-Tagebuch-Token':'wrong'})).status,403);
    assert.equal((await post('setup',{model:'remote:cloud'})).status,400);assert.equal(provisions,0);
    for(let repeat=0;repeat<2;repeat++){
      assert.equal((await post('setup',{model:'qwen3:4b-instruct-2507-q4_K_M'})).status,202);
      let status;
      for(let n=0;n<100;n++){
        status=await(await fetch(origin+'/api/ai/status',{headers})).json();if(!status.busy) break;
        await new Promise(ok=>setTimeout(ok,10));
      }
      assert.equal(status.phase,'ready',status.message);assert.equal(status.installed,true);
    }
    assert.equal(provisions,1);assert.equal(spawns,1);
    const count=sent.length;assert.equal((await post('ollama/api/chat',{model:'x:cloud'})).status,400);assert.equal(sent.length,count);
    assert.deepEqual(await(await post('ollama/api/tags',{})).json(),{models:[{name:'qwen3:4b-instruct-2507-q4_K_M'}]});
    assert.equal((await post('ollama/api/ps',{}, {...headers,'X-Tagebuch-Token':'wrong'})).status,403);
    assert.equal((await post('ollama/api/ps',{})).status,200);
    assert.equal(sent.at(-1).options.method,'GET');
    assert.ok(sent.at(-1).url.endsWith('/api/ps'));
    assert.equal((await post('ollama/api/delete',{model:'qwen3:4b-instruct-2507-q4_K_M'})).status,404);
  }finally{server.stopAi();await new Promise(ok=>server.close(ok));}
  assert.equal(kills,1);
}));
