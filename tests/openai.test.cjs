const test=require('node:test');
const assert=require('node:assert/strict');
const OpenAI=require('../Dev/app/openai.js');
const issue=(original,correction,extras={})=>({original,correction,occurrence:0,category:'spelling',hint:'Schau auf diese Stelle.',detail:'Hier fehlt ein Buchstabe.',...extras});
test('review input preserves text exactly and never silently truncates',()=>{
  const text='  😀 Ein Text.\n';assert.deepEqual(OpenAI.buildReviewRequest(text),{text});
  for(const value of ['',null,' '.repeat(12),'x'.repeat(12001)])assert.throws(()=>OpenAI.buildReviewRequest(value),{code:'invalid_input'});
});
test('exact repeated anchors produce DOM UTF-16 offsets and sorted issues',()=>{
  const text='😀 Lile und Lile.';
  const reply=OpenAI.validateReviewReply({issues:[issue('Lile','Lilie',{occurrence:1}),issue('Lile','Lilie')],uncertain:false},{text});
  assert.deepEqual(reply.issues.map(x=>[x.start,x.i,x.w,x.fix]),[[3,3,'Lile','Lilie'],[12,12,'Lile','Lilie']]);
});
test('punctuation anchors support insertion and deletion without fake empty spans',()=>{
  const text='Hallo Welt';assert.equal(OpenAI.validateReviewReply({issues:[issue('Welt','Welt.',{category:'punctuation'})],uncertain:false},{text}).issues[0].start,6);
  assert.equal(OpenAI.validateReviewReply({issues:[issue(',','',{category:'punctuation'})],uncertain:false},{text:'Hallo, du.'}).issues[0].fix,'');
});
test('invalid, overlapping, split-word and bisected Unicode anchors are rejected',()=>{
  const bad=[
    [issue('Lile','Lilie',{occurrence:1})], [issue('Li','Lilie')], [issue('Lile','Lile')],
    [issue('Lile','Lilie',{category:'diagnosis'})], [issue('Lile','Lilie',{occurrence:-1})],
    [issue('Lile','Lilie'),issue('Lile','Lilien')], [issue('Lile','Lilie',{hint:''})]
  ];
  for(const issues of bad)assert.throws(()=>OpenAI.validateReviewReply({issues,uncertain:false},{text:'Lile.'}),{code:'invalid_reply'});
  assert.throws(()=>OpenAI.validateReviewReply({issues:[issue('\uD83D','x')],uncertain:false},{text:'😀'}),{code:'invalid_reply'});
  assert.throws(()=>OpenAI.validateReviewReply({issues:[],uncertain:'yes'},{text:'Hallo'}),{code:'invalid_reply'});
});
test('uncertainty and valid empty issue lists are preserved',()=>{
  assert.deepEqual(OpenAI.validateReviewReply({issues:[],uncertain:true},{text:'Ein Name.'}),{issues:[],uncertain:true});
});
test('same-origin provider authenticates requests and never sends local candidate metadata',async()=>{
  const calls=[];
  const provider=OpenAI.createProvider({fetchImpl:async(url,options)=>{
    calls.push([url,options]);return {ok:true,json:async()=>url.endsWith('/session')?{token:'session-test'}:{issues:[issue('Lile','Lilie')],uncertain:false}};
  }});
  const result=await provider.review('Lile.',[{secret:'local checker metadata'}]);
  assert.equal(provider.location,'online');assert.equal(result.issues[0].fix,'Lilie');
  assert.equal(calls[0][0],'/api/openai/session');assert.equal(calls[0][1].headers['X-Tagebuch-Client'],'1');
  assert.deepEqual(JSON.parse(calls[1][1].body),{text:'Lile.'});assert.equal(calls[1][1].headers['X-Tagebuch-Token'],'session-test');
  assert.equal(calls[1][1].headers['X-Tagebuch-Client'],'1');
  assert.equal(calls[1][1].redirect,'error');assert.equal(calls[1][1].credentials,'same-origin');
});
test('configuration methods return only server data and reuse session',async()=>{
  const calls=[];const provider=OpenAI.createProvider({fetchImpl:async(url,options)=>{calls.push([url,options]);return {ok:true,json:async()=>url.endsWith('/session')?{token:'session-test'}:{ready:true,keyConfigured:true}};}});
  assert.equal((await provider.status()).code,'ready');await provider.configure({apiKey:'test-placeholder'});await provider.removeKey();await provider.test();
  assert.equal(calls.filter(([url])=>url.endsWith('/session')).length,1);
  assert.equal(calls[3][1].method,'DELETE');assert.equal(calls[4][0],'/api/openai/test');
});
test('provider propagates sanitized server errors without losing code',async()=>{
  const provider=OpenAI.createProvider({fetchImpl:async url=>url.endsWith('/session')?{ok:true,json:async()=>({token:'t'})}:{ok:false,status:429,json:async()=>({code:'rate_limit',message:'Bitte später erneut versuchen.'})}});
  await assert.rejects(provider.test(),{code:'rate_limit',message:'Bitte später erneut versuchen.'});
});
test('cloud explanation allows meaningful phrase corrections and hides solutions in hint mode',async()=>{
  const provider=OpenAI.createProvider({fetchImpl:async url=>({ok:true,json:async()=>url.endsWith('/session')?{token:'t'}:{assessment:'needsChange',explanation:'Prüfe die beiden Wörter.',question:'',suggestion:'weißt du'}})});
  const input={sentence:'Was weisste denn?',target:'weisste',mode:'solution'};
  assert.equal((await provider.explain(input)).suggestion,'weißt du');
  assert.equal((await provider.explain({...input,mode:'hint'})).suggestion,'');
});
test('malformed model output is rejected even from an authenticated backend',async()=>{
  const provider=OpenAI.createProvider({fetchImpl:async url=>({ok:true,json:async()=>url.endsWith('/session')?{token:'t'}:{issues:[issue('nicht im Text','x')],uncertain:false}})});
  await assert.rejects(provider.review('Hallo.'),{code:'invalid_reply'});
});
test('online tutor accepts a long grammar span through the full provider roundtrip while local validation stays bounded',async()=>{
  const Tutor=require('../Dev/app/lernhilfe.js');
  const target='Dieser längere Satz enthält eine ausführliche markierte Wortgruppe mit mehr als achtzig Zeichen';
  assert.ok(target.length>80 && target.length<=240);
  const input={sentence:target+'.',target,mode:'solution'};
  assert.throws(()=>Tutor.validateRequest(input),{code:'invalid_input'});
  let sent;
  const provider=OpenAI.createProvider({fetchImpl:async(url,options)=>({ok:true,json:async()=>{
    if(url.endsWith('/session'))return {token:'t'};
    if(url.endsWith('/config'))return {ready:true};
    sent=JSON.parse(options.body);return {assessment:'needsChange',explanation:'Hier kannst du die Wortgruppe anpassen.',question:'',suggestion:'Eine passende andere Wortgruppe'};
  }})});
  const tutor=Tutor.createTutor({provider,allowOnline:true});
  assert.equal((await tutor.explain(input)).suggestion,'Eine passende andere Wortgruppe');
  assert.equal(sent.target,target);
});
