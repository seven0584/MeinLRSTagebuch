// Pure scoring: no runtime, browser, network or model imports.
function locate(text,target,occurrence=0){
  if(!Number.isInteger(occurrence) || occurrence<0)throw new Error('Invalid occurrence');
  let start=-1;
  for(let n=0;n<=occurrence;n++){start=text.indexOf(target,start+1);if(start<0)throw new Error('Missing reference occurrence: '+target);}
  return {start,end:start+target.length,text:target};
}
function helpTasks(entry){
  return entry.help || entry.issues.map(issue=>({target:issue.target,occurrence:issue.occurrence || 0,expect:{assessments:['needsChange'],suggestions:issue.replacements}}));
}
function modelInput(entry,task){
  // Whitelist: gold spellings, rubrics and classification never enter a prompt.
  return {sentence:entry.text,target:task.target,mode:'solution',checkerHint:task.checkerHint || '',question:task.question || '',previousAttempts:task.previousAttempts || [],previousReplies:task.previousReplies || []};
}
function validateCorpus(corpus){
  if(corpus.version!==1 || !Array.isArray(corpus.cases) || !corpus.cases.length)throw new Error('Invalid corpus');
  const ids=new Set();
  for(const entry of corpus.cases){
    if(!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id))throw new Error('Invalid/duplicate case ID: '+entry.id);ids.add(entry.id);
    if(!['error','correct','ambiguous'].includes(entry.kind) || !entry.category || !entry.text?.trim() || entry.text.length>1800 || !Array.isArray(entry.issues) || !entry.rubric?.length)throw new Error('Incomplete case '+entry.id);
    if((entry.kind==='error')!==!!entry.issues.length)throw new Error('Case kind and expected errors disagree: '+entry.id);
    for(const issue of entry.issues){locate(entry.text,issue.target,issue.occurrence);if(!issue.replacements?.length)throw new Error('Missing reference correction '+entry.id);}
    for(const mark of entry.allowedMarks || [])locate(entry.text,mark.target,mark.occurrence);
    for(const task of helpTasks(entry)){
      locate(entry.text,task.target,task.occurrence);
      if(!task.expect?.assessments?.length || !Array.isArray(task.expect.suggestions) || !task.expect.suggestions.length)throw new Error('Missing explanation expectations '+entry.id);
    }
  }
  return corpus;
}
function scoreDetection(entry,{marks=[],error}={}){
  if(error)return {status:'error',error,referenceErrors:entry.issues.length,tp:0,fp:0,fn:entry.issues.length,correctControl:entry.kind==='correct',controlFalseAlarm:null};
  const expected=entry.issues.map(issue=>locate(entry.text,issue.target,issue.occurrence));
  const allowed=(entry.allowedMarks || []).map(issue=>locate(entry.text,issue.target,issue.occurrence));
  const matched=new Set();let fp=0,neutral=0;
  for(const mark of marks){
    const index=expected.findIndex((span,i)=>!matched.has(i) && span.start===mark.start && span.end===mark.end);
    if(index>=0)matched.add(index);
    else if(allowed.some(span=>span.start===mark.start && span.end===mark.end))neutral++;
    else fp++;
  }
  return {status:'ok',referenceErrors:expected.length,tp:matched.size,fp,fn:expected.length-matched.size,neutral,exactSpanMatching:true,correctControl:entry.kind==='correct',controlFalseAlarm:entry.kind==='correct'?fp>0:null};
}
function scoreHelp(task,{reply,error}={}){
  if(error || !reply)return {status:'error',error:error || 'No answer',mechanicalPass:false,manualReviewRequired:true};
  const assessment=task.expect.assessments.includes(reply.assessment);
  const suggestion=task.expect.suggestions.includes(reply.suggestion);
  const question=!task.expect.questionRequired || !!reply.question?.trim();
  return {status:'ok',assessmentPass:assessment,suggestionPass:suggestion,questionPass:question,mechanicalPass:assessment && suggestion && question,manualReviewRequired:true};
}
function summarize(rows){
  const totals={runs:rows.length,detectionErrors:0,unassessedReferenceErrors:0,modelReviewFailures:0,tp:0,fp:0,fn:0,correctControls:0,controlFalseAlarms:0,explanationAnswers:0,explanationErrors:0,mechanicalPasses:0,manualReviewRequired:true};
  for(const row of rows){
    const d=row.detection.score;
    if(d.status==='error'){totals.detectionErrors++;totals.unassessedReferenceErrors+=d.referenceErrors;}
    else{
      totals.tp+=d.tp;totals.fp+=d.fp;totals.fn+=d.fn;
      if(d.correctControl){totals.correctControls++;if(d.controlFalseAlarm)totals.controlFalseAlarms++;}
    }
    if(row.detection.modelReviewFailed)totals.modelReviewFailures++;
    for(const item of row.help){totals.explanationAnswers++;if(item.score.status==='error')totals.explanationErrors++;if(item.score.mechanicalPass)totals.mechanicalPasses++;}
  }
  return {...totals,precision:totals.tp+totals.fp?totals.tp/(totals.tp+totals.fp):null,recall:totals.tp+totals.fn?totals.tp/(totals.tp+totals.fn):null,controlFalseAlarmRate:totals.correctControls?totals.controlFalseAlarms/totals.correctControls:null,explanationMechanicalRate:totals.explanationAnswers?totals.mechanicalPasses/totals.explanationAnswers:null};
}
module.exports={locate,helpTasks,modelInput,validateCorpus,scoreDetection,scoreHelp,summarize};
