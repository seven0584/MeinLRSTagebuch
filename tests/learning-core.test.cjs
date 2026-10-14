const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../app/learning-core.js');
const child=()=>({id:'test',entries:[],reward:{cfg:{entryWords:35,entrySentences:2,days:7},ledger:[]}});
const mark=(text,w,fix,fine='dopp',nth=0)=>({i:[...text.matchAll(new RegExp(w,'g'))][nth].index,w,fix,fine});
const snapshot=c=>JSON.parse(JSON.stringify(c));
test('old profiles retain settings and entries; future learning schema is never changed',()=>{
  const c=child();c.entries.push({id:'old',firstErrors:4});const before=snapshot(c);C.ensure(c);
  assert.deepEqual(c.reward,before.reward);assert.deepEqual(c.entries,before.entries);assert.equal(C.stats(c).legacy,1);
  const future={learning:{schema:22}};assert.throws(()=>C.ensure(future),/neueren/);assert.deepEqual(future,{learning:{schema:22}});
});
test('a deferral applies to one occurrence, survives reload and unrelated insertion',()=>{
  let c=child(),text='Die Sone scheint. Die Sone lacht.';
  const errors=[mark(text,'Sone','Sonne'),mark(text,'Sone','Sonne','dopp',1)];C.reconcile(c,text,errors);const id=errors[0].caseId;
  C.defer(c,id,'unknown');c=snapshot(c);
  const next='Heute regnet es. '+text,marks=[mark(next,'Sone','Sonne'),mark(next,'Sone','Sonne','dopp',1)];
  const active=C.reconcile(c,next,marks);assert.equal(active.length,1);assert.equal(C.getCase(c,id).status,'deferred');
  assert.equal(C.ensure(c).cases.length,2);
});
test('ambiguous deletion of repeated identical words cannot reuse a waiver',()=>{
  const c=child(),text='Die Sone scheint. Die Sone scheint.';const a=mark(text,'Sone','Sonne'),b=mark(text,'Sone','Sonne','dopp',1);
  C.reconcile(c,text,[a,b]);C.defer(c,a.caseId,'unknown');
  const next='Die Sone scheint.';assert.equal(C.reconcile(c,next,[mark(next,'Sone','Sonne')]).length,1);
  assert.equal(C.getCase(c,a.caseId).status,'changed');
});
test('changed context or spelling reactivates the individual occurrence',()=>{
  const c=child();let text='Die Sone scheint.',m=mark(text,'Sone','Sonne');C.reconcile(c,text,[m]);C.defer(c,m.caseId,'disagree');
  text='Die Sone lacht.';const active=C.reconcile(c,text,[mark(text,'Sone','Sonne')]);assert.equal(active.length,1);assert.equal(C.getCase(c,m.caseId).review,'unreviewed');
});
test('actual correction, deletion and accepted app errors have distinct outcomes',()=>{
  const c=child(),text='Die Sone scheint.',m=mark(text,'Sone','Sonne');C.reconcile(c,text,[m]);C.hint(c,m.caseId);C.hint(c,m.caseId);C.hintUnclear(c,m.caseId);
  C.reconcile(c,'Die Sonne scheint.',[]);let sum=C.finishDraft(c,'e1');assert.equal(sum.resolved,1);assert.equal(sum.afterHint,1);assert.equal(C.getCase(c,m.caseId).events.filter(e=>e.type==='hint').length,1);
  c.entries.push({id:'e1',learningSummary:sum});assert.throws(()=>C.review(c,m.caseId,'accepted'),/geteilt/);
  C.getCase(c,m.caseId).shared=true;C.review(c,m.caseId,'accepted');assert.equal(C.stats(c).summary.accepted,1);assert.equal(c.entries[0].learningSummary.accepted,1);
  C.review(c,m.caseId,'confirmed');assert.equal(C.stats(c).summary.accepted,0);assert.equal(C.getCase(c,m.caseId).status,'resolved');
  const d=child(),n=mark(text,'Sone','Sonne');C.reconcile(d,text,[n]);C.defer(d,n.caseId,'unknown');C.reconcile(d,'Heute regnet es.',[]);assert.equal(C.draftSummary(d).changed,1);assert.equal(C.draftSummary(d).resolved,0);
});
test('uncertain and contested cases do not produce a recommendation; repeated reviewed words do',()=>{
  const c=child(),now=Date.now();for(let n=0;n<3;n++){
    const text=['Die Sone scheint.','Die Muter kommt.','Wir komen morgen.'][n],w=['Sone','Muter','komen'][n],fix=['Sonne','Mutter','kommen'][n],m=mark(text,w,fix);
    C.reconcile(c,text,[m],'dictionary',now-(n%2)*86400000);C.defer(c,m.caseId,'disagree',true);C.finishDraft(c,'e'+n);
  }
  assert.equal(C.recommendations(c).length,0);c.learning.cases.forEach(x=>C.review(c,x.id,'confirmed'));assert.equal(C.recommendations(c).length,1);
  C.review(c,c.learning.cases[0].id,'uncertain');assert.equal(C.recommendations(c).length,0);
});
test('every offered word has an explicit sentence context and catalog examples remain correct',()=>{
  for(const [key,rule] of Object.entries(C.CATALOG)){if(!rule[4].length)continue;
    for(const it of C.materials(key,'words').items){assert(it.context?.includes(it.word),key+': '+it.word);}
    assert(C.materials(key,'text').items.length>=8);assert(C.materials(key,'text').items.length<=16);
  }
  assert.match(C.catalog('ss').hint,/Eis, Haus, Gras/);assert.match(C.catalog('gross').hint,/beim Spielen/);assert.match(C.catalog('auslassung').hint,/mehreren Buchstaben/);assert.match(C.catalog('dopp').hint,/Garten/);
});
test('old unclarified automatic guesses stop supplying rule hints and recommendations until rechecked',()=>{
  const c=child(),text='Ich sehe Popel.',m=mark(text,'Popel','Poppel');
  C.reconcile(c,text,[m]);const wordCase=C.getCase(c,m.caseId);
  C.defer(c,m.caseId,'disagree',true);wordCase.catalogVersion='2026-10-14.1';
  assert.equal(C.caseRule(wordCase).id,'other');assert.equal(C.stats(c).groups[0].key,'other');
  assert.equal(wordCase.category,'dopp');assert.equal(wordCase.expected,'Poppel'); // Preserve the historical observation.
  const current={i:text.indexOf('Popel'),w:'Popel',fix:null,fine:'unknown'};
  C.reconcile(c,text,[current]);assert.equal(wordCase.category,'unknown');assert.equal(wordCase.expected,null);
  assert.equal(wordCase.catalogVersion,C.CATALOG_VERSION);assert.equal(C.caseRule(wordCase).id,'unknown');
  assert.deepEqual(C.recommendations(c),[]);
  const confirmed={...wordCase,category:'dopp',catalogVersion:'old',review:'confirmed'};
  assert.equal(C.caseRule(confirmed).id,'dopp');
});
test('wrong attempts followed by correction earn a proportional share; skips earn none',()=>{
  const c=child(),t=C.assign(c,{category:'dopp',type:'words',count:3,coins:10});
  C.attempt(c,t.id,0,'komen');C.taskHint(c,t.id,0);C.attempt(c,t.id,0,t.items[0].word);C.skipTaskWord(c,t.id,1,'unknown');C.skipTaskWord(c,t.id,2,'disagree');
  assert.equal(C.settleTask(c,t.id),3);assert.equal(c.reward.ledger.length,1);assert.equal(t.items[0].firstCorrect,false);
  assert.equal(C.settleTask(c,t.id),0);assert.equal(C.settleTask(snapshot(c),t.id),0);
  C.attempt(c,t.id,1,t.items[1].word);assert.equal(C.settleTask(c,t.id),3);C.attempt(c,t.id,2,t.items[2].word);assert.equal(C.settleTask(c,t.id),4);assert.equal(t.paid,10);
  assert.equal(c.reward.ledger.reduce((s,l)=>s+l.amount,0),10);assert.equal(C.stats(c).summary.resolved,3);
});
test('empty or mere clicked answers cannot earn coins, including parental acceptance',()=>{
  const c=child(),t=C.assign(c,{category:'ie',count:2,coins:20});assert.throws(()=>C.attempt(c,t.id,0,'   '));assert.throws(()=>C.settleTask(c,t.id));
  C.skipTaskWord(c,t.id,0,'disagree');C.skipTaskWord(c,t.id,1,'unknown');assert.throws(()=>C.review(c,t.items[0].caseId,'accepted'),/keine eigene Antwort/);assert.equal(C.settleTask(c,t.id),0);
});
test('later parent acceptance adds once, reversal never deducts or double-pays',()=>{
  const c=child(),t=C.assign(c,{category:'ie',count:2,coins:11});C.attempt(c,t.id,0,'zulässig');C.skipTaskWord(c,t.id,0,'disagree');C.skipTaskWord(c,t.id,1,'unknown');C.settleTask(c,t.id);
  C.review(c,t.items[0].caseId,'accepted');assert.equal(t.paid,5);C.review(c,t.items[0].caseId,'accepted');assert.equal(c.reward.ledger.length,1);
  C.review(c,t.items[0].caseId,'confirmed');assert.equal(t.paid,5);C.review(c,t.items[0].caseId,'accepted');assert.equal(c.reward.ledger.length,1);
});
test('closed task snapshot keeps agreed material and coins; ledger guards a stale paid marker',()=>{
  const c=child(),t=C.assign(c,{category:'fvw',count:1,coins:9});c.learning.defaultCoins=200;
  C.attempt(c,t.id,0,'Vogel');C.settleTask(c,t.id);t.paid=0;assert.equal(C.settleTask(c,t.id),0);assert.equal(t.paid,9);
  C.settleTask(c,t.id,true);assert.throws(()=>C.attempt(c,t.id,0,'Vogel'));assert.equal(t.maxCoins,9);
});
test('short dictation preserves adjacent wrong first attempts and compares uppercase explicitly',()=>{
  const c=child(),t=C.assign(c,{category:'ie',type:'text',coins:20}),ws=t.items.map(x=>x.word);ws[1]='Bine';ws[2]='fligt';C.submitText(c,t.id,ws.join(' '));
  assert.equal(t.items[1].attempts[0].value,'Bine');assert.equal(t.items[2].attempts[0].value,'fligt');assert.equal(t.items[1].status,'review');
  assert.throws(()=>C.settleTask(c,t.id));for(let i=0;i<t.items.length;i++){if(t.items[i].status==='review')C.skipTaskWord(c,t.id,i,'unknown');}
  const expected=Math.floor(20*(t.items.length-2)/t.items.length);assert.equal(C.settleTask(c,t.id),expected);
});
test('text dictation extra and missing words cannot inflate reward',()=>{
  const c=child(),t=C.assign(c,{category:'gross',type:'text',coins:25});C.submitText(c,t.id,t.text+' Bonus Bonus Bonus.');assert.equal(t.extraWords,3);assert.equal(C.settleTask(c,t.id),25);
  const d=child(),u=C.assign(d,{category:'gross',type:'text',coins:25});C.submitText(d,u.id,u.items.slice(1).map(x=>x.word).join(' '));assert.equal(u.items[0].status,'review');C.skipTaskWord(d,u.id,0,'unknown');assert(C.settleTask(d,u.id)<25);
});
test('profiles, save/load roundtrips, zero coins and invalid budgets',()=>{
  const a=child(),b=child();const t=C.assign(a,{category:'ae',count:1,coins:0});C.attempt(a,t.id,0,t.items[0].word);assert.equal(C.settleTask(a,t.id),0);assert.equal(C.ensure(b).tasks.length,0);assert.deepEqual(snapshot(a).learning,a.learning);
  for(const coins of [-1,1.5,10001,NaN])assert.throws(()=>C.assign(a,{category:'ie',coins}));
});
test('a checked alternative correction replaces an uncertain proposed reference without inventing a deletion success',()=>{
 const c=child(),text='Die Sone scheint.',m=mark(text,'Sone',null,'other');C.reconcile(c,text,[m]);C.defer(c,m.caseId,'unknown');
 C.reconcile(c,'Die Sonne scheint.',[],'dictionary',Date.now(),[{caseId:m.caseId,word:'Sonne',category:'dopp'}]);assert.equal(C.draftSummary(c).resolved,1);assert.equal(C.getCase(c,m.caseId).category,'dopp');
});
test('an accepted in-progress answer can complete a task and earn its share once',()=>{
 const c=child(),t=C.assign(c,{category:'ie',count:1,coins:8});C.attempt(c,t.id,0,'zulässige Variante');C.review(c,t.items[0].caseId,'accepted');assert.equal(C.settleTask(c,t.id),8);assert.equal(C.settleTask(c,t.id),0);
});
test('editing is allowed only before a task is begun; rewards are frozen afterwards',()=>{
 const c=child(),t=C.assign(c,{category:'ie',count:2,coins:8}),id=t.id;C.editTask(c,id,{category:'dopp',count:1,coins:3});assert.equal(t.id,id);assert.equal(c.learning.tasks.length,1);assert.equal(t.items[0].word,'kommen');assert.equal(t.maxCoins,3);
 C.attempt(c,id,0,'komen');assert.throws(()=>C.editTask(c,id,{category:'ie',coins:400}),/bereits begonnen/);assert.equal(t.maxCoins,3);
});
test('a contested assessment remains a parent question after the child corrects it',()=>{
 const c=child(),t=C.assign(c,{category:'ie',count:1,coins:8});C.attempt(c,t.id,0,'Bine');C.skipTaskWord(c,t.id,0,'disagree');C.attempt(c,t.id,0,'Biene');
 assert.equal(C.stats(c).summary.resolved,1);assert.equal(C.stats(c).summary.pendingReviews,1);C.review(c,t.items[0].caseId,'confirmed');assert.equal(C.stats(c).summary.pendingReviews,0);assert.equal(C.getCase(c,t.items[0].caseId).events.at(-1).value,'Bine');
});
test('spaced review retains the word until the real 30-day review was answered',()=>{
 let level=0;for(const days of [1,3,7,14,30]){const next=C.nextReview(level,true);assert.equal(next.days,days);assert.equal(next.mastered,false);level=next.level;}
 assert.equal(C.nextReview(level,true).mastered,true);assert.deepEqual(C.nextReview(level,false),{level:0,days:0,mastered:false});
});
test('older open cases remain available for review, outside the 30-day figures',()=>{
 const c=child(),text='Die Sone scheint.',m=mark(text,'Sone','Sonne');C.reconcile(c,text,[m],'dictionary',Date.now()-40*86400000);C.defer(c,m.caseId,'unknown',true);C.finishDraft(c,'old');const data=C.stats(c);assert.equal(data.summary.total,0);assert.equal(data.olderOpen.length,1);
});
