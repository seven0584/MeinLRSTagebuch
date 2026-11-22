const test = require('node:test');
const assert = require('node:assert/strict');
const Mood = require('../Dev/app/mood.js');
const Ollama = require('../Dev/app/ollama.js');

const details = {details:{},model_info:{},capabilities:['completion'],thinking:{values:[true,false]}};
const answer = {moods:['happy','proud'],unclear:false};
function providerWith(result, extra = {}) {
  const sent=[];
  const provider=Ollama.createProvider({model:'local-instruct',...extra,fetchImpl:async (url,options) => {
    sent.push({url,options,body:options.body?JSON.parse(options.body):null});
    return {ok:true,json:async () => url.endsWith('/api/show') ? details : result};
  }});
  return {provider,sent};
}
test('mood adapter sends only bounded free text with its own schema and local CPU defaults',async () => {
  const {provider,sent}=providerWith({message:{content:JSON.stringify(answer)}});
  const text='Ich habe heute ein Tor geschossen. '.repeat(100);
  assert.deepEqual(await provider.mood(text),Mood.validateAI(answer));
  assert.equal(provider.location,'local');
  const request=sent.at(-1);
  assert.equal(request.url,'http://127.0.0.1:11434/api/chat');
  assert.equal(request.options.credentials,'omit');
  assert.equal(request.options.redirect,'error');
  assert.deepEqual(request.body.format,Mood.REPLY_SCHEMA);
  assert.equal(request.body.think,false);
  assert.equal(request.body.options.num_gpu,0);
  assert.equal(request.body.options.num_predict,200);
  assert.equal(request.body.messages.length,2);
  assert.equal(request.body.messages[0].content,Mood.INSTRUCTIONS);
  const payload=JSON.parse(request.body.messages[1].content);
  assert.deepEqual(payload,Mood.buildRequest(text));
  assert.deepEqual(Object.keys(payload),['text']);
  assert.ok(payload.text.length<=1800);
});
test('automatic mood execution leaves hardware selection to local Ollama',async () => {
  const {provider,sent}=providerWith({message:{content:JSON.stringify(answer)}},{execution:'auto'});
  await provider.mood('Heute war schön.');
  assert.equal(Object.hasOwn(sent.at(-1).body.options,'num_gpu'),false);
  assert.equal(provider.location,'local');
});
test('cloud and remote aliases never receive diary text for mood inference',async () => {
  for(const model of ['test:cloud','local-alias']) {
    const sent=[];
    const provider=Ollama.createProvider({model,fetchImpl:async (url,options) => {
      sent.push({url,options});return {ok:true,json:async () => ({...details,remote_host:'https://remote.test'})};
    }});
    await assert.rejects(provider.mood('Privater Text.'),{code:'model_remote'});
    assert.ok(sent.every(request=>!request.url.endsWith('/api/chat')));
    assert.ok(sent.every(request=>!request.options.body.includes('Privater Text.')));
  }
});
test('mood inference rejects invalid enums, extra data, invalid JSON and truncated output',async () => {
  const invalid=[
    {message:{content:JSON.stringify({moods:['diagnosis'],unclear:false})}},
    {message:{content:JSON.stringify({...answer,explanation:'private prose'})}},
    {message:{content:'{broken'}},
    {done_reason:'length',message:{content:JSON.stringify(answer)}}
  ];
  for(const result of invalid) await assert.rejects(providerWith(result).provider.mood('Ein Text.'),{code:'invalid_reply'});
});
test('backend mood failures retain actionable errors and cancellation signal',async () => {
  const previous=globalThis.TB_LOCAL_AI;
  const controller=new AbortController();
  try {
    globalThis.TB_LOCAL_AI={supportedOrigin:true,request:async (path,body,signal) => {
      assert.equal(signal,controller.signal);
      if(path.endsWith('/api/show')) return details;
      const error=new Error('Modell hat keinen freien Speicher.');error.code='model_failed';throw error;
    }};
    await assert.rejects(Ollama.createProvider({model:'local-instruct'}).mood('Ein Text.',{signal:controller.signal}),{code:'model_failed',message:'Modell hat keinen freien Speicher.'});
  }finally {
    if(previous===undefined) delete globalThis.TB_LOCAL_AI;
    else globalThis.TB_LOCAL_AI=previous;
  }
});
