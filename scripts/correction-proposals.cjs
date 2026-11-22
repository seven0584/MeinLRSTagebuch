// Scores suggestions actually shown by the application, never model prose.
const {locate}=require('./correction-quality.cjs');

function scoreProposals(entry,items=[]){
  const used=new Set();let correct=0,incorrect=0,missing=0,unexpected=0;
  for(const issue of entry.issues){
    const span=locate(entry.text,issue.target,issue.occurrence);
    const index=items.findIndex((item,i)=>!used.has(i) && item.start===span.start && item.end===span.end);
    if(index<0){missing++;continue;}
    used.add(index);const proposal=items[index].proposal;
    if(!proposal)missing++;
    else if(issue.replacements.includes(proposal))correct++;
    else incorrect++;
  }
  const allowed=(entry.allowedMarks || []).map(mark=>locate(entry.text,mark.target,mark.occurrence));
  items.forEach((item,i)=>{
    if(used.has(i) || !item.proposal)return;
    const neutral=allowed.some(span=>span.start===item.start && span.end===item.end && item.proposal===span.text);
    if(!neutral)unexpected++;
  });
  return {expected:entry.issues.length,correct,incorrect,missing,unexpected,pass:!incorrect && !missing && !unexpected};
}

function summarizeProposals(rows){
  const totals={runs:0,expected:0,correct:0,incorrect:0,missing:0,unexpected:0};
  for(const row of rows){
    const score=row.corrections?.score;if(!score)continue;totals.runs++;
    for(const field of ['expected','correct','incorrect','missing','unexpected'])totals[field]+=score[field];
  }
  return {...totals,correctRate:totals.expected?totals.correct/totals.expected:null};
}
module.exports={scoreProposals,summarizeProposals};
