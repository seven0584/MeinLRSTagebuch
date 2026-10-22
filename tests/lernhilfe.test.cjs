const test = require('node:test');
const assert = require('node:assert/strict');
const Tutor = require('../Dev/app/lernhilfe.js');
const Ollama = require('../Dev/app/ollama.js');
const input = { sentence:'Ich sehe den Hunt.', target:'Hunt', checkerHint:'Rechtschreibung', mode:'hint' };
const reply = { assessment:'needsChange', explanation:'Sag einmal Hunde. Vor dem e hörst du ein d.', question:'', suggestion:'' };
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const local = extra => ({ id:'test', location:'local', status:async () => ({ code:'ready' }), explain:async () => reply, ...extra });

test('tutor instructions contain no lexical worked example that can replace the current word',()=>{
  assert.doesNotMatch(Tutor.INSTRUCTIONS,/Ratt|Räder|Fahrrad|Du meinst dein Rad/);
  assert.match(Tutor.INSTRUCTIONS,/aktuelle markierte Stelle/);
  assert.match(Tutor.INSTRUCTIONS,/keine fremden Beispielwörter/);
});

test('no configured provider and no consent cause no provider calls', async () => {
  await assert.rejects(Tutor.createTutor().explain(input), { code:'disabled' });
  let calls = 0;
  const provider = { location:'online', status:async () => { calls++; return { code:'ready' }; } };
  await assert.rejects(Tutor.createTutor({ provider }).explain(input), { code:'online_not_allowed' });
  assert.equal(calls, 0);
});
test('local, native-device, and explicitly approved online adapters share the same contract', async () => {
  for(const location of ['local','device','online']) {
    const tutor = Tutor.createTutor({ provider:local({ location }), allowOnline:location === 'online' });
    assert.deepEqual(await tutor.explain(input), reply);
  }
});
test('invalid input and unavailable provider send no learning text', async () => {
  let calls = 0;
  const service = Tutor.createTutor({ provider:local({ status:async () => ({ code:'model_missing' }), explain:async () => { calls++; } }) });
  await assert.rejects(service.explain({ ...input, target:'Katze' }), { code:'invalid_input' });
  await assert.rejects(service.explain(input), { code:'model_missing' });
  assert.equal(calls, 0);
});
test('correction history and questions are forwarded without evaluation answers', async () => {
  let sent;
  const service = Tutor.createTutor({ provider:local({ explain:async request => { sent = request; return reply; } }) });
  await service.explain({ ...input, question:'Was heißt verlängern?', previousAttempts:['Ich sehe den Hunn.'], previousReplies:['Verlängere das Wort.'], expected:'Hund' });
  assert.equal(sent.question, 'Was heißt verlängern?'); assert.equal(sent.previousAttempts.length, 1); assert.equal(sent.expected, undefined);
});
test('only one generation can be pending', async () => {
  const answer = deferred(), service = Tutor.createTutor({ provider:local({ explain:() => answer.promise }) });
  const first = service.explain(input);
  await assert.rejects(service.explain(input), { code:'busy' }); answer.resolve(reply); await first;
});
test('cancelling while checking availability prevents generation', async () => {
  const available = deferred(); let calls = 0;
  const service = Tutor.createTutor({ provider:local({ status:() => available.promise, explain:async () => { calls++; return reply; } }) });
  const pending = assert.rejects(service.explain(input), { code:'cancelled' });
  service.cancel(); await pending; available.resolve({ code:'ready' }); await tick(); assert.equal(calls, 0);
});
test('timeout aborts transport and permits a fresh request', async () => {
  let signal, calls = 0;
  const service = Tutor.createTutor({ timeoutMs:20, provider:local({ explain:async (_, options) => {
    signal = options.signal; if(++calls === 1) return new Promise(() => {}); return reply;
  } }) });
  await assert.rejects(service.explain(input), { code:'timeout' }); assert.equal(signal.aborted, true);
  assert.deepEqual(await service.explain(input), reply);
});
test('malformed responses and uncertain answers without questions are rejected', () => {
  for(const value of [null, { ...reply, explanation:'x'.repeat(651) }, { ...reply, assessment:'unclear' }]) assert.throws(() => Tutor.validateReply(value), { code:'invalid_reply' });
});
test('massive repeated output is rejected while short pronunciation examples remain valid', () => {
  for(const field of ['explanation','question','suggestion']) {
    assert.throws(() => Tutor.validateReply({...reply,[field]:'eeeed'.repeat(field==='suggestion'?25:45)}),{code:'invalid_reply'});
  }
  assert.deepEqual(Tutor.validateReply({...reply,explanation:'Sprich hhhh: Hörst du den Anfang von Hund?'}),{...reply,explanation:'Sprich hhhh: Hörst du den Anfang von Hund?'});
});
test('single-token junk cannot count as a child-friendly explanation', () => {
  assert.throws(() => Tutor.validateReply({...reply,explanation:'neeedsChange'}),{code:'invalid_reply'});
});

test('explicit claims about another word are rejected for the current target even if that word occurs elsewhere',async()=>{
  const copied={assessment:'needsChange',explanation:'Du meinst dein Rad. Verlängere Rad zu Räder: Dann hörst du das d. Schreib deshalb Rad mit d.',question:'',suggestion:''};
  for(const target of ['weisste','hasen']){
    const request={sentence:'Mit dem Rad sehe ich '+target+'.',target,mode:'hint',previousReplies:[copied.explanation]};
    assert.throws(()=>Tutor.validateReplyForRequest(copied,request),{code:'invalid_reply'});
    await assert.rejects(Tutor.createTutor({provider:local({explain:async()=>copied})}).explain(request),{code:'invalid_reply'});
    assert.throws(()=>Tutor.validateReplyForRequest({...copied,explanation:'Schau auf dein Wort.',suggestion:'Rad'},{...request,mode:'solution'}),{code:'invalid_reply'});
  }
});

test('relevance guard permits relevant derivations, generic tips and comparison examples',()=>{
  const variants=[
    [{sentence:'Ich fahre mit meinem Ratt.',target:'Ratt',mode:'solution'}, {assessment:'needsChange',explanation:'Du meinst dein Rad. Verlängere Rad zu Räder: Dann hörst du das d.',question:'',suggestion:'Rad'}],
    [input,{...reply,explanation:'Verlängere Hund zu Hunde. Bei „Eis“ hilft dir eine andere Probe.'}],
    [{sentence:'Meine oma kommt.',target:'oma',mode:'hint'},{...reply,explanation:'Schreibe den Anfang groß.'}],
    [input,{...reply,explanation:'Verlängere das Wort zu einer längeren Form.'}],
    [{sentence:'Ich sehe die hasen.',target:'hasen',mode:'solution'},{...reply,explanation:'Schreibe Hasen hier groß.',suggestion:'Hasen'}]
  ];
  for(const [request,response] of variants)assert.deepEqual(Tutor.validateReplyForRequest(response,request),response);
});

test('solution phrases preserve spaces and German sharp-s without allowing unrelated replacements',()=>{
  for(const target of ['weisste','weisst du','weißt du']){
    const request={sentence:target+' das?',target,mode:'solution'};
    const response={...reply,explanation:'Du meinst „weißt du“. Trenne die beiden Wörter.',suggestion:'weißt du'};
    assert.deepEqual(Tutor.validateReplyForRequest(response,request),response);
  }
  assert.throws(()=>Tutor.validateReplyForRequest({...reply,explanation:'Schreibe das Wort anders.',suggestion:'Kaninchen'},{sentence:'Ich sehe hasen.',target:'hasen',mode:'solution'}),{code:'invalid_reply'});
});

test('explicit inflection starts are checked but end forms and ordinary quotations are not blanket-blocked',()=>{
  assert.throws(()=>Tutor.validateReplyForRequest({...reply,explanation:'Verlängere „Rad“ zu „Räder“. Dann hörst du den Laut.'},{sentence:'Ich sehe hasen.',target:'hasen',mode:'hint'}),{code:'invalid_reply'});
  assert.doesNotThrow(()=>Tutor.validateReplyForRequest({...reply,explanation:'Vergleiche die Endung mit „Eis“. Schau dann auf dein Wort.'},input));
});
test('standalone solution is only shown on request', async () => {
  const service = Tutor.createTutor({ provider:local({ explain:async () => ({ ...reply, suggestion:'Hund' }) }) });
  assert.equal((await service.explain(input)).suggestion, '');
  assert.equal((await service.explain({ ...input, mode:'solution' })).suggestion, 'Hund');
});
test('context is bounded and previous unrelated diary paragraphs are excluded', () => {
  const text = 'Privater vorheriger Absatz.\nIch sehe den Hunt.\nAnderer privater Absatz.';
  assert.equal(Tutor.contextForMark(text, { i:text.indexOf('Hunt'), w:'Hunt' }), 'Ich sehe den Hunt.');
  const long = 'x'.repeat(1000) + ' Hunt ' + 'y'.repeat(1000);
  assert.ok(Tutor.contextForMark(long, { i:1001, w:'Hunt' }).length <= 700);
});
test('correction history follows a single edited mark but is not shared between duplicates', () => {
  const before = 'Ich sehe den Hunt.', after = 'Ich sehe den Hunn.';
  const next = [{ i:13, w:'Hunn', cat:'Schreibung' }];
  Tutor.carryHistory([{ i:13, w:'Hunt', cat:'Schreibung' }], before, next, after);
  assert.deepEqual(next[0].helpHistory.attempts, [before]);
  const duplicate = [{ i:0,w:'Hunt',cat:'x' },{ i:5,w:'Hunt',cat:'x' }];
  Tutor.carryHistory([{i:0,w:'Hunt',cat:'x',helpHistory:{ attempts:['only first'],replies:[] }},{i:5,w:'Hunt',cat:'x'}], 'Hunt Hunt', duplicate, 'Hunt Hunt');
  assert.equal(duplicate[0].helpHistory.attempts[0], 'only first');
  assert.ok(!duplicate[1].helpHistory.attempts.includes('only first'));
});

test('replacing a marked word with an unrelated word does not transfer its explanation history',()=>{
  const previous=[{i:13,w:'Hunt',cat:'Schreibung',helpHistory:{attempts:[],replies:['Sag einmal Hunde.']}}];
  const next=[{i:13,w:'weisste',cat:'Schreibung'}];
  Tutor.carryHistory(previous,'Ich sehe den Hunt.',next,'Ich sehe den weisste.');
  assert.equal(next[0].helpHistory,undefined);
  const edited=[{i:13,w:'Hunn',cat:'Schreibung'}];
  Tutor.carryHistory(previous,'Ich sehe den Hunt.',edited,'Ich sehe den Hunn.');
  assert.deepEqual(edited[0].helpHistory.replies,['Sag einmal Hunde.']);
});
test('Ollama refuses cloud aliases and remote metadata before sending a prompt', async () => {
  for(const model of ['qwen:cloud', 'innocent-alias']) {
    const paths = [];
    const provider = Ollama.createProvider({ model, fetchImpl:async url => { paths.push(url); return { ok:true,json:async () => ({remote_model:'remote'}) }; } });
    await assert.rejects(provider.explain(input), { code:'model_remote' });
    assert.ok(paths.every(url => !url.endsWith('/api/chat')));
  }
});
test('Ollama requests use fixed loopback, validated JSON, no credentials or redirects', async () => {
  const sent = [];
  const provider = Ollama.createProvider({ model:'test:local', fetchImpl:async (url, options) => {
    sent.push({url,options}); return {ok:true,json:async () => url.endsWith('/api/show') ? {details:{},model_info:{},capabilities:['completion']} : {message:{content:JSON.stringify(reply)}}};
  } });
  assert.deepEqual(await provider.explain(input), reply);
  const request = sent.at(-1);
  assert.equal(request.url, 'http://127.0.0.1:11434/api/chat'); assert.equal(request.options.credentials,'omit'); assert.equal(request.options.redirect,'error');
  const body = JSON.parse(request.options.body); assert.equal(body.stream,false); assert.equal(body.messages.length,2);
  assert.deepEqual(JSON.parse(body.messages[1].content), Tutor.validateRequest(input));
});
test('local execution defaults to CPU compatibility and automatic execution permits GPU selection', async () => {
  for(const execution of [undefined,'cpu','auto']) {
    let chat;
    const provider = Ollama.createProvider({model:'instruct',...(execution?{execution}:{}),fetchImpl:async (url,options) => {
      if(url.endsWith('/api/chat')) chat=JSON.parse(options.body);
      return {ok:true,json:async () => url.endsWith('/api/show')?{details:{},model_info:{},capabilities:['completion']}:{message:{content:JSON.stringify(reply)}}};
    }});
    assert.equal(provider.location,'local');
    assert.deepEqual(await Tutor.createTutor({provider}).explain(input),reply);
    if(execution==='auto') assert.equal(Object.hasOwn(chat.options,'num_gpu'),false);
    else assert.equal(chat.options.num_gpu,0);
  }
});
test('Ollama excludes cloud and embedding models and maps unavailable service', async () => {
  const provider = Ollama.createProvider({model:'embed',fetchImpl:async url => ({ok:true,json:async () => url.endsWith('/api/tags') ? {models:[{name:'a'},{name:'b:cloud'},{name:'alias',remote_host:'remote'}]} : {details:{},model_info:{},capabilities:['embedding']}})});
  assert.deepEqual(await provider.listModels(), []); assert.equal((await provider.status()).code, 'unsupported_model');
  const broken = Ollama.createProvider({model:'x',fetchImpl:async () => {throw new Error('network');}});
  assert.equal((await broken.status()).code,'unreachable');
});

test('automatic execution retries unusable answers once on CPU with the same model and request', async () => {
  for(const bad of [
    null,
    {message:{content:'not JSON'}},
    {message:{content:JSON.stringify({...reply,assessment:'unknown'})}},
    {message:{content:JSON.stringify({...reply,explanation:'eeeed'.repeat(45)})}},
    {done_reason:'length',message:{content:JSON.stringify(reply)}}
  ]) {
    const chats = [], controller = new AbortController();
    const provider = Ollama.createProvider({model:'optional',execution:'auto',fetchImpl:async (url,options) => {
      if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion'],thinking:{values:[true,false]}})};
      chats.push({body:JSON.parse(options.body),signal:options.signal});
      return {ok:true,json:async () => chats.length===1 ? bad : {message:{content:JSON.stringify(reply)}}};
    }});
    assert.deepEqual(await provider.explain(input,{signal:controller.signal}),reply);
    assert.equal(chats.length,2);
    assert.equal(Object.hasOwn(chats[0].body.options,'num_gpu'),false);
    assert.equal(chats[1].body.options.num_gpu,0);
    assert.equal(chats[1].body.model,'optional');
    assert.equal(chats[1].body.think,false);
    assert.deepEqual(chats[1].body.messages,chats[0].body.messages);
    assert.equal(chats[0].signal,controller.signal);
    assert.equal(chats[1].signal,controller.signal);
  }
});

test('automatic execution recovers token repetition errors once on CPU', async () => {
  for(const error of ['prediction aborted, token repeat limit reached','repetition limit reached']) {
    const chats=[];
    const provider=Ollama.createProvider({model:'instruct',execution:'auto',fetchImpl:async (url,options) => {
      if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion']})};
      chats.push(JSON.parse(options.body));
      return chats.length===1 ? {ok:false,status:500,json:async () => ({error})} : {ok:true,json:async () => ({message:{content:JSON.stringify(reply)}})};
    }});
    assert.deepEqual(await provider.explain(input),reply);
    assert.equal(chats.length,2);
    assert.equal(chats[1].options.num_gpu,0);
  }
});

test('CPU failures and automatic execution transport or unrelated model failures are not retried', async () => {
  for(const failure of ['cpu-invalid','network','memory','cancelled']) {
    let chats=0;
    const provider=Ollama.createProvider({model:'instruct',execution:failure==='cpu-invalid'?'cpu':'auto',fetchImpl:async url => {
      if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion']})};
      chats++;
      if(failure==='network') throw new Error('offline');
      if(failure==='cancelled') throw new DOMException('cancelled','AbortError');
      if(failure==='memory') return {ok:false,status:500,json:async () => ({error:'out of memory'})};
      return {ok:true,json:async () => ({message:{content:'bad JSON'}})};
    }});
    await assert.rejects(provider.explain(input),failure==='cancelled'?{name:'AbortError'}:{code:failure==='cpu-invalid'?'invalid_reply':failure==='network'?'unreachable':'model_failed'});
    assert.equal(chats,1);
  }
});

test('automatic execution respects cancellation after an unusable answer and limits retries to one', async () => {
  for(const cancel of [true,false]) {
    let chats=0;
    const controller=new AbortController();
    const provider=Ollama.createProvider({model:'instruct',execution:'auto',fetchImpl:async url => {
      if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion']})};
      chats++;
      return {ok:true,json:async () => {if(cancel) controller.abort();return {message:{content:'bad JSON'}};}};
    }});
    await assert.rejects(provider.explain(input,{signal:controller.signal}),cancel?{name:'AbortError'}:{code:'invalid_reply'});
    assert.equal(chats,cancel?1:2);
  }
});

test('automatic execution accepts a valid answer immediately and does not retry status failures', async () => {
  for(const ready of [true,false]) {
    let chats=0,shows=0;
    const provider=Ollama.createProvider({model:'instruct',execution:'auto',fetchImpl:async url => {
      if(url.endsWith('/api/show')) {shows++;return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion'],...(!ready?{remote_host:'remote'}:{})})};}
      chats++;
      return {ok:true,json:async () => ({message:{content:JSON.stringify(reply)}})};
    }});
    if(ready) assert.deepEqual(await provider.explain(input),reply);
    else await assert.rejects(provider.explain(input),{code:'model_remote'});
    assert.equal(chats,ready?1:0);
    assert.equal(shows,1);
  }
});

test('successful CPU fallback is remembered only for this provider without changing its configuration', async () => {
  const chats=[], configuration={model:'instruct',execution:'auto'};
  const provider=Ollama.createProvider({...configuration,fetchImpl:async (url,options) => {
    if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion']})};
    chats.push(JSON.parse(options.body));
    return {ok:true,json:async () => ({message:{content:chats.length===1?'bad JSON':JSON.stringify(reply)}})};
  }});
  assert.deepEqual(await provider.explain(input),reply);
  assert.deepEqual(await provider.explain(input),reply);
  assert.deepEqual(chats.map(chat=>chat.options.num_gpu),[undefined,0,0]);
  assert.ok(chats.every(chat=>chat.model==='instruct'));
  assert.deepEqual(configuration,{model:'instruct',execution:'auto'});
});

test('valid automatic replies and unsuccessful CPU fallback do not latch CPU execution', async () => {
  for(const firstValid of [true,false]) {
    const chats=[];
    const provider=Ollama.createProvider({model:'instruct',execution:'auto',fetchImpl:async (url,options) => {
      if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion']})};
      chats.push(JSON.parse(options.body));
      return {ok:true,json:async () => ({message:{content:firstValid || chats.length>2?JSON.stringify(reply):'bad JSON'}})};
    }});
    if(firstValid) assert.deepEqual(await provider.explain(input),reply);
    else await assert.rejects(provider.explain(input),{code:'invalid_reply'});
    assert.deepEqual(await provider.explain(input),reply);
    assert.deepEqual(chats.map(chat=>chat.options.num_gpu),firstValid?[undefined,undefined]:[undefined,0,undefined]);
  }
});

test('a remembered CPU path does not retry a later invalid answer', async () => {
  const chats=[];
  const provider=Ollama.createProvider({model:'instruct',execution:'auto',fetchImpl:async (url,options) => {
    if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion']})};
    chats.push(JSON.parse(options.body));
    return {ok:true,json:async () => ({message:{content:chats.length===2?JSON.stringify(reply):'bad JSON'}})};
  }});
  assert.deepEqual(await provider.explain(input),reply);
  await assert.rejects(provider.explain(input),{code:'invalid_reply'});
  assert.deepEqual(chats.map(chat=>chat.options.num_gpu),[undefined,0,0]);
});
test('thinking-only models are excluded and never receive a learning prompt', async () => {
  const paths = [];
  const provider = Ollama.createProvider({model:'thinking',fetchImpl:async url => {
    paths.push(url);
    return {ok:true,json:async () => url.endsWith('/api/tags') ? {models:[{name:'thinking'}]} : {details:{},model_info:{},capabilities:['completion'],thinking:{values:[true]}}};
  }});
  assert.deepEqual(await provider.listModels(),[]);
  assert.equal((await provider.status()).code,'thinking_only');
  await assert.rejects(Tutor.createTutor({provider}).explain(input),{code:'thinking_only'});
  assert.ok(paths.every(url => !url.endsWith('/api/chat')));
});
test('optional thinking is disabled and instruction-only text models remain selectable', async () => {
  const sent = [];
  const provider = Ollama.createProvider({model:'optional',fetchImpl:async (url,options) => {
    const body = options.body ? JSON.parse(options.body) : {};
    sent.push({url,body});
    return {ok:true,json:async () => url.endsWith('/api/tags') ? {models:[{name:'optional'},{name:'instruct'},{name:'remote-alias'},{name:'embed'}]} :
      url.endsWith('/api/show') ? {details:{},model_info:{},capabilities:body.model==='embed'?['embedding']:['completion'],...(body.model==='optional'?{thinking:{values:[true,false]}}:{}),...(body.model==='remote-alias'?{remote_model:'cloud-model'}:{})} : {message:{content:JSON.stringify(reply)}}};
  }});
  assert.deepEqual(await provider.listModels(),['optional','instruct']);
  assert.deepEqual(await provider.explain(input),reply);
  const chat = sent.find(item => item.url.endsWith('/api/chat')).body;
  assert.equal(chat.think,false);
  assert.equal(chat.options.num_predict,900);
});
test('token repetition and truncated answers keep actionable errors without accepting partial JSON', async () => {
  for(const failure of ['repeat','length']){
    const provider = Ollama.createProvider({model:'instruct',fetchImpl:async url => {
      if(url.endsWith('/api/show')) return {ok:true,json:async () => ({details:{},model_info:{},capabilities:['completion']})};
      return failure==='repeat' ? {ok:false,status:500,json:async () => ({error:'prediction aborted, token repeat limit reached'})} : {ok:true,json:async () => ({done_reason:'length',message:{content:JSON.stringify(reply)}})};
    }});
    await assert.rejects(Tutor.createTutor({provider}).explain(input),error => {
      assert.equal(error.code,failure==='repeat'?'model_failed':'invalid_reply');
      assert.match(error.message,failure==='repeat'?/token repeat limit reached/:/abgeschnitten/);
      return true;
    });
  }
});
test('local backend errors preserve their code and explanation through the tutor contract', async () => {
  const previous = globalThis.TB_LOCAL_AI;
  try{
    globalThis.TB_LOCAL_AI = {supportedOrigin:true,request:async path => {
      if(path.endsWith('/api/show')) return {details:{},model_info:{},capabilities:['completion']};
      const error = new Error('Die lokale KI konnte nicht starten: Speicher reicht nicht.');
      error.code='model_failed'; throw error;
    }};
    await assert.rejects(Tutor.createTutor({provider:Ollama.createProvider({model:'instruct'})}).explain(input),{code:'model_failed',message:'Die lokale KI konnte nicht starten: Speicher reicht nicht.'});
  }finally{
    if(previous===undefined) delete globalThis.TB_LOCAL_AI;
    else globalThis.TB_LOCAL_AI=previous;
  }
});
test('twenty invented German cases remain independent from a mobile runtime', async () => {
  const { cases } = await import('./lernhilfe-cases.mjs'); assert.equal(cases.length,20);
  for(const entry of cases) { const clean = Tutor.validateRequest({...entry,mode:'solution'}); assert.equal(clean.expected,undefined); }
});
