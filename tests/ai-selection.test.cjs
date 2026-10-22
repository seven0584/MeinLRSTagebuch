const test=require('node:test');
const assert=require('node:assert/strict');
const Selection=require('../Dev/app/ai-selection.js');
const Ollama=require('../Dev/app/ollama.js');
const replyFor=input=>({assessment:'needsChange',explanation:'Schreibe dieses Wort bitte anders.',question:'',suggestion:input.target==='oma'?'Oma':'Gefühl'});
const sample=(input,extra={})=>({reply:replyFor(input),elapsedMs:100,loadMs:0,vramBytes:1024,...extra});

test('comparison runs the same two synthetic probes sequentially per model and hardware, disables fallback, and selects the fastest valid mean',async()=>{
  const calls=[],configs=[],progress=[];
  let active=0;
  const result=await Selection.compare({models:['a','b'],onProgress:event=>progress.push(event),providerFactory:config=>{
    configs.push(config);
    return {location:'local',measure:async input=>{
      assert.equal(++active,1);
      calls.push({...config,input});
      await new Promise(resolve=>setImmediate(resolve));
      active--;
      return sample(input,{elapsedMs:config.model==='b'?20:config.execution==='cpu'?60:100,loadMs:10});
    }};
  }});
  assert.equal(calls.length,8);
  assert.deepEqual(calls.map(call=>call.input.target),['oma','geefühl','oma','geefühl','oma','geefühl','oma','geefühl']);
  assert.ok(calls.every(call=>!Object.hasOwn(call.input,'expected')));
  assert.ok(configs.every(config=>config.allowCpuFallback===false));
  assert.deepEqual(result.winner,{model:'b',execution:'auto',averageMs:10});
  assert.equal(result.results.length,4);
  assert.equal(progress.filter(event=>event.phase==='probe').length,8);
  assert.equal(progress.filter(event=>event.phase==='complete').length,4);
});

test('wrong corrections, invalid replies and unconfirmed GPU are ineligible while other pairs continue',async()=>{
  const result=await Selection.compare({models:['wrong','junk','cpu-only','good'],providerFactory:({model,execution})=>({location:'local',measure:async input=>{
    if(model==='wrong') return sample(input,{reply:{...replyFor(input),suggestion:'falsch'}});
    if(model==='junk') return sample(input,{reply:{...replyFor(input),explanation:'bad'}});
    if(model==='cpu-only') return sample(input,{vramBytes:0});
    return sample(input,{elapsedMs:200});
  }})});
  assert.equal(result.results[0].error,'quality_failed');
  assert.equal(result.results[2].error,'invalid_reply');
  assert.equal(result.results[4].error,'no_gpu');
  assert.equal(result.results[5].ok,true);
  assert.deepEqual(result.winner,{model:'cpu-only',execution:'cpu',averageMs:100});
});

test('provider failures are isolated and no valid result gives no winner',async()=>{
  const result=await Selection.compare({models:['missing','cloud'],providerFactory:({model})=>({location:model==='cloud'?'online':'local',measure:async()=>{throw Object.assign(new Error('missing'),{code:'model_missing'});}})});
  assert.equal(result.winner,null);
  assert.deepEqual(result.results.map(result=>result.error),['model_missing','model_missing','online_not_allowed','online_not_allowed']);
});

test('external cancellation interrupts a pending provider and starts no further probes',async()=>{
  let calls=0,transportSignal;
  const controller=new AbortController();
  const result=Selection.compare({models:['a','b'],signal:controller.signal,providerFactory:()=>({location:'local',measure:async(_,options)=>{
    calls++;transportSignal=options.signal;
    return new Promise(()=>{});
  }})});
  controller.abort();
  await assert.rejects(result,{name:'AbortError'});
  assert.equal(calls,1);
  assert.equal(transportSignal.aborted,true);
  await assert.rejects(Selection.compare({models:['a'],signal:controller.signal}),{name:'AbortError'});
});

test('timings subtract bounded model load time and permit an injected clock',async()=>{
  let time=0;
  const result=await Selection.compare({models:['a'],executions:['cpu'],now:()=>time+=20,providerFactory:()=>({location:'local',measure:async input=>({reply:replyFor(input),loadMs:5})})});
  assert.equal(result.winner.averageMs,15);
  const clamped=await Selection.compare({models:['a'],executions:['cpu'],providerFactory:()=>({location:'local',measure:async input=>sample(input,{elapsedMs:20,loadMs:999})})});
  assert.equal(clamped.winner.averageMs,0);
});

test('Ollama measurement preserves the requested hardware, measures load, verifies matching VRAM, and never falls back',async()=>{
  for(const execution of ['auto','cpu']){
    const requests=[];
    const provider=Ollama.createProvider({model:'local',execution,allowCpuFallback:false,fetchImpl:async(url,options)=>{
      requests.push({url,options});
      return {ok:true,json:async()=>url.endsWith('/api/show')?{details:{},model_info:{},capabilities:['completion']}:url.endsWith('/api/ps')?{models:[{name:'another',size_vram:999},{model:'local',size_vram:123}]}:{load_duration:1000000,message:{content:JSON.stringify(replyFor({target:'oma'}))}}};
    }});
    const measured=await provider.measure({sentence:'Meine oma kommt zu Besuch.',target:'oma',mode:'solution'});
    assert.equal(measured.reply.suggestion,'Oma');
    assert.ok(measured.elapsedMs>=0);
    assert.ok(measured.loadMs<=measured.elapsedMs);
    const chat=JSON.parse(requests.find(request=>request.url.endsWith('/api/chat')).options.body);
    assert.equal(chat.options.num_gpu,execution==='cpu'?0:undefined);
    if(execution==='auto'){
      assert.equal(measured.vramBytes,123);
      assert.equal(requests.at(-1).options.method,'GET');
    }else assert.ok(!requests.some(request=>request.url.endsWith('/api/ps')));
  }
  let chats=0;
  const provider=Ollama.createProvider({model:'local',execution:'auto',allowCpuFallback:false,fetchImpl:async url=>{
    if(url.endsWith('/api/chat')) chats++;
    return {ok:true,json:async()=>url.endsWith('/api/show')?{details:{},model_info:{},capabilities:['completion']}:{message:{content:'bad JSON'}}};
  }});
  await assert.rejects(provider.explain({sentence:'Meine oma kommt.',target:'oma',mode:'solution'}),{code:'invalid_reply'});
  assert.equal(chats,1);
});

test('Ollama measurement does not attribute another model GPU memory and refuses cloud before chat',async()=>{
  const provider=Ollama.createProvider({model:'local',execution:'auto',fetchImpl:async url=>({ok:true,json:async()=>url.endsWith('/api/show')?{details:{},model_info:{},capabilities:['completion']}:url.endsWith('/api/ps')?{models:[{name:'other',size_vram:123}]}:{message:{content:JSON.stringify(replyFor({target:'oma'}))}}})});
  assert.equal((await provider.measure({sentence:'Meine oma kommt.',target:'oma',mode:'solution'})).vramBytes,0);
  let calls=0;
  const cloud=Ollama.createProvider({model:'model:cloud',execution:'auto',fetchImpl:async()=>{calls++;}});
  await assert.rejects(cloud.measure({sentence:'Meine oma kommt.',target:'oma',mode:'solution'}),{code:'model_remote'});
  assert.equal(calls,0);
});
