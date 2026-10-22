(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  let current=null, loadVersion=0, busy=false;
  function message(text){$("openaiTestStatus").textContent=text;}
  function showConfig(cfg){
    current=cfg;
    $("openaiModel").value=cfg.model || "gpt-5.4";
    $("openaiAllowChildData").checked=!!cfg.allowChildData;
    $("openaiZdrConfirmed").checked=!!cfg.zdrConfirmed;
    $("openaiKeyStatus").textContent=cfg.keyConfigured?(cfg.persistent===false?"API-Schlüssel für diese Serversitzung hinterlegt. Nach einem Server-Neustart erneut eingeben.":"API-Schlüssel gespeichert. Das Feld bleibt aus Sicherheitsgründen leer."):"Noch kein API-Schlüssel gespeichert.";
    $("openaiRemoveKey").disabled=!cfg.keyConfigured;
    if(!cfg.ready)window.dispatchEvent(new CustomEvent("openai-access-disabled"));
  }
  function visibility(){
    const online=$("tutorProvider").value==="openai";
    $("openaiSettings").hidden=!online;
    $("ollamaSettings").hidden=online;
    $("ollamaInstructions").hidden=online;
    ["tutorSetup","tutorFind","tutorSelect","tutorTest","tutorSelectCancel","tutorProgress","tutorSelectionResults"].forEach(id=>{
      const node=$(id);if(!node)return;
      if(online){if(node.dataset.openaiWasHidden===undefined)node.dataset.openaiWasHidden=String(node.hidden);node.hidden=true;}
      else if(node.dataset.openaiWasHidden!==undefined){node.hidden=node.dataset.openaiWasHidden==="true";delete node.dataset.openaiWasHidden;}
    });
    if(!online)$("openaiApiKey").value="";
  }
  async function render(){
    visibility();
    const version=++loadVersion;
    if(!window.TB_OPENAI || !window.TB_LOCAL_AI?.supportedOrigin){$("openaiKeyStatus").textContent="Für OpenAI die App über npm run dev öffnen.";return;}
    try{const cfg=await TB_OPENAI.config();if(version===loadVersion)showConfig(cfg);}
    catch{if(version===loadVersion)$("openaiKeyStatus").textContent="OpenAI-Einstellungen nicht erreichbar. Bitte den App-Server neu starten und neu laden.";}
  }
  async function save(){
    const apiKey=$("openaiApiKey").value.trim();
    // Remove the secret from the DOM before the request; never repopulate it.
    $("openaiApiKey").value="";
    const body={model:$("openaiModel").value,enabled:true,allowChildData:$("openaiAllowChildData").checked,zdrConfirmed:$("openaiZdrConfirmed").checked,...(apiKey?{apiKey}:{})};
    if(!body.allowChildData || !body.zdrConfirmed){
      if(!current?.enabled)throw new Error("Für Kindertexte bitte beide Freigaben bestätigen. Ohne sie könnt ihr zunächst Schlüssel und Modell speichern und das Beispiel testen.");
      body.enabled=false;
    }
    const cfg=await TB_OPENAI.configure(body);showConfig(cfg);return cfg;
  }
  async function test(){
    message("Erfundenes Beispiel wird geprüft …");
    try{const result=await TB_OPENAI.test();message(result.message || "OpenAI ist erreichbar. Der Beispieltest war erfolgreich.");return result;}
    catch(error){message(error.message || "Der OpenAI-Test ist fehlgeschlagen.");throw error;}
  }
  async function action(task){
    if(busy)return;busy=true;
    const buttons=["openaiSaveKey","openaiTest","openaiRemoveKey"].map($);buttons.forEach(b=>b.disabled=true);
    try{await task();}catch(error){message(error.message || "Die OpenAI-Einstellung konnte nicht übernommen werden.");}
    finally{busy=false;buttons.forEach(b=>b.disabled=false);$("openaiRemoveKey").disabled=!current?.keyConfigured;}
  }
  function init(){
    $("tutorProvider").addEventListener("change",visibility);
    $("openaiSaveKey").addEventListener("click",()=>action(async()=>{
      const apiKey=$("openaiApiKey").value.trim();$("openaiApiKey").value="";
      const cfg=await TB_OPENAI.configure({model:$("openaiModel").value,enabled:!apiKey && !!current?.enabled,allowChildData:!apiKey && !!current?.allowChildData,zdrConfirmed:!apiKey && !!current?.zdrConfirmed,...(apiKey?{apiKey}:{})});
      showConfig(cfg);message("Schlüssel und Modell gespeichert. Als Nächstes das OpenAI-Beispiel testen.");
    }));
    $("openaiTest").addEventListener("click",()=>action(test));
    $("openaiRemoveKey").addEventListener("click",()=>action(async()=>{
      $("openaiApiKey").value="";const cfg=await TB_OPENAI.removeKey();showConfig(cfg);
      message("API-Schlüssel entfernt. OpenAI ist ausgeschaltet.");
      window.dispatchEvent(new CustomEvent("openai-key-removed"));
    }));
    visibility();
  }
  window.TB_OPENAI_SETTINGS={render,save,test};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
}());
