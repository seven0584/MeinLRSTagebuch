window.TBLearningUI = (function(){
  'use strict';
  const C=window.TBLearning, $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title=k=>C.catalog(k).title;
  function create(a){
    let currentTask=null,currentIndex=0,owner=null,editingTask=null;
    const state=()=>a.state();
    const run=fn=>{try{return a.transaction(fn);}catch(e){message(e.message);return null;}};
    const message=text=>{const box=$('#learningMessage');box.textContent=text;box.hidden=false;box.focus();};
    const formats={active:'noch offen',deferred:'weiß nicht weiter',contested:'Bewertung beanstandet',resolved:'verbessert',changed:'Text geändert',accepted:'Schreibweise akzeptiert'};
    function parent(){
      editingTask=null;
      if(!a.hasChild()){setup();$('#learningParent').innerHTML='<p>Legt zuerst unter Einstellungen ein Kind an.</p>';return;}
      setup();const s=state(),data=C.stats(s),sum=data.summary,recs=C.recommendations(s);
      $('#learningParent').innerHTML='<h3>Gemeinsam weiterkommen · letzte 30 Tage</h3><div class="learning-cards">'+
        '<section><h4>Das klappt schon</h4><p>'+data.writing.entries+' Einträge mit '+data.writing.words+' Wörtern geschrieben.</p><p>'+sum.resolved+' markierte Stellen verbessert, davon '+sum.afterHint+' nach einem geöffneten Hinweis.</p><p class="note">Das beschreibt die Bearbeitung, nicht automatisch das Regelverständnis.</p></section>'+
        '<section><h4>Hier ist noch Hilfe gefragt</h4><p>'+sum.deferred+' ungelöst · '+sum.contested+' beanstandet · '+sum.active+' noch in Bearbeitung. '+sum.pendingReviews+' Rückfragen zur Bewertung warten auf Klärung.'+(data.olderOpen.length?' Außerdem '+data.olderOpen.length+' ältere offene Stellen in den Details.':'')+'</p><p>Offene Wörter können gemeinsam angeschaut werden. Daraus lässt sich keine Absicht ableiten.</p></section>'+
        '<section><h4>Das könnt ihr ausprobieren</h4>'+ (recs.length?recs.map(r=>'<p>'+esc(r.title)+': '+r.count+' Markierungen in 30 Tagen. '+esc(r.reason)+'</p><button class="btn-ghost" data-recommend="'+r.category+'">Passende Übung ansehen</button>').join(''):'<p>Noch keine ausreichend wiederholten Beobachtungen für einen Mustervorschlag. Eine kurze Übung könnt ihr selbst auswählen.</p>')+'</section></div>'+
        '<p class="note">Detaildaten seit '+new Date(data.since).toLocaleDateString('de-DE')+'. '+data.legacy+' ältere Einträge haben keine Wortverläufe. Markierungen sind keine LRS-Diagnose. Ein aufgerufener Tipp muss nicht verstanden worden sein.</p>'+
        '<details><summary>Wortfälle und Regeln genauer anschauen ('+data.cases.length+')</summary>'+details(data)+'</details>'+olderDetails(data.olderOpen)+
        '<h3>Eine freiwillige Aufgabe anbieten</h3><p>Die Aufgabe wird keine Voraussetzung für das Tagebuch. Die Belohnung wird vorher vereinbart.</p><div class="rulegrid">'+
        '<label class="field">Was soll geübt werden?<select id="assignCategory">'+Object.keys(C.CATALOG).filter(k=>C.catalog(k).pool.length).map(k=>'<option value="'+k+'">'+esc(title(k))+'</option>').join('')+'</select></label>'+
        '<label class="field">Aufgabe<select id="assignType"><option value="words">Einzelne Wörter hören und schreiben</option><option value="text">Einen kurzen Text hören und schreiben</option></select></label>'+
        '<label class="field">Wörter (beim Wort-Diktat)<input id="assignCount" type="number" min="1" max="5" value="5"></label>'+
        '<label class="field">Höchstens Extra-Coins<input id="assignCoins" type="number" min="0" max="10000" step="1" value="'+(C.ensure(s).defaultCoins??20)+'"></label></div>'+
        '<div id="materialPreview" class="learning-preview"></div><p class="note">Coins gibt es anteilig für bearbeitete Zielwörter, auch nach einer Verbesserung. Offen gelassene Wörter zählen bis zur Klärung nicht mit. Die Tagebuch-Coins bleiben unverändert.</p><button class="btn" id="assignDo">Aufgabe anbieten</button><button class="btn-ghost" id="assignCancel" hidden>Ändern abbrechen</button><p id="assignmentStatus" role="status"></p>'+parentTasks();
      $('#assignCategory').onchange=preview;$('#assignType').onchange=preview;$('#assignCount').oninput=preview;$('#assignCoins').oninput=preview;preview();
      $('#assignDo').onclick=()=>{const result=run(()=>(editingTask?C.editTask(s,editingTask,assignmentOptions()):C.assign(s,assignmentOptions())));if(result){parent();$('#assignmentStatus').textContent='Aufgabe angeboten. Sie ist beim Kind unter „Üben“ sichtbar.';}};
      $('#assignCancel').onclick=parent;
      $('#learningParent').querySelectorAll('[data-edit-task]').forEach(b=>b.onclick=()=>{const t=C.getTask(s,b.dataset.editTask);editingTask=t.id;$('#assignCategory').value=t.category;$('#assignType').value=t.type;$('#assignCount').value=Math.min(5,t.items.length);$('#assignCoins').value=t.maxCoins;$('#assignDo').textContent='Änderungen übernehmen';$('#assignCancel').hidden=false;preview();$('#assignCategory').focus();});
      $('#learningParent').querySelectorAll('[data-recommend]').forEach(b=>b.onclick=()=>{$('#assignCategory').value=b.dataset.recommend;preview();$('#materialPreview').scrollIntoView({block:'center'});});
      $('#learningParent').querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{const card=b.closest('[data-case-card]');const note=card.querySelector('input').value;const result=run(()=>C.review(s,card.dataset.caseCard,b.dataset.review,note));if(result){parent();a.refreshCoins();}});
      $('#learningParent').querySelectorAll('[data-withdraw]').forEach(b=>b.onclick=()=>{if(run(()=>{C.settleTask(s,b.dataset.withdraw,true);return true;})){parent();a.refreshCoins();}});
    }
    function assignmentOptions(){return {category:$('#assignCategory').value,type:$('#assignType').value,count:$('#assignCount').value,coins:$('#assignCoins').value};}
    function olderDetails(cases){
      if(!cases.length)return '';
      const groups=Object.keys(C.CATALOG).map(key=>({key,...C.catalog(key),cases:cases.filter(c=>C.caseRule(c).id===key)})).filter(g=>g.cases.length).map(g=>({...g,total:g.cases.length}));
      return '<details><summary>Ältere offene Stellen ('+cases.length+')</summary>'+details({cases,groups})+'</details>';
    }
    function details(data){
      if(!data.cases.length)return '<p>Noch keine neuen Wortfälle.</p>';
      return data.groups.map(g=>'<h4>'+esc(g.title)+' · '+g.total+' markierte Stellen</h4><p>'+esc(g.hint)+'</p>'+g.cases.slice().reverse().map(c=>{
        const visible=c.kind==='task'||c.shared, hints=c.events.filter(e=>e.type==='hint').length,attempts=c.events.filter(e=>e.type==='attempt').length;
        return '<article class="word-case" data-case-card="'+esc(c.id)+'"><p><b>'+esc(formats[c.status]||c.status)+'</b> · '+esc(c.date)+' · '+(c.kind==='task'?'Diktat':'Tagebuch')+'</p><p>'+attempts+' Änderungen zur Prüfung · '+hints+' Hinweise geöffnet · '+c.events.filter(e=>e.type==='hint_unclear').length+'-mal Tipp nicht verstanden · '+(c.source==='curated'?'mit Aufgabenreferenz verglichen':'automatisch vermutet')+'</p>'+
          (visible?'<p>Geschrieben: <b>'+esc(c.current||c.original||'(keine Eingabe)')+'</b> · vorgeschlagen: '+esc(c.expected||'unklar')+'</p>'+(c.context?'<p class="note">Geteilter Zusammenhang: '+esc(c.context)+'</p>':''):'<p>Privater Tagebuchtext. Das Kind kann diese Wortstelle gezielt teilen. Ohne Kontext bleibt die Bewertung offen.</p>')+
          (c.pendingReview?'<p>Bewertung noch zu klären'+(visible?': '+esc(c.pendingReview.value||'(keine Eingabe)'):'')+'. Auch nach einer Verbesserung bleibt diese Rückfrage offen.</p>':'')+(c.reviewNote?'<p>Elternhinweis: '+esc(c.reviewNote)+'</p>':'')+'<p class="note">Prüfstand: '+esc(({accepted:'Schreibweise akzeptiert / App-Markierung aufgehoben',confirmed:'Markierung von Eltern bestätigt',uncertain:'weiter ungeklärt',contested:'beanstandet',reference:'Aufgabenreferenz',unreviewed:'noch nicht geprüft'})[c.review]||c.review)+'</p>'+
          (visible?'<label class="field">Kurze Begründung (optional)<input maxlength="500" value="'+esc(c.reviewNote||'')+'"></label><div class="below"><button class="btn-ghost" data-review="accepted">Schreibweise ist zulässig</button><button class="btn-ghost" data-review="confirmed">Markierung stimmt</button><button class="btn-ghost" data-review="uncertain">Bleibt ungeklärt</button></div>':'')+'</article>';
      }).join('')).join('');
    }
    function parentTasks(){
      const ts=C.ensure(state()).tasks;
      return '<h3>Angebotene Aufgaben</h3>'+(ts.length?ts.slice().reverse().map(t=>'<article class="word-case"><b>'+esc(title(t.category))+'</b> · '+(t.type==='text'?'Kurz-Diktat':'Wort-Diktat')+' · '+t.items.length+' Wörter<p>'+t.items.filter(it=>it.status==='done'||it.accepted).length+' bearbeitet, davon '+t.items.filter(it=>it.firstCorrect).length+' beim ersten Versuch richtig · '+t.items.filter(it=>!it.accepted&&['skipped','contested'].includes(it.status)).length+' offen · '+t.paid+' von höchstens '+t.maxCoins+' Coins ausgezahlt.</p><p>'+esc(taskState(t))+'</p>'+(t.status==='offered'&&!t.textDraft?'<button class="btn-ghost" data-edit-task="'+t.id+'">Aufgabe ändern</button>':'')+(t.status!=='withdrawn'&&t.status!=='complete'?'<button class="btn-ghost" data-withdraw="'+t.id+'">Aufgabe zurücknehmen; erreichten Anteil behalten</button>':'')+'</article>').join(''):'<p>Noch keine Aufgaben angeboten.</p>');
    }
    function taskState(t){return ({offered:'Noch nicht begonnen',active:'In Bearbeitung',paused:'Pausiert',partial:'Abgeschlossen mit offenen Wörtern',complete:'Vollständig bearbeitet',withdrawn:'Von Eltern zurückgenommen'})[t.status]||t.status;}
    function preview(){
      try{const m=C.materials($('#assignCategory').value,$('#assignType').value,$('#assignCount').value);$('#assignCount').disabled=$('#assignType').value==='text';$('#materialPreview').textContent='So sieht die Aufgabe aus: '+(m.text||m.items.map(it=>it.word).join(', '))+' · '+m.items.length+' Zielwörter · höchstens '+$('#assignCoins').value+' Coins.';}catch(e){$('#materialPreview').textContent=e.message;}
    }
    function setup(){
      $('#setupSave').disabled=!a.hasChild();$('#setupIntro').textContent=a.hasChild()?'Die Einstellungen gelten für '+state().name+'. Vereinbart ein machbares Schreibziel und probiert unten einen Beispieltext aus. Bestehende Werte stehen schon in den Feldern.':'Legt unter Einstellungen zuerst ein Kind an. Danach könnt ihr hier gemeinsam das Schreibziel und die Coins festlegen.';
      const c=a.config(),fields={setupWords:'entryWords',setupSentences:'entrySentences',setupLength:'sentenceWords',setupDays:'days',setupSentenceCoins:'perSentence',setupWordCoins:'perWord',setupCommaCoins:'comma'};
      for(const [key,prop] of Object.entries(fields)){$('#'+key).value=c[prop];$('#'+key).oninput=setupPreview;}
      $('#setupSample').oninput=setupPreview;setupPreview();
      $('#setupSave').onclick=()=>{
        const next={};for(const [key,prop] of Object.entries(fields)){const el=$('#'+key),n=Number(el.value);if(!el.checkValidity()||!Number.isSafeInteger(n)){message('Bitte die angegebenen Grenzen und ganze Zahlen beachten.');el.focus();return;}next[prop]=n;}
        if(run(()=>{Object.assign(a.config(),next);return true;})){$('#setupStatus').textContent='Gespeichert. Die Vorschau zeigt die Anforderungen für '+state().name+'.';a.refresh();}
      };
    }
    function setupPreview(){
      const read=id=>Math.max(0,Number($('#'+id).value)||0),text=$('#setupSample').value,wordCount=C.words(text).length,min=read('setupLength');
      const sentences=text.split(/[.!?]+/).filter(s=>C.words(s).length>=min&&/\p{L}/u.test(s)).length;
      let coins=0;for(const chunk of text.match(/[^.!?…]+[.!?…]+/g)||[]){const n=C.words(chunk).length;if(n>=min)coins+=read('setupSentenceCoins')+read('setupWordCoins')*(n-min);if(/,/.test(chunk)&&n>1)coins+=read('setupCommaCoins');}
      $('#setupPreview').innerHTML='<p><b>Dein Beispiel: '+wordCount+' Wörter, '+sentences+' '+(sentences===1?'zählender Satz':'zählende Sätze')+'. '+(wordCount>=read('setupWords')&&sentences>=read('setupSentences')?'Das Schreibziel wäre erreicht.':'Das Schreibziel wäre noch nicht erreicht.')+'</b></p><p>Tagesziel: mindestens '+read('setupWords')+' Wörter insgesamt und '+read('setupSentences')+' '+(read('setupSentences')===1?'Satz':'Sätze')+' mit jeweils mindestens '+min+' Wörtern.</p><p>Nach Abschluss: '+coins+' Tagebuch-Coins für dieses Beispiel. '+(a.config().firstOnly?'Vergütet wird nur der erste Eintrag des Tages. ':'')+'Die Gutschrift erfolgt am Sonntag bei '+read('setupDays')+' erfüllten Tagen, einschließlich Pausen/Joker.</p><p class="note">Die Vorschau prüft keine Rechtschreibung oder Kommas. Eure sonstigen Belohnungsregeln gelten weiter.</p>';
    }
    function child(){
      if(!a.hasChild())return;
      if(owner!==state().id){owner=state().id;currentTask=null;$('#assignmentBox').hidden=true;}
      const s=state(),ts=C.ensure(s).tasks.filter(t=>t.status!=='withdrawn');
      $('#assignedTasks').innerHTML='<h3>Für dich angeboten</h3><p>Diese Aufgaben sind freiwillig. Du kannst dein Tagebuch auch ohne Diktat abschließen.</p>'+(ts.length?ts.slice().reverse().map(t=>'<article class="task-offer"><b>'+esc(title(t.category))+'</b><p>'+t.items.length+' Wörter · '+(t.type==='text'?'kurzer Text':'Wort-Diktat')+' · bis zu '+t.maxCoins+' Extra-Coins</p><p>'+esc(taskState(t))+' · schon gutgeschrieben: '+t.paid+' Coins</p><button class="btn" data-task="'+t.id+'">'+(t.status==='offered'?'Anschauen':t.status==='complete'?'Ergebnis ansehen':'Weiterüben / offene Wörter ansehen')+'</button></article>').join(''):'<p>Hier erscheinen Aufgaben, die deine Eltern dir anbieten.</p>');
      $('#assignedTasks').querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{currentTask=b.dataset.task;currentIndex=0;renderTask();});
      openWords();a.refreshCoins();
    }
    function openWords(){
      const cs=C.ensure(state()).cases.filter(c=>c.kind==='diary'&&['deferred','contested','accepted'].includes(c.status));
      $('#openLearning').hidden=!cs.length;
      $('#openLearning').innerHTML=cs.length?'<details><summary>Wörter und Rückmeldungen ('+cs.length+')</summary><p>Du kannst weiterprobieren oder eine Wortstelle mit deinen Eltern teilen.</p>'+cs.map(c=>'<div class="word-case"><b>'+esc(c.current)+'</b> · '+esc(formats[c.status])+(c.reviewNote?'<p>Hinweis deiner Eltern: '+esc(c.reviewNote)+'</p>':'')+'<p>'+esc(c.status==='accepted'?'Diese Schreibweise ist akzeptiert. Du musst sie nicht verbessern.':C.caseRule(c).hint)+'</p><label class="field">Deine neue Schreibweise<input data-retry-word="'+c.id+'" value="'+esc(c.current)+'"></label><div class="below"><button class="btn-ghost" data-retry="'+c.id+'">Dieses Wort prüfen</button><button class="btn-ghost" data-share="'+c.id+'">'+(c.shared?'Teilen beenden':'Wort und Zusammenhang mit Eltern teilen')+'</button></div></div>').join('')+'</details>':'';
      $('#openLearning').querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>{run(()=>{const c=C.getCase(state(),b.dataset.share);c.shared=!c.shared;return true;});openWords();});
      $('#openLearning').querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>{const c=C.getCase(state(),b.dataset.retry),value=$('#openLearning [data-retry-word="'+c.id+'"]').value;a.revisit(c,value);openWords();});
    }
    function renderTask(){
      if(!currentTask)return;const s=state(),t=C.getTask(s,currentTask),box=$('#assignmentBox');box.hidden=false;box.scrollIntoView({block:'start'});
      a.stopSpeech();
      const pending=t.items.map((it,i)=>({it,i})).filter(({it})=>it.status!=='done'&&!it.accepted);
      if(t.status==='withdrawn'){box.innerHTML='<p>Diese Aufgabe wurde zurückgenommen.</p>';return;}
      if(t.type==='text'&&!t.typed&&!t.startedAt){
        box.innerHTML='<h3>Dein Kurz-Diktat</h3><p>Höre dir den Text an. Du kannst ihn in kurzen Teilen hören und jederzeit pausieren. Erst nach deiner Eingabe schauen wir die Wörter gemeinsam an. Hier zählen die Schreibweisen der Wörter; Satzzeichen werden in dieser Zusatzaufgabe nicht bewertet.</p>'+speechButtons()+'<label class="field">Dein Text<textarea id="taskText" rows="5"></textarea></label><div class="below"><button class="btn" id="taskSubmitText">Wörter anschauen</button><button class="btn-ghost" id="taskPause">Pause</button></div>';
        let chunk=0;const chunks=t.text.match(/[^.!?]+[.!?]/g)||[t.text];wireSpeech(()=>t.text,()=>chunks[Math.min(chunk++,chunks.length-1)]);
        $('#taskText').value=t.textDraft||'';$('#taskText').focus();$('#taskText').oninput=()=>run(()=>{C.getTask(s,t.id).textDraft=$('#taskText').value;return true;});
        $('#taskSubmitText').onclick=()=>{if(!/\p{L}/u.test($('#taskText').value)){message('Schreibe zuerst deinen eigenen Versuch. Du kannst auch eine Pause machen.');return;}if(run(()=>C.submitText(s,t.id,$('#taskText').value))){currentIndex=0;renderTask();}};
        $('#taskPause').onclick=()=>pauseTask(t);return;
      }
      if(!pending.length||t.status==='complete'){resultTask(t);return;}
      if(currentIndex>=pending.length)currentIndex=0;
      const {it,i}=pending[currentIndex],rule=C.catalog(it.category),isOpen=['skipped','contested'].includes(it.status);
      box.innerHTML='<h3>'+esc(title(t.category))+'</h3><p>Wort '+(i+1)+' von '+t.items.length+' · '+t.items.filter(x=>x.status==='done'||x.accepted).length+' bearbeitet · höchstens '+t.maxCoins+' Extra-Coins.</p>'+speechButtons()+
        (t.type==='text'&&t.typed?'<details><summary>Deinen eingegebenen Text ansehen</summary><p>'+esc(t.typed)+'</p>'+(t.extraWords?'<p>'+t.extraWords+' zusätzliche Wörter werden nicht zusätzlich vergütet. Prüfe beim Vergleichen den Zusammenhang.</p>':'')+'</details>':'')+
        (it.status==='review'?'<p>Schau dieses Wort noch einmal an. Die Aufgaben-Schreibweise ist: <b>'+esc(it.word)+'</b>. Du kannst sie selbst verbessern oder die Stelle offenlassen.</p>':'')+
        (isOpen?'<p>Dieses Wort ist noch offen. Du kannst es erneut versuchen.</p>':'')+
        '<label class="field">Deine Schreibweise<input id="taskWord" autocomplete="off" spellcheck="false" value="'+esc(it.attempts.at(-1)?.value||'')+'"></label><div class="below"><button class="btn" id="taskCheck">Dieses Wort prüfen</button><button class="btn-ghost" id="taskHint">Tipp</button><button class="btn-ghost" id="taskHintUnclear">Der Tipp hilft mir noch nicht</button></div><p id="taskHintText" role="status"></p>'+
        '<div class="below"><button class="btn-ghost" id="taskUnknown">Bei diesem Wort weiß ich nicht weiter</button><button class="btn-ghost" id="taskDisagree">Meine Schreibweise stimmt, bitte prüfen</button></div><div class="below"><button class="btn-ghost" id="taskPause">Pause</button><button class="btn-ghost" id="taskFinish">Aufgabe abschließen</button></div><p class="note">Offene Wörter bleiben sichtbar. Deine Eltern können deine Antworten in dieser angebotenen Aufgabe ansehen.</p>';
      wireSpeech(()=>it.word+'. '+it.context+' '+it.word+'.');$('#taskWord').focus();
      $('#taskCheck').onclick=()=>{const result=run(()=>C.attempt(s,t.id,i,$('#taskWord').value));if(result){currentIndex=0;renderTask();}};
      $('#taskWord').onkeydown=e=>{if(e.key==='Enter')$('#taskCheck').click();};
      $('#taskHint').onclick=()=>{run(()=>{C.taskHint(s,t.id,i);return true;});$('#taskHintText').textContent=rule.hint;};
      $('#taskHintUnclear').onclick=()=>{run(()=>{C.taskHintUnclear(s,t.id,i);return true;});$('#taskHintText').textContent='Deine Rückmeldung ist vermerkt. Du kannst dieses Wort weiter versuchen oder offenlassen.';};
      const skip=reason=>{if(run(()=>{const value=$('#taskWord').value.trim(),latest=C.getTask(s,t.id).items[i];if(value && value!==latest.attempts.at(-1)?.value)C.attempt(s,t.id,i,value);if(latest.status!=='done')C.skipTaskWord(s,t.id,i,reason);return true;})){const latest=C.getTask(s,t.id);const next=latest.items.findIndex(x=>['pending','review'].includes(x.status));if(next<0)resultTask(latest);else{currentIndex=latest.items.filter(x=>x.status!=='done'&&!x.accepted).findIndex(x=>x===latest.items[next]);renderTask();}}};
      $('#taskUnknown').onclick=()=>skip('unknown');$('#taskDisagree').onclick=()=>skip('disagree');$('#taskPause').onclick=()=>pauseTask(t);$('#taskFinish').onclick=()=>resultTask(t,true);
    }
    function speechButtons(){return '<div class="below"><button class="btn-ghost" id="taskSpeak">Noch einmal hören</button><button class="btn-ghost" id="taskSlow">Langsam hören</button><button class="btn-ghost" id="taskChunk">Nächster Satz</button><button class="btn-ghost" id="taskStop">Vorlesen stoppen</button></div><p id="taskSpeechStatus" role="status"></p>';}
    function wireSpeech(text,chunk){
      $('#taskChunk').hidden=!chunk;
      const speak=slow=>{if(!a.canSpeak()){$('#taskSpeechStatus').textContent='Es fehlt eine deutsche Stimme. Bitte deine Eltern, unter Einstellungen eine Stimme zu testen. Deine Aufgabe bleibt gespeichert.';return;}const status=$('#taskSpeechStatus');a.speak(text(),slow).then(ok=>{if(!ok && status.isConnected)status.textContent='Die Stimme konnte nicht abgespielt werden. Bitte Lautstärke und Stimme mit deinen Eltern unter Einstellungen testen.';});};
      $('#taskSpeak').onclick=()=>speak(false);$('#taskSlow').onclick=()=>speak(true);$('#taskChunk').onclick=()=>{if(a.canSpeak())a.speak(chunk(),false);else speak(false);};$('#taskStop').onclick=()=>a.stopSpeech();
    }
    function pauseTask(t){a.stopSpeech();run(()=>{const task=C.getTask(state(),t.id);if(task.status!=='offered')task.status='paused';return true;});currentTask=null;$('#assignmentBox').hidden=true;child();}
    function resultTask(t,explicit=false){
      if(t.items.some(it=>!it.accepted&&['pending','review'].includes(it.status))){if(explicit)message('Einige Wörter sind noch nicht angeschaut. Bearbeite sie oder lass sie einzeln offen.');return;}
      const paid=run(()=>C.settleTask(state(),t.id));if(paid===null)return;
      const done=t.items.filter(it=>it.status==='done'||it.accepted).length;
      $('#assignmentBox').innerHTML='<h3>Dein Ergebnis</h3><p>'+done+' von '+t.items.length+' Wörtern bearbeitet. '+(t.items.length-done)+' Wörter bleiben offen.</p><p><b>'+t.paid+' Extra-Coins</b> für diese Aufgabe gutgeschrieben.'+(paid?' Gerade dazugekommen: '+paid+'.':' Es wurden keine Coins doppelt vergeben.')+'</p><div class="below"><button class="btn" id="taskBack">Zur Übersicht</button>'+(done<t.items.length?'<button class="btn-ghost" id="taskResume">Ein offenes Wort erneut versuchen</button>':'')+'</div>';
      $('#taskBack').onclick=()=>{currentTask=null;$('#assignmentBox').hidden=true;child();};if($('#taskResume'))$('#taskResume').onclick=()=>{currentIndex=0;renderTask();};a.refreshCoins();
    }
    return {parent,child,openWords,message,setup,clear:()=>{a.stopSpeech();currentTask=null;$('#assignmentBox').hidden=true;}};
  }
  return {create};
})();
