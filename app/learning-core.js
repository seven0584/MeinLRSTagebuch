(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.TBLearning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  const VERSION = 1, CATALOG_VERSION = '2026-10-14.2';
  const id = prefix => prefix + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const day = (now = Date.now()) => { const d = new Date(now); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const words = text => [...String(text || '').matchAll(/[\p{L}]+(?:['’\-][\p{L}]+)*/gu)].map(m => ({w:m[0], i:m.index}));
  const lower = s => String(s || '').toLocaleLowerCase('de-DE');
  const CATALOG = {
    gross: ['Großschreibung', 'Wort im Satz', 'Am Satzanfang schreibt man groß. Nomen werden großgeschrieben. Auch ein Verb kann als Nomen gebraucht werden: beim Spielen.', 'Schau auf die Verwendung im Satz. Ein Begleiter kann helfen: das schöne Spiel.', ['Hund','Garten','Blume','Schule','Ball']],
    klein: ['Kleinschreibung', 'Wort im Satz', 'Prüfe die Verwendung im Satz: Wir spielen. Aber: Das Spielen macht Spaß. Namen und Satzanfänge schreibt man groß.', 'Ist es ein Name, ein Nomen oder ein Satzanfang? Der Zusammenhang entscheidet.', ['spielen','laufen','malen','klein','schnell']],
    dopp: ['Doppelte Mitlaute', 'Schreibregeln', 'Nach einem kurzen, betonten Selbstlaut kann ein einzelner Mitlaut doppelt geschrieben werden: kommen. Das gilt nicht nach jedem kurzen Laut: Garten hat nur ein n.', 'Sprich das Wort in Silben. Achte auf die betonte Silbe. In Endungen wie -en wird das n nicht einfach verdoppelt.', ['kommen','Sonne','Mutter','Ball','rennen']],
    ie: ['i oder ie', 'Schreibregeln', 'Ein lang gesprochenes i schreibt man in vielen Wörtern ie: Biene. Es gibt Merkwörter wie Tiger.', 'Sprich das Wort. Ist das i lang? Vergleiche mit Biene. Bei Merkwörtern hilft wiederholtes Üben.', ['Biene','Wiese','Brief','spielen','Tier']],
    dehnung: ['Stummes h', 'Merkwörter', 'Ein lang gesprochener Selbstlaut braucht nicht immer ein h: malen. In fahren steht ein stummes h. Diese Schreibweise musst du dir merken.', 'Suche verwandte Wörter oder schaue die Wortfamilie gemeinsam mit einem Erwachsenen an.', ['fahren','nehmen','Zahl','Stuhl','Sohn']],
    ss: ['s, ss oder ß', 'Schreibregeln', 'Vergleiche Wasser und Straße: Bei einem scharfen s-Laut kann nach kurzem betontem Selbstlaut ss, nach langem Selbstlaut ß stehen. Ein einfaches s gibt es auch: Eis, Haus, Gras.', 'Nur auf die Länge zu hören reicht nicht immer. Verlängere, wenn möglich: Gras – Gräser. Merke dir die Wortfamilie.', ['Wasser','Straße','Fuß','essen','heißen']],
    ae: ['ä oder e', 'Verwandte Wörter', 'Suche ein verwandtes Wort mit a: Hände gehört zu Hand. Deshalb schreibt man ä.', 'Welche Form oder welches verwandte Wort kennst du? Ohne passendes Wort hilft Nachschlagen.', ['Hände','Bälle','Wälder','kälter','stärker']],
    aeu: ['äu oder eu', 'Verwandte Wörter', 'Suche ein verwandtes Wort mit au: Bäume gehört zu Baum. Deshalb schreibt man äu.', 'Vergleiche Häuser und Haus. Nicht jedes eu-Wort hat ein verwandtes Wort mit au.', ['Bäume','Häuser','Mäuse','Räume','träumen']],
    hartweich: ['Wörter verlängern', 'Verwandte Wörter', 'Am Wortende hört man b/p, d/t und g/k oft nicht eindeutig. Verlängere: Hund – Hunde.', 'Versuche die Mehrzahl oder eine längere Form. Höre auf den Laut vor der Endung.', ['Hund','Berg','Korb','Rad','Tag']],
    fvw: ['f, v oder w', 'Merkwörter', 'Manche Wörter mit v klingen wie f: Vogel. Andere klingen wie w: Vase. Übe solche Wörter mit ihrer Bedeutung.', 'Sprich das Wort und merke dir die passende Schreibweise. Ein Wörterbuch oder ein Erwachsener kann helfen.', ['Vogel','Vater','viel','Vase','vier']],
    spiegel: ['b/d oder p/q unterscheiden', 'Buchstabenfolge', 'Schau dir die Form der Buchstaben an. Beim b ist der Bauch rechts, beim d links.', 'Sprich das Wort und prüfe, welcher Buchstabe zum Laut passt. Eine Verwechslung allein sagt nichts über LRS aus.', ['Boden','baden','Bild','dort','Brot']],
    formaehnlich: ['Ähnliche Buchstaben', 'Buchstabenfolge', 'Schau auf die Buchstaben und sprich das Wort langsam. Ähnliche Formen können beim Tippen verwechselt werden.', 'Vergleiche besonders m, n und u. Die App kann nicht erkennen, warum ein Buchstabe vertauscht wurde.', ['Mund','Name','Blume','Minute','Nummer']],
    eiie: ['ei und ie unterscheiden', 'Lautfolge', 'ei klingt wie in Eis. ie klingt wie in Biene. Sprich das Wort langsam.', 'Vergleiche: Reise und Riese. Welches Wort meinst du?', ['Reise','Riese','Biene','Stein','Brief']],
    auslassung: ['Buchstaben ergänzen', 'Buchstabenfolge', 'Sprich das Wort langsam und untersuche seine Teile. Manche Laute schreibt man mit mehreren Buchstaben, zum Beispiel sch.', 'Vergleiche Silbe für Silbe. Bei ie oder einem stummen h hilft auch die Schreibweise der Wortfamilie.', ['Blume','Schule','Garten','Fenster','Wolke']],
    zusatz: ['Zusätzliche Buchstaben prüfen', 'Buchstabenfolge', 'Vergleiche die Buchstaben mit der gemeinten Schreibweise. Nicht jeder geschriebene Buchstabe ist einzeln hörbar: sch, ie und stummes h.', 'Prüfe das Wort in kleinen Teilen. Ein fehlender Laut ist kein sicherer Grund, einen Buchstaben zu streichen.', ['Garten','Fenster','Wolke','Blume','Schule']],
    umstellung: ['Reihenfolge prüfen', 'Buchstabenfolge', 'Sprich das Wort langsam. Vergleiche die Reihenfolge der Wortteile mit den Buchstaben.', 'Gehe die Buchstaben nacheinander durch. Ein Tippfehler ist ebenfalls möglich.', ['Hund','Blume','Garten','Schule','Wolke']],
    unknown: ['Nicht im Wörterbuch', 'Noch unklar', 'Mein Wörterbuch kennt diese Schreibweise nicht. Das Wort kann trotzdem richtig sein. Deshalb habe ich dafür keinen sicheren Rechtschreibtipp.', 'Du kannst selbst verbessern oder „Meine Schreibweise stimmt, bitte prüfen“ wählen. Dann bleibt nur dieses Wort zum gemeinsamen Anschauen offen.', []],
    other: ['Gemeinsam prüfen', 'Noch unklar', 'Die App ist sich bei diesem Wort nicht sicher. Du kannst die Stelle zum gemeinsamen Anschauen offenlassen.', 'Ein Name, ein anderes gemeintes Wort oder eine zulässige Schreibweise kann die Prüfung verwirren.', []]
  };
  const TEXTS = {
    gross:'Der Hund spielt im Garten. Die Sonne scheint auf den Ball.',
    klein:'Wir spielen im Garten. Danach laufen wir schnell nach Hause.',
    dopp:'Die Sonne scheint. Meine Mutter und ich kommen mit dem Ball.',
    ie:'Eine Biene fliegt über die Wiese. Wir spielen neben dem Baum.',
    dehnung:'Wir fahren nach Hause. Mein Stuhl steht neben dem Tisch.',
    ss:'Ich trinke Wasser. Danach gehe ich über die Straße nach Hause.',
    ae:'Meine Hände sind kalt. Die Bälle liegen neben der Tür.',
    aeu:'Vor den Häusern stehen Bäume. Kleine Mäuse laufen durch den Garten.',
    hartweich:'Der Hund läuft zum Berg. Mein Rad steht neben dem Korb.',
    fvw:'Mein Vater sieht einen Vogel. Auf dem Tisch steht eine Vase.',
    spiegel:'Das Bild liegt auf dem Boden. Das Brot liegt dort.',
    formaehnlich:'Die Blume steht am Fenster. Mein Name steht auf dem Bild.',
    eiie:'Die Biene fliegt über einen Stein. Wir schreiben einen Brief.',
    auslassung:'Eine Blume wächst im Garten. Vor dem Fenster steht ein Baum.',
    zusatz:'Eine Wolke steht über dem Garten. Ich öffne das Fenster.',
    umstellung:'Der Hund läuft durch den Garten. Eine Blume steht am Fenster.'
  };
  const CONTEXTS = {"Hund":"Der Hund schläft.","Garten":"Wir spielen im Garten.","Blume":"Die Blume wächst.","Schule":"Ich gehe zur Schule.","Ball":"Der Ball rollt.","spielen":"Wir spielen zusammen.","laufen":"Wir laufen zum Tor.","malen":"Wir malen ein Bild.","klein":"Die Katze ist klein.","schnell":"Das Auto fährt schnell.","kommen":"Wir kommen zu dir.","Sonne":"Die Sonne scheint.","Mutter":"Meine Mutter liest.","rennen":"Wir rennen zum Baum.","Biene":"Die Biene summt.","Wiese":"Die Wiese ist grün.","Brief":"Ich schreibe einen Brief.","Tier":"Dieses Tier schläft.","fahren":"Wir fahren nach Hause.","nehmen":"Wir nehmen den Bus.","Zahl":"Drei ist eine Zahl.","Stuhl":"Der Stuhl ist bequem.","Sohn":"Ihr Sohn spielt.","Wasser":"Ich trinke Wasser.","Straße":"Das Auto fährt auf der Straße.","Fuß":"Mein Fuß tut weh.","essen":"Wir essen einen Apfel.","heißen":"Alle Kinder heißen anders.","Hände":"Ich wasche meine Hände.","Bälle":"Die Bälle rollen.","Wälder":"In den Wäldern wachsen Bäume.","kälter":"Heute ist es kälter als gestern.","stärker":"Der Wind wird stärker.","Bäume":"Hier stehen viele Bäume.","Häuser":"Die Häuser sind bunt.","Mäuse":"Die Mäuse laufen.","Räume":"Unsere Schule hat viele Räume.","träumen":"Manchmal träumen wir nachts.","Berg":"Der Berg ist hoch.","Korb":"Im Korb liegen Äpfel.","Rad":"Mein Rad hat einen platten Reifen.","Tag":"Der Tag ist schön.","Vogel":"Der Vogel singt.","Vater":"Mein Vater kocht.","viel":"Ich habe viel Zeit.","Vase":"In der Vase stehen Blumen.","vier":"Zwei und zwei sind vier.","Boden":"Das Buch liegt auf dem Boden.","baden":"Im Sommer baden wir im See.","Bild":"Ich male ein Bild.","dort":"Dein Ball liegt dort.","Brot":"Ich esse ein Brot.","Mund":"Ich öffne den Mund.","Name":"Mein Name steht auf dem Heft.","Minute":"Eine Minute hat sechzig Sekunden.","Nummer":"Unser Haus hat die Nummer vier.","Reise":"Die Reise dauert lange.","Riese":"Im Märchen wohnt ein Riese.","Stein":"Der Stein ist schwer.","Fenster":"Ich öffne das Fenster.","Wolke":"Eine Wolke zieht vorbei."};
  function nextReview(level,correct){
    const prior=Math.max(0,Math.min(5,Number(level)||0)),next=correct?Math.min(prior+1,5):0;
    return {level:next,days:[0,1,3,7,14,30][next],mastered:!!correct&&prior===5};
  }
  function catalog(key){ const x = CATALOG[key] || CATALOG.other; return {id:CATALOG[key]?key:'other', title:x[0], area:x[1], hint:x[2], more:x[3], pool:x[4], version:CATALOG_VERSION}; }
  function caseRule(c){
    // Old automatic guesses remain in the history, but must not keep supplying
    // a rule hint or recommendation while the word is still unclarified.
    const outdated=c.kind==='diary' && c.catalogVersion!==CATALOG_VERSION && ['active','deferred','contested'].includes(c.status) && !['confirmed','accepted'].includes(c.review);
    return catalog(outdated?'other':c.category);
  }
  function ensure(child){
    if(child.learning?.schema > VERSION) throw Error('Diese Lerndaten stammen aus einer neueren App-Version. Bitte die App aktualisieren; die Daten wurden nicht überschrieben.');
    if(!child.learning) child.learning = {schema:VERSION, since:Date.now(), cases:[], tasks:[], defaultCoins:20, draft:null};
    const l = child.learning;
    l.cases ||= []; l.tasks ||= []; l.schema = VERSION;
    return l;
  }
  function event(c, type, detail = {}, now = Date.now()){
    c.events ||= []; c.events.push({id:id('ev-'),at:now,type,...detail}); c.updatedAt = now;
  }
  // Monotone token alignment. Replacements are matched only within single-word gaps.
  function alignment(a, b){
    const n=a.length,m=b.length;
    if(n*m > 2000000) return [];
    const L=Array.from({length:n+1},()=>new Uint32Array(m+1));
    for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) L[i][j]=a[i]===b[j]?1+L[i+1][j+1]:Math.max(L[i+1][j],L[i][j+1]);
    const matches=[];let i=0,j=0;
    while(i<n&&j<m){if(a[i]===b[j]){matches.push([i++,j++]);}else if(L[i+1][j]>=L[i][j+1])i++;else j++;}
    const out=[];let pi=-1,pj=-1;
    for(const [x,y] of [...matches,[n,m]]){if(x-pi===2&&y-pj===2)out.push([pi+1,pj+1]);if(x<n)out.push([x,y]);pi=x;pj=y;}
    return out;
  }
  function contextAt(text, token){
    const left=text.slice(0,token.i),right=text.slice(token.i+token.w.length);
    return left.slice(Math.max(left.lastIndexOf('.'),left.lastIndexOf('!'),left.lastIndexOf('?'),left.lastIndexOf('\n'))+1).trim().slice(-160)+'|'+right.split(/[.!?\n]/)[0].trim().slice(0,160);
  }
  function reconcile(child, text, marks, source = 'dictionary', now = Date.now(), corrections = []){
    const l=ensure(child), draft=l.draft || (l.draft={id:id('draft-'),text:'',tokens:[]});
    const ts=words(text), old=draft.tokens || [], map=new Map(alignment(old.map(t=>t.w),ts.map(t=>t.w)));
    const live=l.cases.filter(c=>c.draftId===draft.id && c.status!=='changed');
    const taken=new Set();
    for(const c of live){
      // Repeated identical words with changed occurrence counts cannot safely inherit a waiver.
      const oldCount=old.filter(t=>t.w===c.current).length,newCount=ts.filter(t=>t.w===c.current).length;
      const ambiguous=old.length!==ts.length && oldCount!==newCount && (oldCount>1 || newCount>1);
      const ni=ambiguous?undefined:map.get(c.tokenIndex), t=ni===undefined?null:ts[ni];
      if(!t){if(c.status!=='resolved'){c.status='changed';event(c,'text_changed',{},now);}continue;}
      const context=contextAt(text,t), sameContext=contextAt(text,t)===c.context, changed=t.w!==c.current, same=t.w===c.current && context===c.context;
      c.tokenIndex=ni;c.position=t.i;
      const match=marks.find(e=>!e.punct&&e.i===t.i&&e.w===t.w);
      if(t.w!==c.current){event(c,'attempt',{value:t.w},now);c.current=t.w;}
      if(match){
        if(!same || c.status==='resolved'){c.status='active';c.review='unreviewed';}
        c.context=context;c.expected=match.fix||null;c.category=catalog(match.fine).id;c.catalogVersion=CATALOG_VERSION;
        match.caseId=c.id;taken.add(match);
      }else if(changed && sameContext && corrections.some(x=>x.caseId===c.id && x.word===t.w)){
        const correction=corrections.find(x=>x.caseId===c.id && x.word===t.w);
        event(c,'reference_checked',{previous:c.expected,value:t.w},now);
        c.expected=t.w;c.category=catalog(correction.category).id;c.catalogVersion=CATALOG_VERSION;c.status='resolved';c.review='unreviewed';
        event(c,'resolved',{afterHint:c.events.some(e=>e.type==='hint')},now);
      }else if(t.w===c.expected && c.status!=='resolved'){
        c.status='resolved';event(c,'resolved',{afterHint:c.events.some(e=>e.type==='hint')},now);
      }else if(!same && c.status!=='resolved'){c.status='changed';event(c,'text_changed',{},now);}
    }
    for(const e of marks){
      if(e.punct || !/^[\p{L}]+(?:['’\-][\p{L}]+)*$/u.test(e.w) || taken.has(e))continue;
      const ti=ts.findIndex(t=>t.i===e.i&&t.w===e.w);if(ti<0)continue;
      const c={id:id('case-'),draftId:draft.id,entryId:null,kind:'diary',createdAt:now,date:day(now),tokenIndex:ti,position:e.i,original:e.w,current:e.w,expected:e.fix||null,context:contextAt(text,ts[ti]),category:catalog(e.fine).id,catalogVersion:CATALOG_VERSION,source,review:'unreviewed',status:'active',shared:false,events:[]};
      event(c,'observed',{},now);l.cases.push(c);e.caseId=c.id;
    }
    draft.text=text;draft.tokens=ts;draft.updatedAt=now;
    return marks.filter(e=>{const c=l.cases.find(c=>c.id===e.caseId);return !c || !['deferred','contested','accepted'].includes(c.status);});
  }
  function getCase(child, caseId){const c=ensure(child).cases.find(c=>c.id===caseId);if(!c)throw Error('Diese Wortstelle ist nicht mehr vorhanden. Bitte neu prüfen.');return c;}
  function defer(child, caseId, reason, shared=false, now=Date.now()){
    const c=getCase(child,caseId);if(!['unknown','disagree'].includes(reason))throw Error('Ungültiger Grund');
    c.status=reason==='unknown'?'deferred':'contested';c.review=reason==='unknown'?'unreviewed':'contested';c.shared=!!shared;if(reason==='disagree')c.pendingReview={value:c.current,at:now};
    event(c,'deferred',{reason},now);return c;
  }
  function hint(child, caseId, level=1){const c=getCase(child,caseId);if(!c.events.some(e=>e.type==='hint'&&e.level===level))event(c,'hint',{level,version:CATALOG_VERSION});}
  function hintUnclear(child,caseId){const c=getCase(child,caseId);event(c,'hint_unclear');}
  function refreshSummary(child,c){const e=(child.entries||[]).find(e=>e.id===c.entryId);if(e)e.learningSummary=summarize(ensure(child).cases.filter(x=>x.entryId===c.entryId));}
  function draftSummary(child){const l=ensure(child),cs=l.cases.filter(c=>c.draftId===l.draft?.id);return summarize(cs);}
  function summarize(cs){
    const s={total:0,pendingReviews:0,resolved:0,afterHint:0,deferred:0,contested:0,accepted:0,active:0,changed:0};
    for(const c of cs){s.total++;if(c.pendingReview)s.pendingReviews++;if(c.review==='accepted'){s.accepted++;continue;}if(c.review==='contested'&&c.status!=='resolved'){s.contested++;continue;}if(c.status==='resolved'){s.resolved++;if(c.events.some(e=>e.type==='hint'))s.afterHint++;}else if(s[c.status]!==undefined)s[c.status]++;}
    return s;
  }
  function finishDraft(child, entryId){const l=ensure(child),summary=draftSummary(child);for(const c of l.cases.filter(c=>c.draftId===l.draft?.id))c.entryId=entryId;l.draft=null;return summary;}
  function stats(child, now=Date.now()){
    const l=ensure(child),cut=now-30*86400000,cs=l.cases.filter(c=>c.createdAt>=cut),groups={};
    for(const c of cs){const key=caseRule(c).id;(groups[key] ||= []).push(c);}
    const entries=(child.entries||[]).filter(e=>e.date>=day(now-29*86400000)&&e.date<=day(now));
    return {writing:{entries:entries.length,words:entries.reduce((sum,e)=>sum+(e.words??words([e.text,...Object.values(e.answers||{})].join(' ')).length),0)},since:l.since,summary:summarize(cs),cases:cs,groups:Object.entries(groups).map(([key,cases])=>({key,...catalog(key),...summarize(cases),cases})), olderOpen:l.cases.filter(c=>c.createdAt<cut&&(c.pendingReview||['deferred','contested'].includes(c.status))),legacy:(child.entries||[]).filter(e=>!e.learningSummary).length};
  }
  function recommendations(child, now=Date.now()){
    return stats(child,now).groups.flatMap(g=>{
      const eligible=g.cases.filter(c=>c.expected&&!['contested','accepted','uncertain'].includes(c.review)&&!c.pendingReview&&c.status!=='changed');
      const wordCount=new Set(eligible.map(c=>lower(c.expected))).size,days=new Set(eligible.map(c=>c.date)).size;
      if(!g.pool.length || wordCount<3 || days<2)return [];
      return [{category:g.key,title:g.title,count:eligible.length,reason:wordCount+' verschiedene Wörter an '+days+' Tagen. Die automatische Zuordnung kann unzutreffend sein.'}];
    });
  }
  function materials(category, type, count=5){
    const rule=catalog(category);if(!rule.pool.length)throw Error('Für diese Klasse gibt es noch keine geprüfte Aufgabe.');
    if(type==='text'){const text=TEXTS[category];return {text,items:words(text).map((t,index)=>({word:t.w,category:rule.pool.some(w=>lower(w)===lower(t.w))?category:'other',context:text,index}))};}
    const n=Math.max(1,Math.min(rule.pool.length,Math.floor(Number(count)||5)));
    return {text:'',items:rule.pool.slice(0,n).map((word,index)=>({word,category,context:CONTEXTS[word],index}))};
  }
  function assign(child, options){
    const l=ensure(child),category=catalog(options.category).id,type=options.type==='text'?'text':'words',m=materials(category,type,options.count);
    const maxCoins=Number(options.coins);if(!Number.isSafeInteger(maxCoins)||maxCoins<0||maxCoins>10000)throw Error('Bitte ganze Coins zwischen 0 und 10.000 eingeben.');
    const task={id:id('task-'),createdAt:Date.now(),category,type,text:m.text,maxCoins,paid:0,status:'offered',catalogVersion:CATALOG_VERSION,items:m.items.map(it=>({...it,status:'pending',attempts:[],hints:[]}))};
    l.tasks.push(task);l.defaultCoins=maxCoins;return task;
  }
  function editTask(child,taskId,options){
    const t=getTask(child,taskId);
    if(t.status!=='offered'||t.startedAt||t.textDraft)throw Error('Diese Aufgabe wurde bereits begonnen. Die Vereinbarung bleibt bestehen; ihr könnt die Aufgabe zurücknehmen und eine neue anbieten.');
    const next=assign(child,options);ensure(child).tasks.pop();
    const id=t.id,createdAt=t.createdAt;Object.assign(t,next,{id,createdAt});return t;
  }
  function getTask(child, taskId){const t=ensure(child).tasks.find(t=>t.id===taskId);if(!t)throw Error('Aufgabe nicht gefunden.');return t;}
  function taskCase(child,t,index){
    const it=t.items[index];let c=ensure(child).cases.find(c=>c.id===it.caseId);
    if(!c){c={id:id('case-'),taskId:t.id,itemIndex:index,kind:'task',date:day(),createdAt:Date.now(),original:it.attempts[0]?.value||'',current:it.attempts.at(-1)?.value||'',expected:it.word,context:it.context,category:it.category,catalogVersion:t.catalogVersion,source:'curated',review:'reference',status:'active',shared:true,events:it.hints.map(level=>({id:id('ev-'),at:Date.now(),type:'hint',level,version:CATALOG_VERSION}))};ensure(child).cases.push(c);it.caseId=c.id;event(c,'observed');}
    return c;
  }
  function attempt(child,taskId,index,value){
    const t=getTask(child,taskId),it=t.items[index];if(t.status==='withdrawn'||!it)throw Error('Diese Aufgabe kann nicht bearbeitet werden.');
    value=String(value||'').normalize('NFC').trim();if(!/\p{L}/u.test(value))throw Error('Schreib zuerst einen eigenen Versuch oder lass dieses Wort offen.');
    if(value.length>150)throw Error('Bitte nur dieses Wort eingeben.');
    it.accepted=false;t.startedAt ||= Date.now();t.status='active';it.attempts.push({at:Date.now(),value});it.status=value===it.word?'done':'review';
    if(it.firstCorrect===undefined)it.firstCorrect=it.status==='done';
    if(it.status!=='done'||it.caseId){const c=taskCase(child,t,index);c.current=value;c.status=it.status==='done'?'resolved':'active';c.review='reference';event(c,'attempt',{value});if(it.status==='done')event(c,'resolved',{afterHint:it.hints.length>0});}
    return it;
  }
  function taskHint(child,taskId,index,level=1){const t=getTask(child,taskId),it=t.items[index];t.startedAt ||= Date.now();t.status='active';if(!it.hints.includes(level))it.hints.push(level);if(it.caseId)hint(child,it.caseId,level);}
  function taskHintUnclear(child,taskId,index){const t=getTask(child,taskId);t.startedAt ||= Date.now();t.status='active';const c=taskCase(child,t,index);hintUnclear(child,c.id);}
  function skipTaskWord(child,taskId,index,reason){const t=getTask(child,taskId),it=t.items[index];if(t.status==='withdrawn')throw Error('Diese Aufgabe wurde zurückgenommen.');t.startedAt ||= Date.now();t.status='active';const c=taskCase(child,t,index);defer(child,c.id,reason,true);it.status=reason==='disagree'?'contested':'skipped';}
  function submitText(child,taskId,text){
    const t=getTask(child,taskId),typed=words(text).map(w=>w.w),pairs=alignment(t.items.map(it=>it.word),typed),map=new Map(pairs);
    t.typed=String(text);t.startedAt ||= Date.now();t.status='active';t.extraWords=0;
    // Equal-size unmatched stretches have a positional first attempt. Unequal stretches remain uncertain.
    let pi=-1,pj=-1;
    for(const [x,y] of [...pairs,[t.items.length,typed.length]]){if(x-pi===y-pj)for(let k=1;k<x-pi;k++)map.set(pi+k,pj+k);pi=x;pj=y;}
    t.extraWords=Math.max(0,typed.length-new Set(map.values()).size);
    t.items.forEach((it,i)=>{const j=map.get(i);if(j!==undefined)attempt(child,taskId,i,typed[j]);else{it.status='review';taskCase(child,t,i);}});
    return t;
  }
  function payable(t){return Math.floor(t.maxCoins*t.items.filter(it=>it.status==='done'||it.accepted).length/t.items.length);}
  function settleTask(child,taskId,withdraw=false){
    const t=getTask(child,taskId);if(!withdraw&&t.items.some(it=>!it.accepted&&['pending','review'].includes(it.status)))throw Error('Schau die übrigen Wörter an oder lass sie einzeln offen.');
    if(t.status==='withdrawn'&&!withdraw)return 0;
    t.status=withdraw?'withdrawn':t.items.every(it=>it.status==='done'||it.accepted)?'complete':'partial';t.closedAt=Date.now();
    child.reward ||= {};child.reward.ledger ||= [];
    const ledgerPaid=child.reward.ledger.filter(l=>l.type==='task'&&l.taskId===t.id).reduce((s,l)=>s+l.amount,0);
    const already=Math.max(t.paid||0,ledgerPaid),amount=Math.max(0,payable(t)-already);
    if(amount)child.reward.ledger.push({id:'task-'+t.id+'-'+(already+amount),taskId:t.id,type:'task',amount,at:Date.now(),note:'Zusatzaufgabe: '+catalog(t.category).title});
    t.paid=already+amount;return amount;
  }
  function review(child,caseId,result,note=''){
    const c=getCase(child,caseId);if(c.kind==='diary'&&!c.shared)throw Error('Das Kind hat diese Stelle noch nicht geteilt. Ohne Kontext bleibt die Bewertung offen.');
    if(result==='accepted' && c.taskId && !getTask(child,c.taskId).items[c.itemIndex].attempts.length)throw Error('Es liegt noch keine eigene Antwort vor, die anerkannt werden kann.');
    if(!['accepted','confirmed','uncertain'].includes(result))throw Error('Ungültiges Prüfergebnis');
    if(c.status==='accepted' && result!=='accepted')c.status=c.beforeAccepted||'deferred';
    const reviewedValue=c.pendingReview?.value||c.current;delete c.pendingReview;
    c.review=result;c.reviewNote=String(note).slice(0,500);event(c,'parent_review',{result,value:reviewedValue,note:c.reviewNote});
    if(result==='accepted'){if(c.status!=='accepted')c.beforeAccepted=c.status;c.status='accepted';}
    if(result==='confirmed' && c.status==='contested')c.status='deferred';
    refreshSummary(child,c);
    if(c.taskId){const t=getTask(child,c.taskId),it=t.items[c.itemIndex];it.accepted=result==='accepted'&&it.attempts.some(a=>/\p{L}/u.test(a.value));if(['complete','partial','withdrawn'].includes(t.status))settleTask(child,t.id,t.status==='withdrawn');}
    return c;
  }
  return {VERSION,CATALOG_VERSION,CATALOG,TEXTS,catalog,caseRule,nextReview,ensure,words,alignment,reconcile,getCase,defer,hint,hintUnclear,draftSummary,finishDraft,stats,recommendations,materials,assign,editTask,getTask,attempt,taskHint,taskHintUnclear,skipTaskWord,submitText,payable,settleTask,review,day};
});
