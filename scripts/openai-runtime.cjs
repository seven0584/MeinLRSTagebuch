const {randomBytes,timingSafeEqual} = require('node:crypto');
const {createSecretStore} = require('./secret-store.cjs');
const Tutor = require('../Dev/app/lernhilfe.js');
const Review = require('../Dev/app/openai.js');
const MODELS=Object.freeze(['gpt-5.4','gpt-5.4-mini','gpt-4.1']);
const DEFAULT_MODEL='gpt-5.4';
const EMPTY={apiKey:'',model:DEFAULT_MODEL,enabled:false,allowChildData:false,zdrConfirmed:false};
class PublicError extends Error {constructor(status,message){super(message);this.status=status;}}
const bad=message=>new PublicError(400,message);
function createOpenAiRuntime({directory,fetchImpl=fetch,secretStore=createSecretStore({directory}),timeoutMs=90000,maxRequestsPerMinute=20}={}){
  const token=randomBytes(32).toString('hex'),controllers=new Set();let closed=false,busy=false,requests=[];
  let config={...EMPTY},loadFailure=null;
  const loading=secretStore.read().then(saved=>{if(saved){
    if(!MODELS.includes(saved.model)||typeof saved.apiKey!=='string')throw new Error();
    if(!closed)config={...EMPTY,...saved,enabled:saved.enabled===true,allowChildData:saved.allowChildData===true,zdrConfirmed:saved.zdrConfirmed===true};
  }}).catch(()=>{loadFailure=new PublicError(500,'Der geschützte API-Schlüssel konnte nicht geladen werden. Bitte die Einrichtung zurücksetzen.');});
  function summary(){return {model:config.model,enabled:config.enabled,allowChildData:config.allowChildData,zdrConfirmed:config.zdrConfirmed,
    keyConfigured:!!config.apiKey,persistent:secretStore.persistent===true,ready:!!config.apiKey&&config.enabled&&config.allowChildData&&config.zdrConfirmed};}
  function respond(res,status,data){if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
  async function body(req){
    if(!String(req.headers['content-type']).startsWith('application/json'))throw bad('Bitte eine JSON-Anfrage senden.');
    const parts=[];let bytes=0;for await(const part of req){bytes+=part.length;if(bytes>65536)throw bad('Die Anfrage ist zu lang.');parts.push(part);}
    try{const value=JSON.parse(Buffer.concat(parts).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw bad('Die Anfrage ist ungültig.');}
  }
  async function call(instructions,schema,input,res,maxOutputTokens=6000){
    if(!config.apiKey)throw bad('Bitte zuerst einen OpenAI-API-Schlüssel eintragen.');
    if(busy)throw new PublicError(409,'Die Lernhilfe antwortet gerade. Bitte kurz warten.');
    const now=Date.now();requests=requests.filter(time=>now-time<60000);
    if(requests.length>=maxRequestsPerMinute)throw new PublicError(429,'Zu viele Anfragen. Bitte eine Minute warten.');
    busy=true;requests.push(now);const ctl=new AbortController();controllers.add(ctl);
    const disconnected=()=>ctl.abort();res.once('close',disconnected);
    const timer=setTimeout(()=>ctl.abort(),timeoutMs);
    try{
      const payload={model:config.model,store:false,instructions,input:JSON.stringify(input),max_output_tokens:maxOutputTokens,
        text:{format:{type:'json_schema',name:'tagebuch_response',strict:true,schema}}};
      if(config.model.startsWith('gpt-5'))payload.reasoning={effort:'none'};
      const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',signal:ctl.signal,
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.apiKey},body:JSON.stringify(payload)});
      if(!response.ok){
        const errors={400:'OpenAI hat die Anfrage abgelehnt. Bitte Modell und API-Projekt prüfen.',401:'Der API-Schlüssel ist ungültig. Bitte in den Eltern-Einstellungen ersetzen.',403:'Dieses API-Projekt hat keinen Zugriff auf das gewählte Modell.',429:'Das API-Limit oder Guthaben ist erreicht. Bitte Abrechnung und Limits prüfen.'};
        throw new PublicError(response.status===429?429:502,errors[response.status]||'OpenAI ist gerade nicht verfügbar. Bitte später erneut versuchen.');
      }
      let raw;
      if(response.body){
        const chunks=[];let bytes=0;
        for await(const part of response.body){bytes+=part.length;if(bytes>1024*1024){ctl.abort();throw new PublicError(502,'Die Antwort war zu groß. Bitte kürzeren Text prüfen.');}chunks.push(Buffer.from(part));}
        raw=Buffer.concat(chunks).toString('utf8');
      }else raw=await response.text();
      if(raw.length>1024*1024)throw new PublicError(502,'Die Antwort war zu groß. Bitte kürzeren Text prüfen.');
      let result;try{result=JSON.parse(raw);}catch{throw new PublicError(502,'OpenAI hat keine lesbare Antwort geliefert.');}
      if(result.status!=='completed')throw new PublicError(502,'Die Antwort wurde nicht vollständig erstellt. Bitte erneut versuchen oder die Stelle offenlassen.');
      const content=(result.output||[]).flatMap(item=>item.type==='message'&&Array.isArray(item.content)?item.content:[]);
      if(content.some(item=>item.type==='refusal'))throw new PublicError(502,'Die Lernhilfe konnte diese Anfrage nicht beantworten. Du darfst die Stelle offenlassen.');
      const text=content.filter(item=>item.type==='output_text').map(item=>item.text).join('');
      try{return JSON.parse(text);}catch{throw new PublicError(502,'Die Lernhilfe hat keine verlässliche Antwort geliefert. Bitte erneut versuchen oder die Stelle offenlassen.');}
    }catch(e){
      if(e instanceof PublicError)throw e;
      if(ctl.signal.aborted)throw new PublicError(504,'Die Antwort dauert zu lange oder wurde abgebrochen. Du darfst die Stelle offenlassen.');
      throw new PublicError(502,'OpenAI ist nicht erreichbar. Bitte Internetverbindung prüfen oder später erneut versuchen.');
    }finally{clearTimeout(timer);res.removeListener('close',disconnected);controllers.delete(ctl);busy=false;}
  }
  function requireChildAccess(){if(!summary().ready)throw new PublicError(403,'Bitte die Online-Lernhilfe, Übertragung von Kindertexten und Zero Data Retention zuerst in den Eltern-Einstellungen freigeben.');}
  async function review(text,res){let request;try{request=Review.buildReviewRequest(text);}catch{throw bad('Bitte einen Text mit höchstens 12.000 Zeichen eingeben.');}
    const reply=await call(Review.REVIEW_INSTRUCTIONS,Review.REVIEW_SCHEMA,request,res);
    try{return Review.validateReviewReply(reply,request);}catch{throw new PublicError(502,'Die Korrektur passt nicht verlässlich zum Text. Bitte erneut versuchen oder offene Stellen behalten.');}}
  async function handle(req,res,path){
    if(!path.startsWith('/api/openai/'))return false;
    const host=req.headers.host;
    if(!['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort].includes(host)||
      (req.headers.origin&&req.headers.origin!=='http://'+host)||req.headers['x-tagebuch-client']!=='1'||
      (req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))){respond(res,403,{error:'Zugriff nur durch die lokale Tagebuch-App.'});return true;}
    if(closed){respond(res,503,{error:'Die Lernhilfe wurde beendet.'});return true;}
    if(path==='/api/openai/session'&&req.method==='GET'){respond(res,200,{token});return true;}
    const supplied=Buffer.from(req.headers['x-tagebuch-token']||'');
    if(supplied.length!==token.length||!timingSafeEqual(supplied,Buffer.from(token))){respond(res,403,{error:'Bitte die App neu laden.'});return true;}
    try{
      await loading;
      if(path==='/api/openai/config'&&req.method==='DELETE'){
        if(busy)throw new PublicError(409,'Bitte warten, bis die laufende Anfrage beendet ist.');
        await secretStore.remove();config={...EMPTY};loadFailure=null;respond(res,200,summary());return true;
      }
      if(loadFailure)throw loadFailure;
      if(path==='/api/openai/config'&&req.method==='GET'){respond(res,200,summary());return true;}
      if(req.method!=='POST')throw new PublicError(405,'Diese Anfrage wird nicht unterstützt.');
      const input=await body(req);
      if(path==='/api/openai/config'){
        if(busy)throw new PublicError(409,'Bitte warten, bis die laufende Anfrage beendet ist.');
        if(!MODELS.includes(input.model))throw bad('Bitte ein Modell aus der Auswahl wählen.');
        if(['enabled','allowChildData','zdrConfirmed'].some(key=>typeof input[key]!=='boolean'))throw bad('Bitte alle Freigaben ausdrücklich setzen.');
        if(input.apiKey!==undefined&&typeof input.apiKey!=='string')throw bad('Der API-Schlüssel ist ungültig.');
        const apiKey=input.apiKey?.trim()||config.apiKey;
        if(apiKey&&!/^sk-[A-Za-z0-9_-]{12,}$/.test(apiKey))throw bad('Bitte einen gültigen OpenAI-API-Schlüssel eintragen.');
        const next={apiKey,model:input.model,enabled:input.enabled,allowChildData:input.allowChildData,zdrConfirmed:input.zdrConfirmed};
        if(next.enabled&&!apiKey)throw bad('Bitte zuerst einen OpenAI-API-Schlüssel eintragen.');
        try{await secretStore.write(next);}catch{throw new PublicError(500,'Der API-Schlüssel konnte nicht geschützt gespeichert werden.');}
        config=next;respond(res,200,summary());return true;
      }
      if(path==='/api/openai/test'){
        if(Object.keys(input).length)throw bad('Der Verbindungstest verwendet ausschließlich einen festen Beispieltext.');
        const result=await review('Der Hunt spielt.',res);
        if(!result.issues.some(issue=>issue.original==='Hunt'&&issue.correction==='Hund'))throw new PublicError(502,'Die Verbindung funktioniert, aber die Beispielkorrektur war nicht zuverlässig. Bitte erneut testen.');
        respond(res,200,{ok:true,message:'Verbindung und Beispielkorrektur funktionieren.',model:config.model});return true;
      }
      if(path==='/api/openai/review'){requireChildAccess();respond(res,200,await review(input.text,res));return true;}
      if(path==='/api/openai/explain'){
        requireChildAccess();let request;try{request=Tutor.validateRequest(input,{maxTarget:240});}catch{throw bad('Die markierte Stelle oder der Satz ist ungültig. Bitte erneut prüfen.');}
        const raw=await call(Tutor.INSTRUCTIONS,Tutor.REPLY_SCHEMA,request,res,1000);let reply;
        try{reply=Tutor.validateReply(raw);}catch{throw new PublicError(502,'Die Erklärung passt nicht verlässlich zur Stelle. Bitte erneut fragen oder die Stelle offenlassen.');}
        if(request.mode!=='solution')reply.suggestion='';respond(res,200,reply);return true;
      }
      throw new PublicError(404,'Unbekannte OpenAI-Anfrage.');
    }catch(e){respond(res,e instanceof PublicError?e.status:500,{error:e instanceof PublicError?e.message:'Die Online-Lernhilfe konnte die Anfrage nicht verarbeiten.'});}
    return true;
  }
  function close(){closed=true;for(const controller of controllers)controller.abort();secretStore.close?.();config={...EMPTY};}
  return {handle,close};
}
module.exports={createOpenAiRuntime,MODELS,DEFAULT_MODEL};
