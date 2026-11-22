(function(){
  "use strict";
  async function connect(){
    if(location.protocol !== "http:" || !["127.0.0.1","localhost"].includes(location.hostname)) return null;
    const response = await fetch("/api/storage/session",{headers:{"X-Tagebuch-Client":"1"},cache:"no-store",signal:AbortSignal.timeout(5000)});
    if(response.status === 404) return null;
    if(!response.ok) throw new Error("Der automatische Datenordner konnte nicht geöffnet werden.");
    const session = await response.json();
    if(session.version !== 1 || typeof session.token !== "string" || typeof session.directory !== "string") throw new Error("Die lokale Speicherverbindung ist ungültig.");
    async function request(action,payload){
      const r = await fetch("/api/storage/" + action,{method:"POST",headers:{"Content-Type":"application/json","X-Tagebuch-Client":"1","X-Tagebuch-Token":session.token},
        body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error("Die lokale Speicherung ist nicht erreichbar. Bitte den Dev-Server prüfen und die Seite neu laden.");
      return r.json();
    }
    return {directory:session.directory,
      read:async path => (await request("read",{path})).text,
      write:async (path,text) => {await request("write",{path,text});},
      list:async path => (await request("list",{path})).names,
      remove:async path => {await request("remove",{path});}
    };
  }
  window.TB_LOCAL_STORE = {connect};
})();
