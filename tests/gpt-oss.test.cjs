const test=require('node:test');
const assert=require('node:assert/strict');
const Ollama=require('../Dev/app/ollama.js');
const Tutor=require('../Dev/app/lernhilfe.js');
const catalog=require('../Dev/app/model-catalog.js');
const input={sentence:'Meine oma kommt.',target:'oma',mode:'solution'};
const reply={assessment:'needsChange',explanation:'Schreibe den Anfang groß.',question:'',suggestion:'Oma'};

test('gpt-oss is downloadable and named low reasoning supports help, review and mood without exposing thinking',async()=>{
  assert.ok(catalog.some(model=>model.id==='gpt-oss:20b'));
  const calls=[];
  const provider=Ollama.createProvider({model:'gpt-oss:20b',fetchImpl:async(url,options)=>{
    const body=options.body?JSON.parse(options.body):{};calls.push({url,body});
    return {ok:true,json:async()=>url.endsWith('/api/show')?{details:{},model_info:{},capabilities:['completion','thinking'],thinking:{values:['low','medium','high'],default:'medium'}}:
      url.endsWith('/api/tags')?{models:[{name:'gpt-oss:20b'}]}:
      {message:{thinking:'Interne Überlegungen nicht anzeigen',content:JSON.stringify(body.format.properties.decisions?{decisions:[],additional:[]}:body.format.properties.moods?{moods:[],unclear:true}:reply)}}};
  }});
  assert.deepEqual(await provider.listModels(),['gpt-oss:20b']);
  assert.deepEqual(await Tutor.createTutor({provider}).explain(input),reply);
  assert.deepEqual(await provider.review('Meine oma kommt.',[]),{decisions:[],additional:[]});
  assert.deepEqual(await provider.mood('Ich bin müde.'),{moods:[],unclear:true});
  const chats=calls.filter(call=>call.url.endsWith('/api/chat')).map(call=>call.body);
  assert.equal(chats.length,3);
  assert.ok(chats.every(body=>body.think==='low' && body.options.num_gpu===0 && body.options.num_ctx===8192));
  assert.deepEqual(chats.map(body=>body.options.num_predict),[4096,6144,2048]);
});

test('named reasoning never bypasses local-only and completion requirements',async()=>{
  let chats=0;
  const provider=Ollama.createProvider({model:'alias',fetchImpl:async url=>{
    if(url.endsWith('/api/chat'))chats++;
    return {ok:true,json:async()=>({details:{},model_info:{},capabilities:['completion'],remote_model:'gpt-oss:20b-cloud',thinking:{values:['low','medium','high']}})};
  }});
  assert.equal((await provider.status()).code,'model_remote');
  await assert.rejects(provider.explain(input),{code:'model_remote'});assert.equal(chats,0);
});

test('a truncated gpt-oss answer stays an error even if a final JSON fragment looks valid',async()=>{
  const provider=Ollama.createProvider({model:'gpt-oss:20b',fetchImpl:async url=>({ok:true,json:async()=>url.endsWith('/api/show')?{details:{},model_info:{},capabilities:['completion'],thinking:{values:['low','medium','high']}}:{done_reason:'length',message:{thinking:'reasoning',content:JSON.stringify(reply)}}})});
  await assert.rejects(provider.explain(input),{code:'invalid_reply'});
});
