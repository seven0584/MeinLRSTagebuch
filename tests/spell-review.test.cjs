const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../Dev/app/spell-review.js');

test('bounded requests preserve exact positions and exclude cut words and invalid marks', () => {
  const text = 'Susi hat ein Geefühl. ' + 'a'.repeat(1900);
  const request = Review.buildRequest(text, [{i:0,w:'Susi'}, {id:5,i:13,w:'Geefühl',fix:'Gefühl'}, {id:5,i:0,w:'Susi'}, {i:1,w:'usi'}, {i:21,w:'a'.repeat(80)}, {i:0,w:'NichtSusi'}]);
  assert.ok(request.text.length <= 1800);
  assert.deepEqual(request.candidates,[{id:0,start:0,word:'Susi',correction:''},{id:5,start:13,word:'Geefühl',correction:'Gefühl'}]);
  assert.equal(Review.buildRequest('Wort', [{i:0,w:'Wort',fix:'drei neue Wörter'}]).candidates[0].correction, '');
  assert.equal(Review.buildRequest('a '.repeat(100),Array.from({length:50},(_,i)=>({i:i*2,w:'a'}))).candidates.length,20);
});

test('review accepts conservative names and partial decisions without inventing judgments', () => {
  const request = Review.buildRequest('Susi hat ein Geefühl.',[{i:0,w:'Susi'},{i:13,w:'Geefühl'}]);
  const reply = {decisions:[{id:0,verdict:'name',correction:''}],additional:[]};
  assert.deepEqual(Review.validateReply(reply,request),reply);
  assert.deepEqual(Review.validateReply({decisions:[],additional:[]},request),{decisions:[],additional:[]});
});

test('review rejects foreign ids, duplicates, invented corrections and unexpected prose', () => {
  const request = Review.buildRequest('Geefühl',[{i:0,w:'Geefühl'}]);
  const decision = {id:0,verdict:'error',correction:'Gefühl'};
  for(const decisions of [[{...decision,id:9}],[decision,decision],[{...decision,correction:'drei neue Wörter'}],[{...decision,correction:'Geefühl'}],[{...decision,verdict:'name'}],[{...decision,reason:'hi'}]]){
    assert.throws(()=>Review.validateReply({decisions,additional:[]},request),{code:'invalid_reply'});
  }
  assert.throws(()=>Review.validateReply({decisions:[decision]},request),{code:'invalid_reply'});
});

test('additional errors need exact non-overlapping full-word positions', () => {
  const request = Review.buildRequest('Susi malt einen Hunt.',[{i:0,w:'Susi'}]);
  const extra = {start:16,word:'Hunt',correction:'Hund'};
  assert.deepEqual(Review.validateReply({decisions:[],additional:[extra]},request).additional,[extra]);
  for(const additional of [[{...extra,start:15}],[{...extra,start:17,word:'unt'}],[extra,extra],[{start:0,word:'Susi',correction:'Suse'}],[{...extra,correction:'Hund!'}]]){
    assert.throws(()=>Review.validateReply({decisions:[],additional},request),{code:'invalid_reply'});
  }
});

test('Geefühl and geefühl receive exact grounded single-e hints without false noun rules', () => {
  for(const word of ['Geefühl','geefühl']){
    const reply = Review.groundedHelp({word,correction:'Gefühl'});
    assert.equal(reply.assessment,'needsChange');
    assert.match(reply.explanation,/ein e zu viel/);
    assert.doesNotMatch(reply.explanation,/Nomen|f-ü-l-l|langsam|kein richtiges Wort/);
    assert.equal(reply.suggestion,'');
    const solution = Review.groundedHelp({word,correction:'Gefühl',mode:'solution'});
    assert.equal(solution.suggestion,'Gefühl');
  }
});

test('case, names and one-letter changes are described only as verifiable differences', () => {
  assert.match(Review.groundedHelp({word:'oma',correction:'Oma'}).explanation,/großem O/);
  assert.doesNotMatch(Review.groundedHelp({word:'oma',correction:'Oma'}).explanation,/Nomen/);
  assert.equal(Review.groundedHelp({word:'Susi',correction:'Susi',kind:'name'}).assessment,'looksCorrect');
  assert.equal(Review.groundedHelp({word:'Susi',correction:'Suse',kind:'name'}),null);
  assert.match(Review.groundedHelp({word:'Hundt',correction:'Hund'}).explanation,/Buchstabe t an Position 5/);
  assert.match(Review.groundedHelp({word:'Hunt',correction:'Hund'}).explanation,/ein d/);
  assert.match(Review.groundedHelp({word:'Hun',correction:'Hund'}).explanation,/fehlt ein d an Position 4/);
  assert.doesNotMatch(Review.groundedHelp({word:'Seee',correction:'See'}).explanation,/nur einmal/);
});

test('punctuated or extensive changes are deferred instead of inventing a rule', () => {
  for(const [word,correction] of [['Schmetterling','Käfer'],['Hunt!','Hund'],['Oma-Opa','Oma'],['Haus','drei neue Häuser']]) assert.equal(Review.groundedHelp({word,correction}),null);
});

test('edit summary counts multiple letter changes and leading case separately', () => {
  assert.deepEqual(Review.editSummary('geefühl','Gefühl'),{count:2,changes:[
    {type:'case',position:1,from:'g',to:'G'},
    {type:'delete',position:2,from:'e',to:''}
  ]});
  assert.equal(Review.editSummary('geefül','Gefühl').count,3);
  assert.equal(Review.editSummary('Freint','Freund').count,2);
  assert.equal(Review.editSummary('Froint','Freund').count,3);
  assert.equal(Review.editSummary('ab','Aab').count,1);
  assert.deepEqual(Review.editSummary('Hund','Hund'),{count:0,changes:[]});
  assert.equal(Review.editSummary('zwei Wörter','Wörter'),null);
});

test('adjacent transposition counts once and has concrete letter positions', () => {
  assert.deepEqual(Review.editSummary('Fruend','Freund'),{count:1,changes:[{type:'transpose',position:3,from:'ue',to:'eu'}]});
  const reply = Review.groundedHelp({word:'Fruent','correction':'Freund'});
  assert.match(reply.explanation,/zwei Stellen/);
  assert.match(reply.explanation,/Position/);
  assert.match(reply.explanation,/vor den Änderungen/);
  assert.doesNotMatch(reply.explanation,/klingt|hörst|Nomen/);
});

test('two and three differences produce grounded hints, including umlauts', () => {
  for(const [word,correction,count] of [['Freint','Freund',2],['geefül','Gefühl',3],['Äpfle','Äpfel',1],['füle','Fühle',2],['hUnD','Hund',3]]){
    const summary=Review.editSummary(word,correction);
    assert.equal(summary.count,count);
    const reply=Review.groundedHelp({word,correction,mode:'solution'});
    assert.equal(reply.suggestion,correction);
    assert.ok(reply.explanation.length<650);
    if(count>1) assert.match(reply.explanation,new RegExp(count===2?'zwei Stellen':'drei Stellen'));
  }
  assert.deepEqual(Review.editSummary('A\u0308pfel','Äpfel'),{count:0,changes:[]});
  assert.match(Review.groundedHelp({word:'HuNdt',correction:'Hund'}).explanation,/Position 3 n statt N/);
  assert.match(Review.groundedHelp({word:'Hunt',correction:'Bunt'}).explanation,/Position 1 B statt H/);
  assert.match(Review.groundedHelp({word:'ab',correction:'Aab'}).explanation,/fehlt ein A/);
  assert.doesNotMatch(Review.groundedHelp({word:'ab',correction:'Aab'}).explanation,/großem/);
});

test('reported edits reconstruct the proposed spelling at original Unicode positions', () => {
  const words=['ab','Aab','aab','baa','Äpfel','Apfel','Öl','Oel','hUnD','Hund','geefül','Gefühl','Fruent','Freund','aaaba','baaab','füle','Fühle'];
  for(const word of words) for(const correction of words){
    const summary=Review.editSummary(word,correction);
    const letters=[...word.normalize('NFC')];
    for(const edit of [...summary.changes].reverse()){
      const position=edit.position-1,length=[...edit.from].length;
      assert.equal(letters.slice(position,position+length).join(''),edit.from);
      letters.splice(position,length,...edit.to);
    }
    assert.equal(letters.join(''),correction.normalize('NFC'),`${word} -> ${correction}`);
    assert.equal(summary.count,summary.changes.length);
  }
});

test('one-to-two word corrections preserve exact bounded syntax without widening source marks', () => {
  for(const correction of ['weißt du','weist du']){
    const request=Review.buildRequest('Sag mal, weisste das?',[{i:9,w:'weisste',fix:correction}]);
    assert.equal(request.candidates[0].correction,correction);
    const reply={decisions:[{id:0,verdict:'error',correction}],additional:[]};
    assert.deepEqual(Review.validateReply(reply,request),reply);
    const extraRequest=Review.buildRequest('weisste das?',[]);
    const extra={decisions:[],additional:[{start:0,word:'weisste',correction}]};
    assert.deepEqual(Review.validateReply(extra,extraRequest),extra);
    const hint=Review.groundedHelp({word:'weisste',correction});
    assert.match(hint.explanation,/aus einem Wort zwei Wörter/);
    assert.match(hint.explanation,/Leerzeichen/);
    assert.doesNotMatch(hint.explanation,/Nomen|immer|klingt/);
    assert.equal(hint.suggestion,'');
    assert.equal(Review.groundedHelp({word:'weisste',correction,mode:'solution'}).suggestion,correction);
    assert.equal(Review.editSummary('weisste',correction),null);
  }
  assert.match(Review.groundedHelp({word:'weisste',correction:'weißt du'}).explanation,/ß statt ss/);
  assert.doesNotMatch(Review.groundedHelp({word:'weißte',correction:'weißt du'}).explanation,/ß statt ss/);
  assert.match(Review.INSTRUCTIONS,/wissen/);
  assert.match(Review.INSTRUCTIONS,/zuweisen/);
});

test('two-word syntax rejects punctuation, line breaks, extra words and overlong components', () => {
  const request=Review.buildRequest('weisste',[{i:0,w:'weisste'}]);
  for(const correction of ['weißt du?','weißt\ndu','weißt\rdu','weißt\tdu','weißt  du',' weißt du','weißt du ','weißt du schon','a'.repeat(81),'a'.repeat(80)+' '+'b'.repeat(80)]){
    assert.equal(Review.isCorrection(correction),false,JSON.stringify(correction));
    assert.throws(()=>Review.validateReply({decisions:[{id:0,verdict:'error',correction}],additional:[]},request),{code:'invalid_reply'});
    assert.equal(Review.groundedHelp({word:'weisste',correction}),null);
  }
  assert.equal(Review.isCorrection('a'.repeat(80)+' '+'b'.repeat(79)),true);
  assert.equal(Review.groundedHelp({word:'Susi',correction:'Susi du',kind:'name'}),null);
});
