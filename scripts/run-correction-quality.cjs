// Opt-in overnight evaluation. Without --execute this file only prints a plan.
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {validateCorpus,helpTasks,modelInput,scoreDetection,scoreHelp,summarize}=require('./correction-quality.cjs');
const {scoreProposals,summarizeProposals}=require('./correction-proposals.cjs');
const root=path.resolve(__dirname,'..'),corpusFile=path.join(root,'tests/fixtures/correction-corpus.de.json');
const artifactsRoot=path.join(root,'test-results/fach');
const sha=value=>createHash('sha256').update(value).digest('hex');

function options(argv){
  const result={execute:false,correctionsOnly:false,models:['gpt-oss:20b'],execution:'cpu',repeat:1,appUrl:'http://127.0.0.1:8765',timeoutMs:180000};
  const fields={'--models':'models','--execution':'execution','--repeat':'repeat','--app-url':'appUrl','--timeout-ms':'timeoutMs','--resume':'resume','--case':'caseId','--corpus':'corpus'};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==='--execute'){result.execute=true;continue;}
    if(arg==='--corrections-only'){result.correctionsOnly=true;continue;}
    if(arg==='--list' || arg==='--help'){result.planOnly=true;continue;}
    if(!fields[arg] || !argv[i+1] || argv[i+1].startsWith('--'))throw new Error('Unknown/incomplete argument '+arg);
    result[fields[arg]]=argv[++i];
  }
  if(result.planOnly && result.execute)throw new Error('--list/--help cannot be combined with --execute');
  if(typeof result.models==='string')result.models=[...new Set(result.models.split(',').map(s=>s.trim()).filter(Boolean))];
  if(!result.models.length || result.models.some(m=>!/^[a-zA-Z0-9_./:-]+$/.test(m) || /(?:^|[:/.-])cloud(?:$|[:/.-])/i.test(m)))throw new Error('Only local model names are allowed');
  result.repeat=Number(result.repeat);result.timeoutMs=Number(result.timeoutMs);
  if(!Number.isInteger(result.repeat) || result.repeat<1 || result.repeat>10)throw new Error('--repeat must be 1..10');
  if(!Number.isInteger(result.timeoutMs) || result.timeoutMs<1000 || result.timeoutMs>180000)throw new Error('--timeout-ms must be 1000..180000');
  if(!['cpu','auto'].includes(result.execution))throw new Error('--execution must be cpu or auto');
  const url=new URL(result.appUrl);
  if(url.protocol!=='http:' || !['127.0.0.1','localhost'].includes(url.hostname) || url.username || url.password || url.pathname!=='/' || url.search || url.hash)throw new Error('--app-url must be a plain local HTTP origin');
  result.appUrl=url.origin;return result;
}
async function sourceFingerprint(){
  const files=['Dev/Tagebuch.html','scripts/ai-runtime.cjs','scripts/dev-server.cjs','scripts/run-correction-quality.cjs','scripts/correction-quality.cjs','scripts/correction-proposals.cjs','tests/support/v2-fixture.cjs'];
  async function walk(relative){for(const f of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
    const next=relative+'/'+f.name;if(f.isDirectory())await walk(next);else if(/\.(?:js|css)$/.test(next))files.push(next);
  }}
  await walk('Dev/app');const hash=createHash('sha256');
  for(const file of files.sort()){hash.update(file+'\0');hash.update(await fs.readFile(path.join(root,file)));}
  return hash.digest('hex');
}
async function jsonFile(file,value){const temporary=file+'.tmp';await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n');await fs.rename(temporary,file);}
function csv(value){const text=String(value??'');return '"'+(/^[=+\-@]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
async function reports(directory,rows,planned){
  const byModel={},byCategory={};
  for(const model of new Set(rows.map(r=>r.model)))byModel[model]=summarize(rows.filter(r=>r.model===model));
  for(const category of new Set(rows.map(r=>r.category)))byCategory[category]=summarize(rows.filter(r=>r.category===category));
  const totals=summarize(rows),proposals=summarizeProposals(rows);
  await jsonFile(path.join(directory,'summary.json'),{completed:rows.length,planned,complete:rows.length===planned,automaticReleaseApproval:false,manualReviewRequired:true,totals,proposals,byModel,byCategory});
  const lines=[['Modell','Wiederholung','Fall','Kategorie','Testsatz','Markiertes Wort','Prüfhinweis','Bedeutungsklärung','Vorherige Versuche','Vorherige Erklärungen','Erwartete Bewertungen','Erwartete Vorschläge','Tatsächliche Bewertung','Tatsächlicher Vorschlag','Erklärung','Rückfrage','Fehler','Rohantwort bei Ablehnung','Manuelle Kriterien','Fachlich richtig (ja/nein)','Kindgerecht (ja/nein)','Regel passend (ja/nein)','Unbegründete Sicherheit (ja/nein)','Notiz']];
  for(const row of rows)for(const item of row.help)lines.push([row.model,row.repeat,row.caseId,row.category,row.text,item.input.target,item.input.checkerHint,item.input.question,item.input.previousAttempts.join('\n'),item.input.previousReplies.join('\n'),item.expect.assessments.join(' / '),JSON.stringify(item.expect.suggestions),item.reply?.assessment,item.reply?.suggestion,item.reply?.explanation,item.reply?.question,item.error,item.calls.map(c=>c.finalAnswer || '').join('\n'),row.rubric.join(' '),'','','','','']);
  await fs.writeFile(path.join(directory,'manual-review.csv'),'\ufeff'+lines.map(row=>row.map(csv).join(';')).join('\r\n')+'\r\n');
  const percent=value=>value===null?'nicht messbar':(value*100).toFixed(1)+' %';
  await fs.writeFile(path.join(directory,'report.md'),[
    '# Fachtest Korrektur', '',`${rows.length} von ${planned} Fallläufen abgeschlossen. Keine automatische fachliche Freigabe.`,
    '',`- Markierungen: ${totals.tp} richtige Treffer, ${totals.fp} zusätzliche Markierungen, ${totals.fn} übersehene Referenzstellen.`,
    `- Präzision (exakte Textstellen): ${percent(totals.precision)}; Erkennungsrate: ${percent(totals.recall)}.`,
    `- Fehlalarmrate bei ${totals.correctControls} auswertbaren, vollständig korrekten Kontrollsätzen: ${percent(totals.controlFalseAlarmRate)}.`,
    `- Nicht auswertbare Kontrollläufe: ${totals.detectionErrors}; dabei ungeprüfte Referenzstellen: ${totals.unassessedReferenceErrors}.`,
    `- Fehlgeschlagene zusätzliche KI-Prüfungen mit möglichem Wörterbuch-Rückfall: ${totals.modelReviewFailures}.`,
    `- Angezeigte Korrekturvorschläge: ${proposals.correct}/${proposals.expected} richtig; ${proposals.incorrect} falsch, ${proposals.missing} fehlend, ${proposals.unexpected} unerwartet. Diese Quote bewertet keine Erklärungen.`,
    `- Erklärungen/Vorschläge: ${totals.mechanicalPasses}/${totals.explanationAnswers} bestehen die formalen Referenzkriterien; ${totals.explanationErrors} wurden technisch oder vom Antwortvertrag abgelehnt.`,
    '', '## Fachliche Nachsicht offen', '',
    'Die automatische Auswertung prüft Markierungspositionen, Bewertungen und konkrete Vorschläge. Sie beweist keine richtige oder kindgerechte Erklärung. Alle Erklärungen und Rückfragen anhand der Kriterien in manual-review.csv prüfen. Auch formal passende Antworten können eine falsche Regel enthalten.',
    '', 'Unbekannte Namen dürfen die im Korpus ausdrücklich erlaubte Rückfragemarkierung erhalten; diese zählt weder als Fehlerfund noch als Fehlalarm. Breite oder verschobene Markierungen zählen nicht als exakter Treffer.',
    '', 'Die Satzzeichenfälle bewerten die gesamte App einschließlich lokaler Regeln. Ollamas Wortprüfung allein hat keinen vollständigen Grammatikauftrag. Getestet werden kurze Texte bis 1.800 Zeichen, keine allgemeine Abdeckung langer Texte.',
    '', 'Messwerte und tatsächliche Antworten stehen in results.jsonl; Konfiguration, Quellstand und Modelldigests in manifest.json. Wiederholungen sind keine unabhängigen pädagogischen Stichproben.'
  ].join('\n')+'\n');
  return {...totals,proposals};
}

async function main(argv=process.argv.slice(2)){
  const config=options(argv),selectedCorpus=config.corpus?path.resolve(root,config.corpus):corpusFile;
  const rawCorpus=await fs.readFile(selectedCorpus,'utf8'),corpus=validateCorpus(JSON.parse(rawCorpus));
  const cases=config.caseId?corpus.cases.filter(c=>c.id===config.caseId):corpus.cases;
  if(!cases.length)throw new Error('Unknown --case ID');
  const planned=cases.length*config.models.length*config.repeat;
  const corpusName=path.relative(root,selectedCorpus).split(path.sep).join('/');
  const plan={mode:config.execute?'execute':'plan-only',corpus:corpusName,correctionsOnly:config.correctionsOnly,models:config.models,executionRequested:config.execution,repeat:config.repeat,cases:cases.length,applicationChecks:planned,explanationCalls:config.correctionsOnly?0:cases.reduce((n,c)=>n+helpTasks(c).length,0)*config.models.length*config.repeat,caseIds:cases.map(c=>c.id)};
  console.log(JSON.stringify(plan,null,2));
  if(!config.execute){console.log('Nicht gestartet. Für einen bewussten Nachtlauf --execute ergänzen.');return;}

  // Model access and Playwright are reachable only after the explicit opt-in above.
  const stop=new AbortController();const interrupt=()=>stop.abort();
  process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
  const controllers=new Set();let server,browser,directory,locked=false;
  const {chromium}=require('playwright'),{createDevServer}=require('./dev-server.cjs');
  const {makeFamily,openChild}=require('../tests/support/v2-fixture.cjs');
  try{
    const sessionResponse=await fetch(config.appUrl+'/api/ai/session',{headers:{'X-Tagebuch-Client':'1'},signal:AbortSignal.any([stop.signal,AbortSignal.timeout(10000)])});
    if(!sessionResponse.ok)throw new Error('Start the local diary app first');
    const session=await sessionResponse.json();
    const api=async(endpoint,body,timeout=15000)=>{
      const response=await fetch(config.appUrl+'/api/ai/'+endpoint,{method:body===undefined?'GET':'POST',headers:{'X-Tagebuch-Client':'1','X-Tagebuch-Token':session.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.any([stop.signal,AbortSignal.timeout(timeout)])});
      const data=await response.json();if(!response.ok)throw new Error(data.error || 'HTTP '+response.status);return data;
    };
    const status=await api('status');if(status.busy || !status.installed)throw new Error('Ollama setup must be complete and idle; this runner never downloads a model');
    const tags=await api('ollama/api/tags',{}),models=[];
    for(const name of config.models){
      const tag=tags.models?.find(m=>m.name===name);if(!tag)throw new Error('Model not installed: '+name);
      const details=await api('ollama/api/show',{model:name});
      if(tag.remote_model || tag.remote_host || details.remote_model || details.remote_host || !details.capabilities?.includes('completion'))throw new Error('Model must be local and support completion: '+name);
      models.push({name,digest:tag.digest || null,details:details.details,thinking:details.thinking,capabilities:details.capabilities});
    }
    const signature={corpusHash:sha(rawCorpus),sourceHash:await sourceFingerprint(),node:process.version,models,execution:config.execution,repeat:config.repeat,caseIds:cases.map(c=>c.id),timeoutMs:config.timeoutMs,correctionsOnly:config.correctionsOnly};
    await fs.mkdir(artifactsRoot,{recursive:true});
    directory=config.resume?path.resolve(root,config.resume):path.join(artifactsRoot,new Date().toISOString().replaceAll(':','-')+'-'+randomUUID().slice(0,8));
    if(!directory.startsWith(artifactsRoot+path.sep))throw new Error('Resume directory must be below test-results/fach');
    let rows=[];
    if(config.resume){
      const manifest=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
      if(JSON.stringify(manifest.signature)!==JSON.stringify(signature))throw new Error('Cannot resume: source, corpus, model digest or options changed');
      const journal=await fs.readFile(path.join(directory,'results.jsonl'),'utf8');
      rows=journal.split('\n').filter(Boolean).map(line=>JSON.parse(line));
    }else{
      await fs.mkdir(directory);await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({created:new Date().toISOString(),corpus:corpusName,signature,node:process.version,appUrl:config.appUrl,executionNote:config.execution==='cpu'?'CPU requested for every inference':'Automatic hardware selection; GPU use is not proven',scope:'Synthetic data, application markings and displayed corrections; optional isolated model explanations are diagnostics, never automatic pedagogical approval'},null,2),{flag:'wx'});
      await fs.writeFile(path.join(directory,'results.jsonl'),'');
    }
    await fs.writeFile(path.join(directory,'run.lock'),JSON.stringify({pid:process.pid,started:new Date().toISOString()}),{flag:'wx'});locked=true;
    console.log('Berichte: '+directory);await reports(directory,rows,planned);
    const completed=new Set(rows.map(r=>r.model+'|'+r.repeat+'|'+r.caseId));
    // This server can only serve application assets. All family state belongs to fresh test contexts.
    server=createDevServer({storage:false,ai:false,openai:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const origin='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge',headless:true});
    for(const model of config.models)for(let repeat=1;repeat<=config.repeat;repeat++)for(const entry of cases){
      stop.signal.throwIfAborted();if(completed.has(model+'|'+repeat+'|'+entry.id))continue;
      const context=await browser.newContext({viewport:{width:1280,height:960}}),page=await context.newPage();
      const calls=[],errors=[],blocked=[];let phase='bootstrap';
      const family=makeFamily({model});family.parent.learningHelp.execution=config.execution;
      await context.addInitScript(f=>localStorage.setItem('schreibheft-v1',JSON.stringify(f)),family);
      page.on('pageerror',error=>errors.push(error.message));
      await context.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.origin!==origin){blocked.push(url.origin);await route.abort();return;}
        if(!url.pathname.startsWith('/api/ai/')){await route.continue();return;}
        const endpoint=url.pathname.slice('/api/ai/'.length);
        if(!['session','status','ollama/api/tags','ollama/api/show','ollama/api/chat','ollama/api/ps'].includes(endpoint))throw new Error('Unexpected test route '+endpoint);
        if(endpoint==='session'){await route.fulfill({json:session});return;}
        const body=request.postData()?request.postDataJSON():undefined,start=performance.now(),controller=new AbortController();controllers.add(controller);
        try{
          const signal=AbortSignal.any([controller.signal,stop.signal,AbortSignal.timeout(config.timeoutMs+5000)]);
          const response=await fetch(config.appUrl+url.pathname,{method:request.method(),headers:{'X-Tagebuch-Client':'1','X-Tagebuch-Token':session.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal});
          const result=await response.json();
          if(endpoint==='ollama/api/chat')calls.push({phase,model:body.model,think:body.think,options:body.options,input:JSON.parse(body.messages[1].content),promptHash:sha(body.messages[0].content),httpStatus:response.status,elapsedMs:performance.now()-start,loadMs:(result.load_duration || 0)/1e6,doneReason:result.done_reason,finalAnswer:result.message?.content || '',error:result.error});
          await route.fulfill({status:response.status,json:result});
        }catch(error){
          calls.push({phase,error:error.message,elapsedMs:performance.now()-start});
          await route.fulfill({status:502,json:{error:'Fachtest-Verbindung: '+error.message}}).catch(()=>{});
        }finally{controllers.delete(controller);}
      });
      const row={caseId:entry.id,category:entry.category,kind:entry.kind,model,repeat,text:entry.text,rubric:entry.rubric,started:new Date().toISOString(),detection:{},help:[]};
      try{
        await page.goto(origin);await page.waitForFunction(()=>window.__test?.ready(),null,{timeout:75000});await openChild(page);
        phase='application-check';let started=performance.now();
        try{
          await page.locator('#ta').fill(entry.text);await page.locator('#checkBtn').click();
          await page.locator('#finishToday').waitFor({timeout:config.timeoutMs+15000});
          const marks=await page.locator('.editor-backdrop').evaluate(backdrop=>{
            let start=0;const marks=[];for(const node of backdrop.childNodes){const text=node.textContent || '';if(node.nodeType===1 && node.classList.contains('inline-mark'))marks.push({start,end:start+text.length,text});start+=text.length;}return marks;
          });
          const resultText=await page.locator('#result').innerText();
          row.detection={marks,elapsedMs:performance.now()-started,modelReviewFailed:resultText.includes('KI-Prüfung konnte nicht abgeschlossen'),resultText};
          if(await page.locator('#ta').inputValue()!==entry.text)row.detection.error='Application modified the original input';
        }catch(error){row.detection={error:error.message,elapsedMs:performance.now()-started};}
        row.detection.score=scoreDetection(entry,row.detection);
        const items=[];phase='displayed-correction';
        for(const [index,mark] of (row.detection.marks || []).entries()){
          const item={...mark,proposal:''};
          try{
            await page.locator('#result .err').nth(index).click();
            item.hint=await page.locator('#result .hint').innerText();
            const action=page.locator('#result [data-help=solution]');
            if(await action.count()){
              await action.click();
              const proposal=page.locator('#result .tutor-box .tutor-reply b');
              if(await proposal.count())item.proposal=await proposal.innerText();
              item.message=await page.locator('#result .tutor-box').innerText();
            }
          }catch(error){item.error=error.message;}
          items.push(item);
        }
        row.corrections={items,score:scoreProposals(entry,items)};
        if(await page.locator('#ta').inputValue()!==entry.text)row.detection.error='Displaying a correction modified the original input';
        row.detection.score=scoreDetection(entry,row.detection);
        for(const task of config.correctionsOnly?[]:helpTasks(entry)){
          stop.signal.throwIfAborted();phase='explanation';started=performance.now();const before=calls.length,input=modelInput(entry,task);
          let answer;
          try{answer=await page.evaluate(async({model,execution,input,timeout})=>{
            try{return {reply:await window.TB_OLLAMA.createProvider({model,execution}).explain(input,{signal:AbortSignal.timeout(timeout)})};}
            catch(error){return {error:error.message,errorCode:error.code || error.name};}
          },{model,execution:config.execution,input,timeout:config.timeoutMs});}
          catch(error){answer={error:error.message};}
          row.help.push({input,expect:task.expect,...answer,elapsedMs:performance.now()-started,calls:calls.slice(before),score:scoreHelp(task,answer)});
        }
      }catch(error){if(stop.signal.aborted)throw error;row.detection={error:error.message,score:scoreDetection(entry,{error:error.message})};}
      finally{await context.close();}
      stop.signal.throwIfAborted();row.calls=calls;row.browserErrors=errors;row.blockedExternalOrigins=blocked;
      await fs.appendFile(path.join(directory,'results.jsonl'),JSON.stringify(row)+'\n',{flush:true});rows.push(row);
      await reports(directory,rows,planned);console.log(`${rows.length}/${planned} ${model} #${repeat} ${entry.id}: TP=${row.detection.score.tp}, FP=${row.detection.score.fp}, FN=${row.detection.score.fn}`);
    }
    const totals=await reports(directory,rows,planned);
    if(totals.detectionErrors || totals.modelReviewFailures || totals.fp || totals.fn || totals.proposals.incorrect || totals.proposals.missing || totals.proposals.unexpected || totals.explanationErrors || totals.mechanicalPasses!==totals.explanationAnswers)process.exitCode=2;
    console.log('Lauf beendet. Erklärungen fachlich/manuell prüfen: '+directory);
  }finally{
    for(const controller of controllers)controller.abort();
    if(browser)await browser.close();
    if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
    if(locked)await fs.unlink(path.join(directory,'run.lock'));
    process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
  }
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=error.name==='AbortError'?130:1;});
module.exports={options,main};
