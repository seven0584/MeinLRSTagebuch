// Independent local checks with bounded concurrency and exact-input resume.
// Requires the portable runtime prepared by benchmark-languagetool.cjs --prepare.
const fs=require('node:fs/promises');
const {createWriteStream}=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {createHash}=require('node:crypto');
const exec=promisify(execFile),root=path.resolve(__dirname,'..');
async function freePort(){const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port;}
function resumeRows(journal,items){
  const rows=journal.split('\n').filter(Boolean).map(JSON.parse);
  return validateRows(rows,items);
}
function validateRows(rows,items){
  const expected=new Map(items.map(r=>[r.id,r.input])),seen=new Set();
  for(const row of rows){if(seen.has(row.id)||expected.get(row.id)!==row.input)throw new Error('Resume input mismatch or duplicate '+row.id);seen.add(row.id);}
  return rows;
}
function summarizeLanguage(rows,items,entries=[]){
  validateRows(rows,items);let totalHints=0,incompleteResults=0;const categories={},rules={};
  for(const row of rows){
    if(row.raw?.warnings?.incompleteResults)incompleteResults++;
    for(const match of row.raw?.matches||[]){totalHints++;const category=match.rule.category.id;categories[category]=(categories[category]||0)+1;rules[match.rule.id]=(rules[match.rule.id]||0)+1;}
  }
  const byLevel={};for(const level of [1,2]){const ids=new Set(entries.filter(e=>e.level===level).map(e=>e.id));const group=rows.filter(r=>ids.has(r.id));byLevel[level]={texts:group.length,textsWithHints:group.filter(r=>r.raw?.matches?.length).length,hints:group.reduce((n,r)=>n+(r.raw?.matches?.length||0),0)};}
  return {planned:items.length,completed:rows.length,complete:rows.length===items.length,errors:rows.filter(r=>r.error||!Array.isArray(r.raw?.matches)).length,incompleteResults,textsWithHints:rows.filter(r=>r.raw?.matches?.length).length,totalHints,categories,rules,byLevel,software:rows.find(r=>r.raw)?.raw.software,automaticPedagogicalApproval:false};
}
async function main(directory){
  if(!directory)throw new Error('Usage: node scripts/check-dictation-language.cjs test-results/dictations/RUN');
  directory=path.resolve(root,directory);
  const allowed=path.join(root,'test-results/dictations')+path.sep;
  if(!directory.startsWith(allowed))throw new Error('Audit directory must be below test-results/dictations');
  const raw=await fs.readFile(path.join(directory,'corpus.json'),'utf8'),items=JSON.parse(raw);
  if(!Array.isArray(items)||!items.length||items.some(i=>typeof i.id!=='string'||typeof i.input!=='string')||new Set(items.map(i=>i.id)).size!==items.length)throw new Error('Invalid audit corpus');
  const file=path.join(directory,'languagetool-results.jsonl');
  const previous=await fs.readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
  const completed=resumeRows(previous,items),seen=new Set(completed.map(r=>r.id)),pending=items.filter(i=>!seen.has(i.id));
  const runtime=path.join(root,'tests/benchmark-artifacts/languagetool-runtime'),manifest=JSON.parse(await fs.readFile(path.join(runtime,'manifest.json'),'utf8'));
  const lock=path.join(directory,'language-check.lock');await fs.writeFile(lock,String(process.pid),{flag:'wx'});
  let server,log,writeQueue=Promise.resolve(),serverExit=null,serverError;
  try{
    const port=await freePort(),url='http://127.0.0.1:'+port,config=path.join(directory,'language-server.properties');
    await fs.writeFile(config,'# Local corpus audit: default rules, no cloud or n-grams.\n');
    log=createWriteStream(path.join(directory,'language-server.log'));
    server=spawn(manifest.java.executable,['-Xmx1024m','-cp',manifest.languagetool.jar,'org.languagetool.server.HTTPServer','--config',config,'--port',String(port)],{windowsHide:true,cwd:path.dirname(manifest.languagetool.jar),stdio:['ignore','pipe','pipe']});
    server.on('exit',code=>{serverExit=code;});server.on('error',e=>{serverError=e;});server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});
    const started=Date.now();
    while(true){
      if(serverError)throw serverError;if(serverExit!==null)throw new Error('Local LanguageTool exited '+serverExit);
      try{if((await fetch(url+'/v2/languages',{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}
      if(Date.now()-started>120000)throw new Error('Local LanguageTool startup timed out');await new Promise(r=>setTimeout(r,250));
    }
    const network=await exec('netstat.exe',['-ano','-p','TCP'],{windowsHide:true});
    const listeners=network.stdout.split(/\r?\n/).map(l=>l.trim().split(/\s+/)).filter(p=>p[0]==='TCP'&&p[1]?.endsWith(':'+port)&&Number(p.at(-1))===server.pid);
    if(!listeners.length||listeners.some(p=>!['127.0.0.1:'+port,'[::1]:'+port].includes(p[1])))throw new Error('LanguageTool must listen exclusively on loopback');
    const resultManifest={created:new Date().toISOString(),corpusHash:createHash('sha256').update(raw).digest('hex'),runtime:manifest,request:{language:'de-DE',level:'default'},concurrency:4,resumed:completed.length,planned:items.length,automaticCorrection:false,automaticPedagogicalApproval:false,listeners:listeners.map(p=>p[1]),complete:false};
    const metadata=path.join(directory,'language-check-manifest.json');await fs.writeFile(metadata,JSON.stringify(resultManifest,null,2)+'\n');
    console.log('Local LanguageTool: '+completed.length+' completed, '+pending.length+' pending, 4 independent requests at most.');
    let cursor=0,count=completed.length,errors=completed.filter(r=>r.error).length;
    async function worker(){
      while(cursor<pending.length){
        const item=pending[cursor++],start=performance.now();let row;
        try{
          const response=await fetch(url+'/v2/check',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({language:'de-DE',text:item.input,level:'default'}),signal:AbortSignal.timeout(60000)});
          const result=await response.json();if(!response.ok||!Array.isArray(result.matches))throw new Error('Local checker HTTP '+response.status);
          row={id:item.id,input:item.input,elapsedMs:performance.now()-start,raw:result};
        }catch(error){row={id:item.id,input:item.input,elapsedMs:performance.now()-start,error:error.message};errors++;}
        writeQueue=writeQueue.then(()=>fs.appendFile(file,JSON.stringify(row)+'\n'));await writeQueue;
        count++;if(count%100===0||count===items.length)console.log(count+'/'+items.length+'; request failures '+errors);
      }
    }
    await Promise.all([worker(),worker(),worker(),worker()]);await writeQueue;
    await fs.writeFile(metadata,JSON.stringify({...resultManifest,finished:new Date().toISOString(),complete:count===items.length,completed:count,errors},null,2)+'\n');
    const all=resumeRows(await fs.readFile(file,'utf8'),items);
    const entries=(await fs.readFile(path.join(directory,'dictations.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    const summary=summarizeLanguage(all,items,entries);await fs.writeFile(path.join(directory,'language-summary.json'),JSON.stringify(summary,null,2)+'\n');
    if(summary.errors||summary.incompleteResults||!summary.complete)process.exitCode=2;
  }finally{
    await writeQueue.catch(()=>{});
    if(server){server.kill();if(server.exitCode===null&&server.signalCode===null&&!serverError)await new Promise(r=>server.once('exit',r));}
    log?.end();await fs.unlink(lock);
  }
}
if(require.main===module)main(process.argv[2]).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={resumeRows,summarizeLanguage};
