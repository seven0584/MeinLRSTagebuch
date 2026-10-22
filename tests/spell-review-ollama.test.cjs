const test=require('node:test');
const assert=require('node:assert/strict');
const Ollama=require('../Dev/app/ollama.js');
const Review=require('../Dev/app/spell-review.js');
const text='Susi besucht meine oma. Ich habe ein geefühl.';
const candidates=[{id:0,start:0,word:'Susi',correction:'Susie'},{id:1,start:text.indexOf('oma'),word:'oma',correction:'Oma'},{id:2,start:text.indexOf('geefühl'),word:'geefühl',correction:'Gefühl'}];
const valid={decisions:[{id:0,verdict:'name',correction:''},{id:1,verdict:'error',correction:'Oma'},{id:2,verdict:'error',correction:'Gefühl'}],additional:[]};
const show={details:{},model_info:{},capabilities:['completion'],thinking:{values:[true,false]}};
function factory(execution,respond,extra={}){
  const chats=[];
  const provider=Ollama.createProvider({model:'local',execution,...extra,fetchImpl:async(url,options)=>{
    if(url.endsWith('/api/show')) return {ok:true,json:async()=>show};
    chats.push({body:JSON.parse(options.body),signal:options.signal});
    return respond(chats.length,chats.at(-1));
  }});
  return {provider,chats};
}
const response=content=>({ok:true,json:async()=>({message:{content:JSON.stringify(content)}})});

test('context review sends only its bounded schema and preserves names separately from corrections',async()=>{
  const {provider,chats}=factory('cpu',()=>response(valid));
  assert.deepEqual(await provider.review(text,candidates),Review.validateReply(valid,Review.buildRequest(text,candidates)));
  const request=chats[0].body;
  assert.deepEqual(JSON.parse(request.messages[1].content),Review.buildRequest(text,candidates));
  assert.equal(request.messages[0].content,Review.INSTRUCTIONS);
  assert.deepEqual(request.format,Review.REPLY_SCHEMA);
  assert.equal(request.options.num_gpu,0);
  assert.equal(request.think,false);
  assert.equal(request.stream,false);
});

test('review never sends more context than buildRequest permits',async()=>{
  const longText=text+' '+('Ein weiterer Satz. '.repeat(200));
  const {provider,chats}=factory('cpu',()=>response(valid));
  await provider.review(longText,candidates);
  assert.ok(JSON.parse(chats[0].body.messages[1].content).text.length<=1800);
});

test('invalid review IDs trigger one automatic CPU retry and successful CPU is remembered by later explanation',async()=>{
  const {provider,chats}=factory('auto',count=>response(count===1?{decisions:[{id:'invented',verdict:'error',correction:'Hallo'}],additional:[]}:count===2?valid:{assessment:'needsChange',explanation:'Schreibe Oma bitte groß.',question:'',suggestion:'Oma'}));
  await provider.review(text,candidates);
  await provider.explain({sentence:'Meine oma kommt.',target:'oma',mode:'solution'});
  assert.deepEqual(chats.map(chat=>chat.body.options.num_gpu),[undefined,0,0]);
  assert.deepEqual(chats[0].body.messages,chats[1].body.messages);
});

test('CPU review rejects malformed, truncated, repeated and invalid-position answers without retry',async()=>{
  for(const bad of ['json','length','ids','position']){
    const {provider,chats}=factory('cpu',()=>bad==='json'?{ok:true,json:async()=>({message:{content:'bad JSON'}})}:bad==='length'?{ok:true,json:async()=>({done_reason:'length',message:{content:JSON.stringify(valid)}})}:response(bad==='ids'?{...valid,decisions:[{id:'unknown',verdict:'error',correction:'Wort'}]}:{...valid,additional:[{start:1,word:'unknown',correction:'Unknown'}]}));
    await assert.rejects(provider.review(text,candidates),{code:'invalid_reply'});
    assert.equal(chats.length,1);
  }
});

test('review repeated-token errors recover locally but unrelated transport failures do not retry',async()=>{
  const {provider,chats}=factory('auto',count=>count===1?{ok:false,status:500,json:async()=>({error:'token repeat limit reached'})}:response(valid));
  await provider.review(text,candidates);
  assert.deepEqual(chats.map(chat=>chat.body.options.num_gpu),[undefined,0]);
  const broken=factory('auto',()=>{throw new Error('network');});
  await assert.rejects(broken.provider.review(text,candidates),{code:'unreachable'});
  assert.equal(broken.chats.length,1);
});

test('review respects cancellation between invalid reply and fallback and rejects remote providers before sending text',async()=>{
  const controller=new AbortController();
  const {provider,chats}=factory('auto',()=>({ok:true,json:async()=>{controller.abort();return {message:{content:'invalid'}};}}));
  await assert.rejects(provider.review(text,candidates,{signal:controller.signal}),{name:'AbortError'});
  assert.equal(chats.length,1);
  let calls=0;
  for(const model of ['local:cloud','alias']){
    const remote=Ollama.createProvider({model,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({remote_host:'remote'})};}});
    await assert.rejects(remote.review(text,candidates),{code:'model_remote'});
  }
  assert.equal(calls,1);
});
