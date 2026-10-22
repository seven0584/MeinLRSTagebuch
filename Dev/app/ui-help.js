(function(){
  'use strict';
  const fields='input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]),select,textarea';
  const own='#contextHelpPopover,#documentationDialog,#actionTooltip';
  const helpById={
    childSel:['children','Wählt das Kind, für das die folgenden Einstellungen gelten.'],
    newKidName:['children','Legt ein eigenes Tagebuch mit PIN und Einstellungen für dieses Kind an.'],
    cfgEntryWords:['goals','Mindestanzahl an Wörtern vor dem Prüfen. Ein kleiner Tagesauftrag erleichtert den Einstieg.'],
    cfgEntrySent:['goals','Mindestanzahl ganzer Sätze vor dem Prüfen.'],
    cfgSentWords:['spelling','Ab dieser Wortanzahl zählt ein Satz für den Tagesauftrag und die Belohnung.'],
    cfgDictLevel:['spelling','Wählt den Schwierigkeitsgrad für zusätzliche Diktatübungen.'],
    grammarOn:['grammar','Aktiviert LanguageTool für Grammatik und Kommas. Bei „Prüfen“ wird der Freitext an den Online-Dienst gesendet.'],
    tutorProvider:['tutor','Schaltet die lokale KI-Prüfung und die zusätzliche Lernhilfe ein oder aus. Sie verarbeitet Freitext auf diesem PC.'],
    tutorModel:['tutor','Wählt ein lokales Textmodell. Noch nicht vorhandene Modelle müssen zuerst heruntergeladen werden.'],
    tutorExecution:['graphics','Prozessor ist der kompatible Modus. Grafikbeschleunigung wird vor dem Speichern mit zwei Testfragen geprüft.'],
    moodShareOn:['moods','Bei eingeschalteter Übersicht wählt das Kind vor dem Speichern ein bis drei Gefühle. Diese Auswahl sehen die Eltern.'],
    moodAiOn:['moods','Ergänzt unsichere lokale KI-Hinweise aus dem Freitext, getrennt von der Auswahl des Kindes. Keine Diagnose; Tagesantworten bleiben privat.'],
    topic:['notify','Der Kanalname verbindet diese App mit ntfy auf eurem Handy. Haltet ihn geheim; der Eintragstext wird nicht gesendet.'],
    notifyRead:['notify','Sendet zusätzlich eine Nachricht, wenn die eingestellte aktive Lesezeit erreicht wurde.'],
    readMin:['notify','So lange muss aktiv gelesen werden, bevor eine Lesemeldung verschickt wird. Das ist eine Schätzung.'],
    bkPw1:['backup','Verschlüsselt die heruntergeladene Sicherung. Ohne dieses Kennwort lässt sie sich nicht wiederherstellen.'],
    bkPw2:['backup','Gebt dasselbe Kennwort erneut ein, um Tippfehler beim Sichern zu vermeiden.'],
    rsFile:['backup','Wählt eine zuvor aus dem Tagebuch heruntergeladene Sicherungsdatei.'],
    rsPw:['backup','Kennwort, das beim Erstellen dieser Sicherungsdatei verwendet wurde.'],
    ta:['writing','Hier schreibst du deinen Tagebucheintrag und bearbeitest die markierten Stellen direkt im Text.'],
    helpQuestion:['tutor','Beschreibe, was du meinst oder welchen Hinweis du nicht verstehst. Die lokale Lernhilfe berücksichtigt deine Frage.'],
    pauseFrom:['rewards','Erster Tag der Pause. Pausentage werden bei den Schreibzielen berücksichtigt.'],
    pauseTo:['rewards','Letzter Tag der Pause, einschließlich dieses Tages.'],
    pauseNote:['rewards','Freiwilliger kurzer Grund für die eingetragene Pause.'],
    adjAmount:['rewards','Anzahl Coins für eine manuelle Gutschrift oder einen Abzug.'],
    adjNote:['rewards','Kurze Begründung, damit die Änderung im Coin-Verlauf nachvollziehbar bleibt.'],
    cfgGameBase:['rewards','Spielminuten, die nach dem fertigen Tagebucheintrag freigeschaltet werden.'],
    cfgGameTask:['rewards','Zusätzliche Spielminuten für eine abgeschlossene Übung.'],
    cfgGameMax:['rewards','Obergrenze für die Spielzeit pro Tag.'],
    cfgDays:['rewards','An so vielen Tagen muss geschrieben werden, damit die Wochen-Coins am Sonntag gutgeschrieben werden.'],
    cfgFirst:['rewards','Nur der erste Eintrag eines Tages bringt Coins. Weitere Einträge bleiben möglich.'],
    cfgSent:['rewards','Coins pro ganzem Satz.'],cfgWord:['rewards','Coins pro weiterem Wort.'],cfgComma:['rewards','Zusätzliche Coins für einen Satz mit richtig gesetztem Komma.'],
    cfgJokers:['rewards','Anzahl neuer Joker, die jeden Monat hinzukommen.'],cfgJokerMax:['rewards','So viele Joker können höchstens angespart werden.'],
    dgWord:['storage','Tippt das angezeigte Bestätigungswort genau ein. Erst danach lässt sich die oben beschriebene Aktion bestätigen.'],
    wdIn:['spelling','Schreibe das vorgelesene Wort. Mit „Prüfen“ vergleichst du deine Schreibweise.'],dtIn:['spelling','Schreibe die vorgelesenen Teile. Du kannst sie noch einmal oder langsamer anhören.']
  };
  const actions={
    checkBtn:'Prüft deinen aktuellen Text und zeigt Hinweise zu markierten Stellen.',reviewCancel:'Beendet die zusätzliche KI-Prüfung und zeigt die Wörterbuchhinweise.',
    tutorSetup:'Lädt die lokale KI-Laufzeit und das ausgewählte Modell herunter.',tutorFind:'Sucht auf diesem PC nach geeigneten heruntergeladenen Modellen.',
    tutorSelect:'Vergleicht installierte Modelle mit CPU und Grafik; wählt die schnellste Variante mit zwei passenden Testantworten.',
    tutorSelectCancel:'Bricht den Modellvergleich ab; die gespeicherte Auswahl bleibt erhalten.',tutorTest:'Testet das ausgewählte Modell mit einem erfundenen Beispielsatz.',tutorSave:'Speichert Modell und Verarbeitung für die lokale Lernhilfe.',
    bkDo:'Lädt eine mit eurem Kennwort verschlüsselte Sicherung herunter.',rsDo:'Öffnet die Bestätigung zum Wiederherstellen der gewählten Sicherung.',
    wipeAll:'Öffnet die Löschbestätigung für die Browserdaten; Dateien am Speicherort bleiben erhalten.',
    addKid:'Legt für den eingegebenen Namen ein Kinderprofil an.',addKidTop:'Öffnet die Einstellungen zum Anlegen eines Kindes.',
    resetKidPin:'Öffnet die Bestätigung zum Zurücksetzen der Kinder-PIN.',changePin:'Öffnet die Eingabe einer neuen Eltern-PIN.',kidPinChange:'Öffnet die Eingabe zum Ändern deiner PIN.',
    testLT:'Prüft die Verbindung zur Online-Grammatikprüfung mit einem Beispielsatz.',testNotify:'Sendet eine Testnachricht an den eingestellten ntfy-Kanal.',genTopic:'Erzeugt einen neuen zufälligen Kanalnamen.',
    saveParent:'Speichert die Einstellungen für Handy-Benachrichtigungen.',saveEntryCfg:'Speichert den Tagesauftrag für das ausgewählte Kind.',saveSentWords:'Speichert, ab wie vielen Wörtern ein Satz zählt.',saveCfg:'Speichert die Coin-Regeln für das ausgewählte Kind.',saveGame:'Speichert die Spielzeit-Regeln.',
    pauseAdd:'Trägt die angegebene Pause für das ausgewählte Kind ein.',giftJoker:'Schenkt dem ausgewählten Kind einen zusätzlichen Joker.',adjBtn:'Übernimmt die eingegebene Coin-Änderung in den Verlauf.',addItem:'Fügt dem Shop einen neuen bearbeitbaren Artikel hinzu.',
    lockParent:'Sperrt den Elternbereich und kehrt zur Startseite zurück.',tileParent:'Öffnet den durch die Eltern-PIN geschützten Bereich.',
    nameBtn:'Merkt sich dieses Wort als Namen und prüft den Text erneut.',okBtn:'Akzeptiert die markierte Stelle unverändert.',deferBtn:'Lässt diese Stelle für heute offen und ermöglicht den Abschluss.',moreBtn:'Zeigt einen zusätzlichen Hinweis zur markierten Stelle.',helpCancel:'Beendet das Warten auf die Lernhilfe.',
    tabWrite:'Öffnet deinen Schreibblock.',tabRead:'Öffnet deine gespeicherten Einträge.',tabPractice:'Öffnet die freiwilligen Übungen.',tabGame:'Öffnet die Spiele und deine verfügbare Spielzeit.',tabShop:'Öffnet die Belohnungen, für die du Coins einsetzen kannst.',
    drawDone:'Übernimmt dein Bild und schließt die Malfläche.',kidHelpBtn:'Öffnet die Erklärung zur Bedienung deines Tagebuchs.',kidHelpClose:'Schließt die Hilfe und kehrt zum Tagebuch zurück.',coinBadge:'Zeigt deine Coins und die Belohnungsregeln.'
  };
  Object.assign(actions,{
    moodSave:'Speichert deinen Eintrag mit den ausgewählten Gefühlen.',moodCancel:'Kehrt zum Text zurück, ohne den Eintrag abzuschließen.',readFinished:'Öffnet deinen gespeicherten Text in der Leseansicht.',playFinished:'Öffnet die Spiele und deine verfügbare Spielzeit.',
    eraser:'Schaltet den Radierer für dein Bild ein.',undoDraw:'Macht den letzten Malschritt rückgängig.',clearDraw:'Leert die Malfläche.',
    stNow:'Speichert die aktuellen Daten am angezeigten Speicherort.',stRetry:'Verbindet die App erneut mit dem lokalen Datenspeicher.',stPick:'Öffnet die Auswahl des Tagebuch-Ordners.',stReconnect:'Fragt erneut nach Zugriff auf den gewählten Ordner.',stToFolder:'Wechselt vom Browserspeicher zum Tagebuch-Ordner.',stToBrowser:'Fragt nach dem Wechsel zur Speicherung ausschließlich im Browser.',
    gateRetry:'Versucht erneut, den lokalen Datenspeicher zu verbinden.',gatePick:'Öffnet die einmalige Auswahl des Tagebuch-Ordners.',gateAllow:'Fragt nach der Freigabe des ausgewählten Tagebuch-Ordners.',gateBrowser:'Verwendet den Browserspeicher statt eines Ordners.',
    wdSay:'Liest das aktuelle Übungswort noch einmal vor.',wdSlow:'Liest das aktuelle Wort langsamer vor.',wdCheck:'Prüft deine Eingabe und führt zum nächsten Übungsschritt.',
    dtAll:'Liest den ganzen Diktattext vor.',dtNext:'Liest den nächsten Textabschnitt vor.',dtAgain:'Wiederholt den aktuellen Textabschnitt.',dtSlow:'Liest den aktuellen Textabschnitt langsamer vor.',dtDone:'Beendet die Eingabe und zeigt den Vergleich mit dem Diktattext.',
    ideaNext:'Zeigt eine andere Schreibidee.',ideaRead:'Liest die aktuelle Schreibidee vor.',ideaClose:'Schließt die Schreibidee.',prefsClose:'Schließt die Einstellungen für Schrift und Lesen.',
    gStart:'Startet das Spiel neu.',gPause:'Pausiert das Spiel oder setzt es fort.',gAgain:'Startet eine neue Spielrunde.',arBack:'Beendet die Spielansicht und zeigt alle Spiele.',arBackB:'Beendet die Spielansicht und zeigt alle Spiele.',
    jokerUse:'Setzt einen Joker für den ausgewählten Tag ein.',againBtn:'Öffnet einen weiteren Eintrag für heute.',saveItems:'Speichert die bearbeiteten Shop-Artikel.'
  });
  let counter=0, queued=false, popover, documentation, tooltip, returnFocus, currentInfo, tooltipTarget;
  const clean=text=>(text||'').replace(/\s+/g,' ').trim();
  function labelFor(node){
    if(node.getAttribute('aria-label'))return node.getAttribute('aria-label');
    const label=node.labels?.[0];
    if(label){const copy=label.cloneNode(true);copy.querySelectorAll('input,select,textarea,button').forEach(n=>n.remove());const text=clean(copy.textContent);if(text)return text;}
    return node.getAttribute('placeholder') || node.getAttribute('name') || (node.type==='password'?'PIN oder Kennwort':'Eingabe');
  }
  function topicFor(node){
    const explicit=node.closest('[data-help-topic]')?.dataset.helpTopic;if(explicit)return explicit;
    const section=node.closest('[data-sec]')?.dataset.sec;
    if(section==='moods')return 'moods';if(section==='notify')return 'notify';if(section==='rewards')return 'rewards';if(section==='spelling')return 'spelling';
    if(node.closest('#kidView,#kidLockView'))return 'writing';
    return 'general';
  }
  function infoFor(node){
    const known=helpById[node.id];
    const heading=node.querySelector('h1,h2,h3,.modalhead')?.cloneNode(true);heading?.querySelectorAll('button').forEach(n=>n.remove());
    const title=node.matches(fields)?labelFor(node):clean(node.getAttribute('aria-label') || heading?.textContent || node.textContent).slice(0,100);
    const topic=node.dataset.helpTopic || known?.[0] || topicFor(node);
    let text=node.dataset.helpText || known?.[1];
    if(!text && node.matches(fields)){
      const kind=node.type;
      text=kind==='checkbox'?'Schaltet „'+title+'“ ein oder aus.':node.tagName==='SELECT'?'Wählt die gewünschte Option für „'+title+'“.':kind==='file'?'Wählt die passende Datei von diesem Gerät.':kind==='password'?'Gebt die benötigte PIN oder das Kennwort ein. Die Eingabe wird verdeckt angezeigt.':'Hier gebt ihr „'+title+'“ ein.';
      if(node.min)text+=' Mindestwert: '+node.min+'.';if(node.max)text+=' Höchstwert: '+node.max+'.';
      text+=node.closest('#parentArea')?' Verwendet die zugehörige Speichern-Aktion; Schalter wirken direkt.':'';
    }
    if(!text && node.matches('[role="dialog"],[role="alertdialog"],dialog'))text=[...node.querySelectorAll('p:not(.status),.warn')].map(p=>clean(p.textContent)).filter(Boolean).join('\n\n').slice(0,3000);
    if(!text)text='Hier findet ihr die Erklärung zu „'+title+'“. Änderungen erfolgen erst über die jeweils beschriftete Aktion.';
    const parentView=document.getElementById('parentView'),parentArea=document.getElementById('parentArea');
    const child=!!node.closest('#kidView,#kidLockView') || !!(parentView && (parentView.hidden || parentArea?.hidden));
    return {title:title||'Hilfe',topic,text,child};
  }
  function actionFor(button){
    if(button.dataset.tooltip)return button.dataset.tooltip;
    if(actions[button.id])return actions[button.id];
    const text=clean(button.getAttribute('aria-label') || button.textContent || button.value);
    if(button.hasAttribute('data-context-help'))return 'Zeigt eine kurze Erklärung und den Link zur Dokumentation.';
    if(button.dataset.settingsStep)return 'Öffnet den Einrichtungsschritt „'+text.replace(/^\d+\s*/,'')+'“; speichert keine Änderungen.';
    if(button.dataset.go)return 'Öffnet den Elternbereich „'+text+'“.';
    if(button.hasAttribute('data-home'))return 'Kehrt zur Startseite zurück.';
    if(button.dataset.help)return {hint:'Erklärt die markierte Stelle.',simpler:'Erklärt den Hinweis noch einmal einfacher.',meaning:'Klärt mit dir, welches Wort du meinst.',solution:'Zeigt eine mögliche richtige Schreibweise.'}[button.dataset.help] || 'Fragt die lokale Lernhilfe zur markierten Stelle.';
    if(button.dataset.mood)return 'Wählt dieses Gefühl aus oder ab; bis zu drei Gefühle sind möglich.';
    if(button.hasAttribute('data-buy'))return 'Wünscht diese Belohnung in der eingegebenen Anzahl; die Coins werden bis zur Elternentscheidung reserviert.';
    if(button.hasAttribute('data-ok'))return 'Bestätigt den Einkaufswunsch und zieht die reservierten Coins ab.';
    if(button.hasAttribute('data-no'))return 'Lehnt den Einkaufswunsch ab und gibt die reservierten Coins wieder frei.';
    if(button.hasAttribute('data-delkid'))return 'Öffnet die Bestätigung zum Entfernen dieses Kinderprofils.';
    if(button.hasAttribute('data-done'))return 'Markiert dieses Übungswort als gelernt.';
    if(button.hasAttribute('data-unpause'))return 'Entfernt den angezeigten Pausenzeitraum.';
    if(button.hasAttribute('data-unjoker'))return 'Nimmt den eingeplanten Joker zurück und gibt ihn wieder frei.';
    if(button.hasAttribute('data-kid'))return 'Öffnet die PIN-Eingabe für dieses Tagebuch.';
    if(button.hasAttribute('data-goto'))return 'Öffnet die passende Detailansicht im Elternbereich.';
    if(button.hasAttribute('data-arc'))return 'Öffnet dieses Spiel; die Spielzeit läuft während des Spielens.';
    if(button.hasAttribute('data-k'))return {ArrowLeft:'Bewegt den Spielstein nach links.',ArrowRight:'Bewegt den Spielstein nach rechts.',ArrowUp:'Dreht den Spielstein.',ArrowDown:'Bewegt den Spielstein schneller nach unten.',' ':'Lässt den Spielstein sofort nach unten fallen.'}[button.dataset.k] || 'Steuert das Spiel.';
    if(button.classList.contains('swatch'))return 'Wählt diese Farbe zum Malen.';
    if(button.classList.contains('size'))return 'Wählt diese Strichstärke zum Malen.';
    if(button.hasAttribute('data-size'))return 'Stellt diese Schriftgröße für Lesen und Schreiben ein.';
    if(button.closest('#emoCats'))return 'Zeigt die Emojis dieser Kategorie.';
    if(button.closest('#emoGrid'))return 'Fügt dieses Emoji an der Schreibstelle ein.';
    if(button.classList.contains('err'))return 'Wählt diese markierte Textstelle und zeigt den zugehörigen Hinweis.';
    if(/abbrechen|schließen|alles klar|fertig ✓/i.test(text))return 'Schließt diese Ansicht und kehrt zurück.';
    if(/weiter:|zur übersicht/i.test(text))return 'Wechselt zu „'+text+'“; speichert keine Einstellungen.';
    if(/^zurück$/i.test(text))return 'Kehrt zum vorherigen Schritt zurück.';
    if(/speichern/i.test(text))return 'Speichert die eingegebenen Angaben für diesen Bereich.';
    if(/löschen|entfernen/i.test(text))return 'Entfernt den zugehörigen Eintrag; beachtet eine gegebenenfalls folgende Bestätigung.';
    if(/bestätigen/i.test(text))return 'Bestätigt die oben beschriebene Aktion.';
    return 'Führt die Aktion „'+(text||'Auswählen')+'“ für diesen Eintrag aus.';
  }
  function makeHelp(node){
    if(node.dataset.contextHelpReady || node.closest(own))return;
    node.dataset.contextHelpReady='true';if(!node.id)node.id='help-field-'+(++counter);
    const button=document.createElement('button');button.type='button';button.className='context-help-button';button.dataset.contextHelp='';button.dataset.helpFor=node.id;
    button.textContent='?';button.setAttribute('aria-label','Hilfe zu '+infoFor(node).title);button.title='Zeigt eine kurze Erklärung und den Link zur Dokumentation.';
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openHelp(node,button);});
    if(node.matches('[role="dialog"],[role="alertdialog"],dialog')){
      const heading=node.querySelector('h1,h2,h3,.modalhead');if(heading)heading.append(button);else node.prepend(button);
    }else if(node.matches('[data-help-text]'))node.append(button);
    else if(node.matches('input[type="checkbox"],input[type="radio"]') && node.closest('label'))node.closest('label').append(button);
    else node.insertAdjacentElement('afterend',button);
  }
  function refresh(){
    document.querySelectorAll(fields+',[data-help-text],[role="dialog"],[role="alertdialog"],dialog').forEach(makeHelp);
    document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"]').forEach(button=>{
      if(button.closest(own))return;
      // Keep an intentionally supplied tooltip; refresh the automatic ones after label changes.
      if(!button.hasAttribute('title') || button.dataset.autoTooltip || actions[button.id] || button.classList.contains('swatch') || button.classList.contains('size')){button.title=actionFor(button);button.dataset.autoTooltip='true';}
    });
  }
  function closeHelp(){popover.close();}
  function openHelp(node,trigger){
    hideTooltip();returnFocus=trigger;currentInfo=infoFor(node);
    popover.querySelector('.context-help-title').textContent=currentInfo.title;
    popover.querySelector('.context-help-text').textContent=currentInfo.text;
    const link=popover.querySelector('[data-help-document]');link.href='#dokumentation-'+currentInfo.topic;
    if(!popover.open)popover.showModal();
  }
  function restoreFocus(){if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
  function inline(parent,text){
    // A deliberately small, safe Markdown subset. Text is never inserted as HTML.
    const pattern=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;let from=0;
    for(const match of text.matchAll(pattern)){parent.append(document.createTextNode(text.slice(from,match.index)));let item;
      if(match[1]){item=document.createElement('a');item.href=match[2];item.target='_blank';item.rel='noopener noreferrer';item.textContent=match[1];}
      else{item=document.createElement(match[3]?'strong':'code');item.textContent=match[3]||match[4];}parent.append(item);from=match.index+match[0].length;
    }parent.append(document.createTextNode(text.slice(from)));
  }
  function renderDocument(child=false){
    const content=documentation.querySelector('#documentationContent');content.replaceChildren();const markdown=(child?window.TB_HELP_CONTENT?.childMarkdown:null) || window.TB_HELP_CONTENT?.markdown || '# Bedienung\n\nDie Dokumentation ist in dieser Kopie nicht enthalten.';
    let paragraph=[],list;
    const flush=()=>{if(paragraph.length){const p=document.createElement('p');inline(p,paragraph.join(' '));content.append(p);paragraph=[];}list=null;};
    for(const line of markdown.split(/\r?\n/)){
      const heading=line.match(/^(#{1,4})\s+(.+)$/),bullet=line.match(/^[-*]\s+(.+)$/);
      if(heading){flush();const h=document.createElement('h'+Math.min(heading[1].length+1,5));h.textContent=heading[2];h.dataset.docHeading=heading[2];h.tabIndex=-1;content.append(h);}
      else if(bullet){if(paragraph.length)flush();if(!list){list=document.createElement('ul');content.append(list);}const li=document.createElement('li');inline(li,bullet[1]);list.append(li);}
      else if(!line.trim())flush();else paragraph.push(line);
    }flush();
  }
  function openDocument(event){
    event.preventDefault();popover.close();
    renderDocument(currentInfo.child);
    const title=currentInfo.child && window.TB_HELP_CONTENT?.childMarkdown?'Hilfe für Kinder':window.TB_HELP_CONTENT?.topics?.[currentInfo.topic] || window.TB_HELP_CONTENT?.topics?.general || 'Bedienung';
    documentation.querySelector('#documentationTitle').textContent=title;
    documentation.showModal();const target=[...documentation.querySelectorAll('[data-doc-heading]')].find(h=>h.dataset.docHeading===title);
    if(target){target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}
  }
  function hideTooltip(){if(!tooltip)return;tooltip.hidden=true;if(tooltipTarget){const ids=(tooltipTarget.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id && id!=='actionTooltip');if(ids.length)tooltipTarget.setAttribute('aria-describedby',ids.join(' '));else tooltipTarget.removeAttribute('aria-describedby');}tooltipTarget=null;}
  function showTooltip(target){
    if(!target?.title || target.closest('#documentationDialog,#contextHelpPopover'))return;
    hideTooltip();tooltipTarget=target;tooltip.textContent=target.title;tooltip.hidden=false;
    const rect=target.getBoundingClientRect();tooltip.style.left=Math.min(Math.max(8,rect.left),Math.max(8,innerWidth-tooltip.offsetWidth-8))+'px';
    tooltip.style.top=(rect.bottom+tooltip.offsetHeight+12<innerHeight?rect.bottom+6:Math.max(8,rect.top-tooltip.offsetHeight-6))+'px';
    target.setAttribute('aria-describedby',clean((target.getAttribute('aria-describedby')||'')+' actionTooltip'));
  }
  function init(){
    if(document.getElementById('contextHelpPopover'))return;
    popover=document.createElement('dialog');popover.id='contextHelpPopover';popover.className='context-help-dialog';popover.setAttribute('aria-labelledby','contextHelpTitle');
    popover.innerHTML='<div class="context-help-head"><h2 id="contextHelpTitle" class="context-help-title"></h2><button type="button" data-help-close title="Schließt diese Erklärung." aria-label="Hilfe schließen">×</button></div><p class="context-help-text"></p><a href="#dokumentation" data-help-document>In der Dokumentation weiterlesen →</a>';
    documentation=document.createElement('dialog');documentation.id='documentationDialog';documentation.className='documentation-dialog';documentation.setAttribute('aria-labelledby','documentationTitle');
    documentation.innerHTML='<div class="context-help-head"><h2 id="documentationTitle">Bedienung</h2><button type="button" data-help-close title="Schließt die Dokumentation." aria-label="Dokumentation schließen">×</button></div><article id="documentationContent"></article>';
    tooltip=document.createElement('div');tooltip.id='actionTooltip';tooltip.className='action-tooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;
    document.body.append(popover,documentation,tooltip);renderDocument();
    popover.querySelector('[data-help-close]').onclick=closeHelp;documentation.querySelector('[data-help-close]').onclick=()=>documentation.close();
    popover.querySelector('[data-help-document]').onclick=openDocument;
    popover.addEventListener('close',()=>{if(!documentation.open)restoreFocus();});documentation.addEventListener('close',restoreFocus);
    document.addEventListener('pointerover',event=>{const button=event.target.closest('button,[role="button"],input[type="button"],input[type="submit"]');if(button)showTooltip(button);});
    document.addEventListener('pointerout',event=>{if(tooltipTarget && !tooltipTarget.contains(event.relatedTarget))hideTooltip();});
    document.addEventListener('focusin',event=>{if(event.target.matches('button,[role="button"],input[type="button"],input[type="submit"]'))showTooltip(event.target);});
    document.addEventListener('focusout',hideTooltip);document.addEventListener('scroll',hideTooltip,true);document.addEventListener('keydown',event=>{if(event.key==='Escape')hideTooltip();});
    refresh();new MutationObserver(records=>{if(records.every(record=>record.target.closest?.(own)))return;if(!queued){queued=true;queueMicrotask(()=>{queued=false;refresh();});}}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','type']});
  }
  window.TB_UI_HELP={refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
