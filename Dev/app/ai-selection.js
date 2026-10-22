(function(root,factory){
  if(typeof module === "object" && module.exports) module.exports=factory(require("./lernhilfe.js"),require("./ollama.js"));
  else root.TB_AI_SELECTION=factory(root.TB_TUTOR,root.TB_OLLAMA);
})(typeof globalThis !== "undefined" ? globalThis : this,function(Tutor,Ollama){
  "use strict";
  const PROBES=Object.freeze([
    Object.freeze({sentence:"Meine oma kommt zu Besuch.",target:"oma",mode:"solution",expected:"Oma"}),
    Object.freeze({sentence:"Ich habe ein geefühl.",target:"geefühl",mode:"solution",expected:"Gefühl"})
  ]);
  const aborted=()=>new DOMException("Der Vergleich wurde abgebrochen.","AbortError");
  function check(signal){if(signal?.aborted) throw aborted();}
  async function measured(provider,input,signal){
    check(signal);
    const controller=new AbortController();
    let timer,stop;
    const interrupted=new Promise((_,reject)=>{
      stop=()=>{controller.abort();reject(aborted());};
      signal?.addEventListener("abort",stop,{once:true});
      timer=setTimeout(()=>{controller.abort();reject(new Tutor.TutorError("timeout","Die Testantwort dauerte zu lange."));},180000);
    });
    try{return await Promise.race([provider.measure(input,{signal:controller.signal}),interrupted]);}
    finally{clearTimeout(timer);signal?.removeEventListener("abort",stop);}
  }
  async function compare({models=[],executions=["auto","cpu"],signal,onProgress=()=>{},providerFactory=Ollama.createProvider,now=()=>performance.now()}={}){
    const results=[];
    const names=[...new Set(models.filter(name=>typeof name === "string" && name.trim()))];
    const modes=[...new Set(executions.filter(mode=>["auto","cpu"].includes(mode)))];
    const total=names.length*modes.length;
    check(signal);
    for(const model of names) for(const execution of modes){
      check(signal);
      const index=results.length,result={model,execution,ok:false,probes:[]};
      onProgress({phase:"pair",model,execution,index,total});
      try{
        const provider=providerFactory({model,execution,allowCpuFallback:false});
        if(provider.location !== "local") throw new Tutor.TutorError("online_not_allowed");
        for(let probeIndex=0;probeIndex<PROBES.length;probeIndex++){
          check(signal);
          onProgress({phase:"probe",model,execution,index,total,probeIndex});
          const {expected,...input}=PROBES[probeIndex];
          const started=now(),sample=await measured(provider,input,signal);
          check(signal);
          const reply=Tutor.validateReply(sample.reply);
          if(reply.assessment !== "needsChange" || reply.suggestion !== expected)
            throw new Tutor.TutorError("quality_failed","Die zwei Testwörter wurden nicht beide richtig verbessert.");
          if(execution === "auto" && !(Number.isFinite(sample.vramBytes) && sample.vramBytes>0))
            throw new Tutor.TutorError("no_gpu","Für diesen Versuch wurde keine Nutzung des Grafikspeichers bestätigt.");
          const elapsedMs=Number.isFinite(sample.elapsedMs) ? Math.max(0,sample.elapsedMs) : Math.max(0,now()-started);
          const loadMs=Number.isFinite(sample.loadMs) ? Math.min(elapsedMs,Math.max(0,sample.loadMs)) : 0;
          result.probes.push({elapsedMs,loadMs,durationMs:elapsedMs-loadMs,...(execution === "auto"?{vramBytes:sample.vramBytes}:{})});
        }
        result.ok=true;
        result.averageMs=result.probes.reduce((sum,probe)=>sum+probe.durationMs,0)/PROBES.length;
      }catch(error){
        check(signal);
        if(error.name === "AbortError") throw error;
        result.error=error.code || "unavailable";
        result.message=error.message || "Dieser Versuch war nicht erfolgreich.";
      }
      results.push(result);
      onProgress({phase:"complete",model,execution,index,total,result});
    }
    check(signal);
    const best=results.filter(result=>result.ok).sort((a,b)=>a.averageMs-b.averageMs)[0];
    return {winner:best?{model:best.model,execution:best.execution,averageMs:best.averageMs}:null,results};
  }
  return {compare};
});
