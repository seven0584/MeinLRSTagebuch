(function(){
  'use strict';
  const KEY = 'schreibheft-v1';
  function validateChild(c){
    if(!c || !Array.isArray(c.entries) || !c.words || !Array.isArray(c.names)) throw Error('Ein Kindertagebuch ist unvollständig. Bitte eine vorhandene Sicherung verwenden oder den ursprünglichen Tagebuch-Ordner erneut öffnen.');
    if(c.learning && (c.learning.schema !== 1 || !Array.isArray(c.learning.cases) || !Array.isArray(c.learning.tasks))) throw Error('Diese Lerndaten benötigen eine andere App-Version. Bitte die aktuelle vollständige Version aus dem Repository herunterladen.');
  }
  function validate(raw){
    if(raw === null) return;
    if(!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Die gespeicherten Daten sind nicht lesbar.');
    if(raw.v !== undefined && raw.v !== 2 && raw.v !== 1) throw Error('Die gespeicherten Daten benötigen eine andere App-Version. Bitte zuerst die aktuelle vollständige App herunterladen.');
    if(raw.v === 2){
      if(!Array.isArray(raw.children) || !raw.data || !raw.parent) throw Error('Die Familiendaten sind unvollständig.');
      raw.children.forEach(id=>validateChild(raw.data[id]));
    }else if(!Array.isArray(raw.entries)) throw Error('Das ältere Tagebuchformat wird nicht erkannt.');
  }
  function problem(text){
    const box=document.getElementById('startupProblem');
    box.hidden=false;document.getElementById('startupReason').textContent=text;
  }
  function canStart(){
    try{validate(JSON.parse(localStorage.getItem(KEY)||'null'));return true;}
    catch(e){problem(e.message+' Die vorhandenen Browserdaten werden nicht überschrieben.');return false;}
  }
  window.TBCompatibility={validate,validateChild,canStart,problem,ready(){window.TBStarted=true;}};
})();
