(function(){
  "use strict";
  let session;
  const supportedOrigin = location.protocol === "http:" && ["localhost","127.0.0.1"].includes(location.hostname);
  async function connection(){
    if(!supportedOrigin) throw new Error("Für die automatische KI-Einrichtung bitte die Windows-App über npm run dev öffnen.");
    if(!session){
      session = fetch("/api/ai/session",{headers:{"X-Tagebuch-Client":"1"},cache:"no-store",signal:AbortSignal.timeout(5000)})
        .then(async r=>{if(!r.ok) throw new Error("Bitte den Dev-Server neu starten und die Seite neu laden.");return r.json();})
        .catch(e=>{session=null;throw e;});
    }
    return session;
  }
  async function request(path,body,signal){
    const info=await connection();
    const response=await fetch("/api/ai/"+path,{method:body===undefined?"GET":"POST",cache:"no-store",credentials:"omit",redirect:"error",signal,
      headers:{"X-Tagebuch-Client":"1","X-Tagebuch-Token":info.token,...(body===undefined?{}:{"Content-Type":"application/json"})},
      body:body===undefined?undefined:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok){const error=new Error(result.error || "Die lokale KI ist nicht erreichbar.");error.code=response.status===404?"model_missing":path.endsWith('/api/chat')?"model_failed":"unreachable";throw error;}
    return result;
  }
  window.TB_LOCAL_AI = {supportedOrigin,connection,request};
})();
