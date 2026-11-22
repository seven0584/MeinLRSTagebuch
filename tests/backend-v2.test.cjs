const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join,resolve,dirname,basename}=require('node:path');
const {EventEmitter}=require('node:events');
const {createDevServer}=require('../scripts/dev-server.cjs');
const {RELEASE}=require('../scripts/ai-runtime.cjs');

async function fixture(run){
  const directory=await fs.mkdtemp(join(tmpdir(),'tagebuch-v2-backend-'));
  const runtime=join(directory,'ai',RELEASE.version+'-x64');
  await fs.mkdir(join(runtime,'bin'),{recursive:true});
  await fs.writeFile(join(runtime,'bin','ollama.exe'),'FAKE: never executed');
  await fs.writeFile(join(runtime,'ready.json'),JSON.stringify({version:RELEASE.version,sha256:RELEASE.assets.x64.sha256}));
  const calls=[],children=[];let failure=null;
  const server=createDevServer({dataDir:directory,openai:false,aiOptions:{platform:'win32',arch:'x64',
    spawnImpl:()=>{const child=new EventEmitter();child.exitCode=null;child.kill=()=>{child.exitCode=0;child.emit('exit',0);};children.push(child);return child;},
    fetchImpl:async(url,options)=>{
      calls.push({url,options});assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\/api\//);
      if(failure)throw new Error(failure);
      if(url.endsWith('/api/pull'))return new Response('{"status":"success"}\n');
      if(url.endsWith('/api/version'))return Response.json({version:RELEASE.version});
      if(url.endsWith('/api/show'))return Response.json({details:{},model_info:{},capabilities:['completion'],thinking:{values:['low','medium','high']}});
      if(url.endsWith('/api/tags'))return Response.json({models:[{name:'gpt-oss:20b'}]});
      if(url.endsWith('/api/chat'))return Response.json({done_reason:'stop',message:{thinking:'Synthetic internal trace',content:'{"assessment":"needsChange","explanation":"Schreibe den Anfang groß.","question":"","suggestion":"Oma"}'}});
      throw new Error('Unexpected fake Ollama route '+url);
    }
  }});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  async function session(kind){return (await(await fetch(origin+'/api/'+kind+'/session',{headers:{'X-Tagebuch-Client':'1'}})).json()).token;}
  const aiToken=await session('ai'),storageToken=await session('storage');
  const request=(kind,action,body,token=kind==='ai'?aiToken:storageToken)=>fetch(origin+`/api/${kind}/${action}`,{method:body===undefined?'GET':'POST',headers:{'X-Tagebuch-Client':'1','X-Tagebuch-Token':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  try{await run({origin,directory,request,aiToken,storageToken,calls,children,fail:message=>{failure=message;}});}
  finally{server.stopAi();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('tagebuch-v2-backend-'));
    await fs.rm(directory,{recursive:true,force:true});}
}

test('Backend: gpt-oss is accepted, runs only once, and setup does not alter diary bytes',async()=>fixture(async({request,directory,children})=>{
  const file='kinder/Testkind/files/tagebuch.json',opaque='{"tagebuch":1,"iv":"synthetic","data":"unchanged encrypted fixture"}';
  assert.equal((await request('storage','write',{path:file,text:opaque})).status,200);
  for(let repeat=0;repeat<2;repeat++){
    assert.equal((await request('ai','setup',{model:'gpt-oss:20b'})).status,202);
    let status;
    for(let n=0;n<100;n++){status=await(await request('ai','status')).json();if(!status.busy)break;await new Promise(r=>setTimeout(r,10));}
    assert.equal(status.phase,'ready',status.message);
  }
  assert.equal(children.length,1);
  assert.equal(await fs.readFile(join(directory,file),'utf8'),opaque);
  assert.equal((await(await request('storage','read',{path:file})).json()).text,opaque);
}));

test('Backend: storage and AI tokens are not interchangeable and invalid setup cannot start a process',async()=>fixture(async({request,aiToken,storageToken,children})=>{
  assert.equal((await request('ai','status',undefined,storageToken)).status,403);
  assert.equal((await request('storage','read',{path:'config/familie.json'},aiToken)).status,403);
  for(const model of ['gpt-oss:20b-cloud','unknown:latest','../model'])assert.equal((await request('ai','setup',{model})).status,400);
  assert.equal(children.length,0);
}));

test('Backend: local chat preserves low thinking, structured output and CPU settings',async()=>fixture(async({request,calls})=>{
  const payload={model:'gpt-oss:20b',think:'low',stream:true,format:{type:'object',properties:{value:{type:'string'}}},options:{num_gpu:0,num_ctx:8192,num_predict:4096},messages:[{role:'user',content:'ERFUNDENER TESTSATZ'}]};
  const response=await request('ai','ollama/api/chat',payload);assert.equal(response.status,200);
  const sent=JSON.parse(calls.find(c=>c.url.endsWith('/api/chat')).options.body);
  assert.deepEqual(sent,{...payload,stream:false});
  assert.equal(calls.find(c=>c.url.endsWith('/api/chat')).options.redirect,'error');
  assert.equal((await response.json()).done_reason,'stop');
}));

test('Backend: malformed, oversized and disallowed requests do not reach inference',async()=>fixture(async({origin,request,aiToken,calls})=>{
  assert.equal((await request('ai','ollama/api/delete',{model:'gpt-oss:20b'})).status,404);
  assert.equal((await request('ai','ollama/api/chat',{model:'gpt-oss:20b-cloud'})).status,400);
  const headers={'X-Tagebuch-Client':'1','X-Tagebuch-Token':aiToken,'Content-Type':'application/json'};
  for(const body of ['{broken',JSON.stringify({model:'gpt-oss:20b',messages:[{content:'x'.repeat(33000)}]})]){
    assert.equal((await fetch(origin+'/api/ai/ollama/api/chat',{method:'POST',headers,body})).status,400);
  }
  assert.equal(calls.length,0);
}));

test('Backend: an inference failure leaves saved sections intact and returns a visible error',async()=>fixture(async({request,fail})=>{
  const path='kinder/Testkind/files/tagebuch.json';
  await request('storage','write',{path,text:'synthetic encrypted sections'});
  await request('ai','ollama/api/tags',{}); // start the fake runtime before simulating its failure
  fail('Synthetic model unavailable');
  const response=await request('ai','ollama/api/chat',{model:'gpt-oss:20b',messages:[]});
  assert.equal(response.status,400);assert.match((await response.json()).error,/Synthetic model unavailable/);
  assert.equal((await(await request('storage','read',{path})).json()).text,'synthetic encrypted sections');
}));

test('Backend: serialized writes retain both synthetic sections and isolate children',async()=>fixture(async({request,directory})=>{
  const a='kinder/A/files/tagebuch.json',b='kinder/B/files/tagebuch.json';
  const old={id:'a1',text:'Bereits gespeichert.',coins:10};
  const first=JSON.stringify({entries:[old]}),second=JSON.stringify({entries:[{id:'a2',text:'Neuer Abschnitt.',coins:12},old]});
  const writes=[request('storage','write',{path:a,text:first}),request('storage','write',{path:a,text:second})];
  for(const response of await Promise.all(writes))assert.equal(response.status,200);
  // Opaque storage does not enforce append-only content; the GUI owns this business rule.
  const result=(await(await request('storage','read',{path:a})).json()).text;
  assert.ok([first,second].includes(result),'no partial/interleaved file is valid');
  await request('storage','write',{path:a,text:second});
  await request('storage','write',{path:b,text:'other synthetic child'});
  assert.equal((await(await request('storage','read',{path:a})).json()).text,second);
  assert.equal((await(await request('storage','read',{path:b})).json()).text,'other synthetic child');
  assert.ok((await fs.readdir(join(directory,'kinder/A/files'))).every(name=>!name.endsWith('.tmp')));
}));
