const test = require('node:test');
const assert = require('node:assert/strict');
const Mood = require('../Dev/app/mood.js');

test('self-report requires one to three distinct catalogue IDs, including an honest unsure option',()=>{
  assert.deepEqual(Mood.validateSelf(['happy','sad','unsure']),['happy','sad','unsure']);
  for(const value of [[],Array(1),['happy','happy'],['unknown'],['happy','sad','calm','tired'],'happy',null]) assert.throws(()=>Mood.validateSelf(value),TypeError);
  const input=['calm'], output=Mood.validateSelf(input); output.push('sad'); assert.deepEqual(input,['calm']);
});

test('AI replies contain only bounded IDs and an explicit uncertainty flag',()=>{
  assert.deepEqual(Mood.validateAI({moods:[],unclear:true}),{moods:[],unclear:true});
  assert.deepEqual(Mood.validateAI({moods:['happy','sad'],unclear:true}),{moods:['happy','sad'],unclear:true});
  for(const value of [{moods:[],unclear:false},{moods:['diagnosis'],unclear:true},{moods:['sad','sad'],unclear:false},{moods:['sad'],unclear:'false'},{moods:['sad'],unclear:false,quote:'private text'},null]) assert.throws(()=>Mood.validateAI(value),TypeError);
});

test('request accepts only free text, bounds length, and never includes reflection or self-report data',()=>{
  assert.deepEqual(Mood.buildRequest('  Mein Tag.  '),{text:'Mein Tag.'});
  assert.equal(Mood.buildRequest('x'.repeat(2000)).text.length,1800);
  assert.throws(()=>Mood.buildRequest({free:'Mein Tag',answers:{feeling:'sad'},mood:{self:['sad']}}),TypeError);
  assert.deepEqual(Object.keys(Mood.buildRequest('abc')),['text']);
});

const entry=(date,self,ai)=>({date,mood:{self,ai}});
test('aggregation counts each emotion once per day, preserving mixed feelings and source separation',()=>{
  const rows=[entry('2026-10-22',['happy'],{status:'ready',moods:['sad'],unclear:false}),entry('2026-10-22',['happy','sad'],{status:'ready',moods:['sad','happy'],unclear:false}),entry('2026-10-21',['calm'],{status:'ready',moods:['tired'],unclear:true})];
  const result=Mood.aggregate(rows,{today:'2026-10-22',period:'all'});
  assert.equal(result.totalDaysWithEntries,2);assert.equal(result.self.days,2);assert.equal(result.self.counts.happy,1);assert.equal(result.self.counts.sad,1);assert.equal(result.self.counts.calm,1);
  assert.equal(result.ai.counts.sad,1);assert.equal(result.ai.counts.calm,0);assert.equal(result.ai.unclearDays,1);
});

test('missing, uncertain, pending and failed AI days are not neutral or invented self-reports',()=>{
  const rows=[{date:'2026-10-18'},entry('2026-10-19',[],{status:'ready',moods:[],unclear:true}),entry('2026-10-20',['unsure'],{status:'pending'}),entry('2026-10-21',null,{status:'error'}),entry('2026-10-22',['calm'],{status:'off'})];
  const result=Mood.aggregate(rows,{today:'2026-10-22'});
  assert.equal(result.totalDaysWithEntries,5);assert.equal(result.self.days,2);assert.equal(result.self.counts.unsure,1);
  assert.equal(result.ai.days,1);assert.equal(result.ai.unclearDays,1);assert.equal(result.ai.pendingDays,1);assert.equal(result.ai.errorDays,1);assert.equal(Object.values(result.ai.counts).reduce((a,b)=>a+b,0),0);
});

test('day and overall aggregation exclude invalid and future dates',()=>{
  const rows=['2025-12-28','2025-12-29','2025-12-31','2026-01-01','2026-01-02','2026-02-30','invalid'].map(date=>entry(date,['happy'],{status:'off'}));
  for(const [period,count] of [['day',1],['all',4]]) assert.equal(Mood.aggregate(rows,{today:'2026-01-01',period}).totalDaysWithEntries,count);
  assert.throws(()=>Mood.aggregate(rows,{today:'2026-02-30'}),TypeError);
  assert.throws(()=>Mood.aggregate(rows,{today:'2026-01-01',period:'year'}),TypeError);
});

test('week shows the last completed Monday-Sunday interval only after a fully covered calendar period',()=>{
  const rows=[{date:'2020-01-01'},entry('2026-10-21',['sad'],{status:'off'}),entry('2026-10-26',['happy'],{status:'off'}),entry('2026-10-28',['happy','sad'],{status:'off'}),entry('2026-11-02',['tired'],{status:'off'})];
  const partial=Mood.aggregate(rows,{period:'week',today:'2026-10-26'});
  assert.equal(partial.available,false);assert.equal(partial.unavailableReason,'incomplete_period');assert.equal(partial.availableFrom,'2026-11-02');assert.equal(partial.self.days,0);assert.equal(partial.self.counts.sad,0);
  const complete=Mood.aggregate(rows,{period:'week',today:'2026-11-02'});
  assert.equal(complete.available,true);assert.deepEqual(complete.range,{start:'2026-10-26',end:'2026-11-01'});assert.equal(complete.self.days,2);assert.equal(complete.self.percentages.happy,100);assert.equal(complete.self.percentages.sad,50);assert.equal(complete.self.counts.tired,0);
  // Starting on Monday needs only that one whole week, not a second week.
  const monday=Mood.aggregate([entry('2026-10-19',['happy'])],{period:'week',today:'2026-10-26'});
  assert.equal(monday.available,true);assert.equal(monday.availableFrom,'2026-10-26');
});

test('month shows the last completed calendar month and gates an initial partial month',()=>{
  const rows=[entry('2025-12-15',['sad']),entry('2026-01-03',['happy']),entry('2026-01-30',['happy','sad']),entry('2026-02-01',['tired'])];
  const partial=Mood.aggregate(rows,{period:'month',today:'2026-01-01'});
  assert.equal(partial.available,false);assert.equal(partial.availableFrom,'2026-02-01');assert.deepEqual(partial.range,{start:'2025-12-01',end:'2025-12-31'});assert.equal(partial.totalDaysWithEntries,0);
  const complete=Mood.aggregate(rows,{period:'month',today:'2026-02-01'});
  assert.equal(complete.available,true);assert.deepEqual(complete.range,{start:'2026-01-01',end:'2026-01-31'});assert.equal(complete.self.percentages.happy,100);assert.equal(complete.self.percentages.sad,50);
  const first=Mood.aggregate([entry('2025-12-01',['happy'])],{period:'month',today:'2026-01-01'});
  assert.equal(first.available,true);assert.equal(first.availableFrom,'2026-01-01');
});

test('daily percentages use separate recorded-day denominators without neutral imputation',()=>{
  const rows=[entry('2026-10-19',['happy'],{status:'ready',moods:['sad'],unclear:false}),entry('2026-10-19',['happy'],{status:'ready',moods:['sad'],unclear:false}),entry('2026-10-20',['happy'],{status:'pending'}),entry('2026-10-21',['sad'],{status:'ready',moods:[],unclear:true}),{date:'2026-10-22'}];
  const result=Mood.aggregate(rows,{today:'2026-10-22'});
  assert.equal(result.self.days,3);assert.equal(result.self.percentages.happy,2/3*100);assert.equal(result.self.percentages.sad,1/3*100);
  assert.equal(result.ai.days,2);assert.equal(result.ai.percentages.sad,50);assert.equal(result.ai.unclearDays,1);
  const missing=Mood.aggregate(rows,{period:'day',today:'2026-10-22'});
  assert.equal(missing.available,true);assert.equal(missing.self.percentages.happy,null);assert.equal(missing.ai.percentages.sad,null);
});

test('historical diary entries do not start mood tracking and gaps do not block a completed interval',()=>{
  const old=[{date:'2020-01-01'}];
  for(const period of ['week','month']){
    const result=Mood.aggregate(old,{period,today:'2026-10-22'});
    assert.equal(result.available,false);assert.equal(result.unavailableReason,'no_mood_data');assert.equal(result.availableFrom,null);
  }
  const gap=Mood.aggregate([entry('2026-10-05',['happy'])],{period:'week',today:'2026-10-26'});
  assert.equal(gap.available,true);assert.equal(gap.self.days,0);assert.equal(gap.self.percentages.happy,null);
  assert.equal(Mood.aggregate([],{period:'all',today:'2026-10-22'}).available,false);
  assert.equal(Mood.aggregate(old,{period:'all',today:'2026-10-22'}).available,true);
  assert.equal(Mood.aggregate([],{period:'day',today:'2026-10-22'}).available,true);
});

test('a ready day wins over duplicate pending/error statuses and malformed ready results count as errors',()=>{
  const rows=[entry('2026-10-22',['happy'],{status:'pending'}),entry('2026-10-22',['sad'],{status:'error'}),entry('2026-10-22',['calm'],{status:'ready',moods:['happy'],unclear:false}),entry('2026-10-21',[],{status:'ready',moods:['not-catalogued'],unclear:false})];
  const result=Mood.aggregate(rows,{today:'2026-10-22'});
  assert.equal(result.ai.days,1);assert.equal(result.ai.pendingDays,0);assert.equal(result.ai.errorDays,1);
  assert.equal(result.self.days,1);assert.equal(result.self.counts.happy,1);assert.equal(result.self.counts.sad,1);
});
