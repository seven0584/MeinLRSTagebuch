(function(root, factory){
  if(typeof module === "object" && module.exports) module.exports = factory(require("./lernhilfe.js"),require("./mood.js"),require("./spell-review.js"));
  else root.TB_OLLAMA = factory(root.TB_TUTOR,root.TB_MOOD,root.TB_SPELL_REVIEW);
})(typeof globalThis !== "undefined" ? globalThis : this, function(Tutor,Mood,Review){
  "use strict";
  const BASE = "http://127.0.0.1:11434";
  const thinkingOnly = details => Array.isArray(details.thinking?.values) && details.thinking.values.includes(true) && !details.thinking.values.includes(false);
  function createProvider({ model = "", execution = "cpu", allowCpuFallback = true, fetchImpl = globalThis.fetch } = {}){
    const remoteName = /(?:^|[:/.-])cloud(?:$|[:/.-])/i.test(model);
    let thinkingSupported = false;
    let useCPUForExplanations = execution === "cpu";
    async function api(path, body, signal){
      if(fetchImpl === globalThis.fetch && globalThis.TB_LOCAL_AI?.supportedOrigin){
        try{ return await globalThis.TB_LOCAL_AI.request("ollama" + path,body || {},signal); }
        catch(e){
          if(e.name === "AbortError" || e instanceof Tutor.TutorError) throw e;
          const code = ["model_missing","model_failed","unreachable"].includes(e.code) ? e.code : "unreachable";
          throw new Tutor.TutorError(code,e.message);
        }
      }
      let r;
      try{ r = await fetchImpl(BASE + path, { method:body ? "POST" : "GET", headers:body ? { "Content-Type":"application/json" } : {},
        body:body ? JSON.stringify(body) : undefined, signal, credentials:"omit", cache:"no-store", redirect:"error" }); }
      catch(e){ if(e.name === "AbortError") throw e; throw new Tutor.TutorError("unreachable"); }
      if(!r.ok){
        let detail;try{detail=await r.json();}catch{}
        throw new Tutor.TutorError(r.status === 404 && path === "/api/show" ? "model_missing" : "model_failed",detail?.error ? "Die lokale KI konnte nicht antworten: " + String(detail.error).slice(0,240) : undefined);
      }
      return r.json();
    }
    async function status({ signal } = {}){
      if(!model.trim()) return { code:"not_configured" };
      if(remoteName) return { code:"model_remote" };
      try{
        const details = await api("/api/show", { model }, signal);
        if(details.remote_model || details.remote_host) return { code:"model_remote" };
        if(!details.details || !details.model_info) return { code:"unavailable" };
        if(Array.isArray(details.capabilities) && !details.capabilities.includes("completion")) return { code:"unsupported_model" };
        if(thinkingOnly(details)) return {code:"thinking_only"};
        thinkingSupported = Array.isArray(details.thinking?.values) && details.thinking.values.includes(false);
        return { code:"ready" };
      }catch(e){ if(e.name === "AbortError") throw e; return { code:e.code || "unavailable" }; }
    }
    async function listModels({ signal } = {}){
      const data = await api("/api/tags", null, signal);
      const names = (Array.isArray(data.models) ? data.models : []).filter(m => typeof m.name === "string" && !m.remote_model && !m.remote_host && !/(?:^|[:/.-])cloud(?:$|[:/.-])/i.test(m.name)).map(m => m.name);
      const usable = [];
      for(const name of names){
        const details = await api("/api/show",{model:name},signal);
        if(!details.remote_model && !details.remote_host && details.details && details.model_info && details.capabilities?.includes("completion") && !thinkingOnly(details)) usable.push(name);
      }
      return usable;
    }
    async function generateExplanation(request, cpu, signal){
      const started = performance.now();
      const result = await api("/api/chat", { model, stream:false, ...(thinkingSupported ? { think:false } : {}), format:Tutor.REPLY_SCHEMA,
        options:{ temperature:0.6, num_ctx:4096, num_predict:900, ...(cpu ? {num_gpu:0} : {}) }, keep_alive:"2m",
        messages:[{ role:"system", content:Tutor.INSTRUCTIONS }, { role:"user", content:JSON.stringify(request) }] }, signal);
      const elapsedMs = Math.max(0,performance.now()-started);
      if(result?.done_reason === "length") throw new Tutor.TutorError("invalid_reply","Die Antwort wurde abgeschnitten. Bitte erneut fragen oder ein anderes Modell ausprobieren.");
      let reply;
      try{ reply = Tutor.validateReplyForRequest(JSON.parse(result.message.content),request); }
      catch(e){ throw new Tutor.TutorError("invalid_reply", "Die lokale Lernhilfe hat keine passende Antwort geliefert. Bitte frage erneut oder lass die Stelle offen."); }
      const loadMs = Number.isFinite(result.load_duration) ? Math.min(elapsedMs,Math.max(0,result.load_duration/1e6)) : 0;
      return {reply,elapsedMs,loadMs};
    }
    async function measure(input, {signal} = {}){
      const available = await status({signal});
      if(available.code !== "ready") throw new Tutor.TutorError(available.code);
      const result = await generateExplanation(Tutor.validateRequest(input),execution === "cpu",signal);
      if(execution === "auto"){
        const running = await api("/api/ps",null,signal);
        const loaded = running?.models?.find(item => item.name === model || item.model === model);
        result.vramBytes = Number.isFinite(loaded?.size_vram) ? Math.max(0,loaded.size_vram) : 0;
      }
      return result;
    }
    async function withCPUFallback(generate,signal){
      try{ return await generate(useCPUForExplanations); }
      catch(e){
        // Some GPU backends return repetition or unusable output. Retry once on
        // the same local model, sharing the caller's cancellation and timeout.
        const retryable = e.code === "invalid_reply" || (e.code === "model_failed" && /token[\s_-]*repeat|repetition|repeat(?:ed)?[\s_-]*(?:token|limit)/i.test(e.message));
        if(!allowCpuFallback || execution !== "auto" || useCPUForExplanations || !retryable) throw e;
        if(signal?.aborted) throw new DOMException("Die Anfrage wurde abgebrochen.","AbortError");
        const reply = await generate(true);
        useCPUForExplanations = true;
        return reply;
      }
    }
    async function explain(input, { signal } = {}){
      // Defence in depth for callers using the adapter without the application service.
      const available = await status({ signal });
      if(available.code !== "ready") throw new Tutor.TutorError(available.code);
      const request = Tutor.validateRequest(input);
      return withCPUFallback(async cpu=>(await generateExplanation(request,cpu,signal)).reply,signal);
    }
    async function review(text,candidates,{signal} = {}){
      const request=Review.buildRequest(text,candidates);
      const available=await status({signal});
      if(available.code !== "ready") throw new Tutor.TutorError(available.code);
      return withCPUFallback(async cpu=>{
        const result=await api("/api/chat",{model,stream:false,...(thinkingSupported?{think:false}:{}),format:Review.REPLY_SCHEMA,
          options:{temperature:0.2,num_ctx:4096,num_predict:1600,...(cpu?{num_gpu:0}:{})},keep_alive:"2m",
          messages:[{role:"system",content:Review.INSTRUCTIONS},{role:"user",content:JSON.stringify(request)}]},signal);
        if(result?.done_reason === "length") throw new Tutor.TutorError("invalid_reply","Die Textprüfung wurde abgeschnitten. Bitte später erneut versuchen.");
        try{return Review.validateReply(JSON.parse(result.message.content),request);}
        catch(e){throw new Tutor.TutorError("invalid_reply","Die lokale KI hat keine verständliche Textprüfung geliefert.");}
      },signal);
    }
    async function mood(text, { signal } = {}){
      // Only the bounded free text belongs in this separate request. Self-reports,
      // reflection answers and correction history are never accepted here.
      const request = Mood.buildRequest(text);
      const available = await status({ signal });
      if(available.code !== "ready") throw new Tutor.TutorError(available.code);
      const result = await api("/api/chat", { model, stream:false, ...(thinkingSupported ? { think:false } : {}), format:Mood.REPLY_SCHEMA,
        options:{ temperature:0.6, num_ctx:4096, num_predict:200, ...(execution === "cpu" ? {num_gpu:0} : {}) }, keep_alive:"2m",
        messages:[{ role:"system", content:Mood.INSTRUCTIONS }, { role:"user", content:JSON.stringify(request) }] }, signal);
      if(result.done_reason === "length") throw new Tutor.TutorError("invalid_reply","Die Gefühlsantwort wurde abgeschnitten. Bitte später erneut versuchen.");
      try{ return Mood.validateAI(JSON.parse(result.message.content)); }
      catch(e){ throw new Tutor.TutorError("invalid_reply","Die lokale KI hat keine verständliche Gefühlsantwort geliefert."); }
    }
    return { id:"ollama", location:"local", status, explain, measure, review, mood, listModels };
  }
  return { createProvider };
});
