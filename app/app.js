(function(){
  const $ = s => document.querySelector(s);
  const ta = $("#ta"), checkBtn = $("#checkBtn"), statusEl = $("#status");
  const resultEl = $("#result"), doneEl = $("#doneArea"), warnEl = $("#warn");
  const KEY = "schreibheft-v1";

  // family store: shared parent settings + one data object per child; `state` always points to the active child
  let family = null;
  function freshChild(name){ return { id:"c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name || "", reward: null, readLog: {}, entries: [], words: {}, names: [], draft: "", draftQ: {}, kidPinHash: "", kidPinReset: false }; }
  let state = Object.assign(freshChild(""), { parent: { pin:"", topic:"", notifyRead:false, lastReadPing:"", readMin:2, queue:[], grammar:true } });
  let hun = null;
  let session = newSession();

  function newSession(){ return { cats:{}, catKeys:{}, checks:0, firstCount:0, found:{}, current:[], checkedText:"", active:-1, more:false }; }

  // ---------- helpers ----------
  const pad2 = n => String(n).padStart(2,"0");
  const keyOf = d => d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  const todayKey = () => keyOf(new Date());
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function fmtDate(k){ const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"}); }
  const lower = w => w.toLocaleLowerCase("de-DE");
  const cap = w => w.charAt(0).toLocaleUpperCase("de-DE") + w.slice(1);
  const isUpper1 = w => w.charAt(0) !== w.charAt(0).toLocaleLowerCase("de-DE");

  // ---------- storage ----------
  function load(){
    let raw = null; try{ raw = JSON.parse(localStorage.getItem(KEY) || "null"); }catch(e){}
    if(raw && raw.v === 2 && raw.data){ family = raw; }
    else {
      // older single-child format: turn it into the first child (only if there is something to keep)
      family = { v:2, parent: Object.assign({}, state.parent, (raw && raw.parent) || {}), salt: (raw && raw.salt) || "", children: [], data: {}, active: null };
      if(raw && ((raw.entries && raw.entries.length) || raw.kidPinHash || Object.keys(raw.words || {}).length || raw.reward)){
        const c = freshChild((family.parent.childName || "").trim());
        const rest = Object.assign({}, raw); delete rest.parent; delete rest.salt;
        Object.assign(c, rest, { id: c.id, name: c.name });
        family.children.push(c.id); family.data[c.id] = c; family.legacyDraft = c.id;
      }
      delete family.parent.childName;
    }
    family.parent = Object.assign({ pin:"", topic:"", notifyRead:false, lastReadPing:"", readMin:2, queue:[], grammar:true }, family.parent || {});
    family.parent.queue = family.parent.queue || [];
    family.children = family.children.filter(id => family.data[id]);
    useChild(family.data[family.active] ? family.active : family.children[0]);
  }
  function useChild(id){
    const c = id && family && family.data[id];
    state = c || freshChild("");
    state.parent = family ? family.parent : state.parent;   // shared, never stored inside a child
    if(c) family.active = id;
  }
  function withChild(id, fn){ const prev = state, act = family.active; useChild(id); try{ return fn(); } finally { state = prev; family.active = act; } }
  function save(){
    if(!family) return;
    family.savedAt = Date.now();
    try{ localStorage.setItem(KEY, JSON.stringify(family, function(k, v){ return k === "parent" && this !== family ? undefined : v; })); }catch(e){}
    if(typeof scheduleAutoSave === "function") scheduleAutoSave();
  }

  // ---------- dictionary ----------
  function b64(id){ const s = ((window.TB_DATA && window.TB_DATA[id]) || document.getElementById(id).textContent).trim(); const bin = atob(s); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
  async function initSpell(){
    try{
      const factory = await HunspellAsm.loadModule({ timeout: 60000 });
      const aff = factory.mountBuffer(b64("affData"), "de.aff");
      const dic = factory.mountBuffer(b64("dicData"), "de.dic");
      hun = factory.create(aff, dic);
      buildNouns();
      state.names.forEach(n => hun.addWord(n));
      spellReady = true;
      updateCount();
    }catch(e){
      statusEl.textContent = "";
      showWarn("Das Wörterbuch konnte nicht geladen werden. Bitte öffne die Datei in einem aktuellen Browser (Chrome, Edge, Firefox oder Safari).");
    }
  }

  // ---------- noun detection (for words that are also valid lowercase, e.g. "freund", "park") ----------
  let NOUNS = new Set();
  function buildNouns(){
    try{
      const txt = new TextDecoder("utf-8").decode(b64("dicData"));
      for(const line of txt.split("\n")){
        const stem = line.split("/")[0].trim();
        if(stem && isUpper1(stem) && stem.slice(1) === lower(stem.slice(1))) NOUNS.add(lower(stem));
      }
    }catch(e){}
  }
  function nounCapable(w){
    const l = lower(w);
    if(NOUNS.has(l)) return true;
    for(const end of ["e","en","n","es","s","er","ern"]) if(l.length > end.length + 2 && l.endsWith(end) && NOUNS.has(l.slice(0, -end.length))) return true;
    return false;
  }
  const DET = new Set(("der die das den dem des ein eine einen einem einer eines kein keine keinen keinem keiner keines "+
    "mein meine meinen meinem meiner meines dein deine deinen deinem deiner deines sein seine seinen seinem seiner seines "+
    "ihr ihre ihren ihrem ihrer ihres unser unsere unseren unserem unserer unseres euer eure euren eurem eurer eures "+
    "dieser diese diesen diesem dieses jeder jede jeden jedem jedes im am beim zum zur vom ins ans aufs").split(" "));
  const STOP = new Set(("und oder aber denn sondern weil dass wenn als wie ob mit in an auf aus bei nach von zu für über unter vor hinter neben zwischen durch gegen ohne um bis seit "+
    "ich du er sie es wir man mich dich sich uns euch mir dir ihm ihn ihnen nicht auch noch schon sehr viel viele gern gerne dann da hier dort heute morgen gestern immer nie oft mal "+
    "ist war bin bist sind waren hat habe hatte haben hatten wird werden kann können will wollen muss müssen darf soll sollen gibt gab ganz so nur wieder mehr alle alles etwas nichts").split(" "));
  const ARTICLE_PRONOUN = new Set("der die das den dem".split(" "));
  function gap(text, a, b){ return text.slice(a.i + a.w.length, b.i); }
  function nounContext(text, toks, k){
    const cur = toks[k], w = lower(cur.w);
    if(STOP.has(w) || DET.has(w)) return false;
    const nxt = toks[k+1];
    if(nxt && /^\s+$/.test(gap(text, cur, nxt)) && (isUpper1(nxt.w) || (nounCapable(nxt.w) && !STOP.has(lower(nxt.w))))) return false; // "die kleine Katze"
    if(w === "hause" && k > 0 && /^(nach|zu|zuhause)$/.test(lower(toks[k-1].w))) return true;
    const detOk = j => {
      if(j < 0) return false;
      const d = lower(toks[j].w);
      if(!DET.has(d)) return false;
      if(ARTICLE_PRONOUN.has(d) && (toks[j].start || (j > 0 && /,/.test(gap(text, toks[j-1], toks[j]))))) return false; // "Die spielen …", ", die spielen"
      if(d === "am" && /sten$/.test(w)) return false; // am liebsten
      return true;
    };
    if(k >= 1 && /^\s+$/.test(gap(text, toks[k-1], cur)) && detOk(k-1)) return true;
    if(k >= 2){
      const adj = toks[k-1];
      if(!isUpper1(adj.w) && /(e|en|er|em|es)$/.test(lower(adj.w)) && !DET.has(lower(adj.w)) &&
         /^\s+$/.test(gap(text, adj, cur)) && /^\s+$/.test(gap(text, toks[k-2], adj)) && detOk(k-2) &&
         !(lower(toks[k-2].w) === "am" && /sten$/.test(lower(adj.w)))) return true;
    }
    return false;
  }

  // ---------- spell check ----------
  function correct(w){
    if(hun.spell(w)) return true;
    if(w.includes("-")) return w.split("-").every(p => !p || /\d/.test(p) || hun.spell(p) || p.length === 1);
    if(w.endsWith("'s")) return hun.spell(w.slice(0,-2));
    return false;
  }
  // ---------- free text + optional questions ----------
  const QUESTIONS = [["best","Das Beste heute:"],["learned","Das habe ich heute gelernt:"],["tomorrow","Was ich morgen schaffen möchte:"]];
  const ALL_Q = [["best","Das Beste heute:"],["worst","Das Schlimmste heute:"],["learned","Das habe ich heute gelernt:"],["tomorrow","Was ich morgen schaffen möchte:"]]; // "worst" only for older entries
  const qa = {}; document.querySelectorAll("textarea.qa").forEach(el => { qa[el.dataset.q] = el; });
  const allFields = () => [ta, ...Object.values(qa)];
  let SEG = null;
  function fieldValues(){ const v = { free: ta.value.trim() }; QUESTIONS.forEach(([k]) => { v[k] = qa[k].value.trim(); }); return v; }
  function contentText(v = fieldValues()){ return [v.free, ...QUESTIONS.map(([k]) => v[k])].filter(Boolean).join("\n"); }
  function compose(v = fieldValues(), list = QUESTIONS){
    let text = ""; const labels = [], parts = [];
    const add = (label, body) => {
      if(!body) return;
      if(text) text += "\n\n";
      if(label){ labels.push([text.length, text.length + label.length]); text += label + "\n"; }
      parts.push([text.length, text.length + body.length]); text += body;
    };
    add(null, v.free); list.forEach(([k, l]) => add(l, v[k]));
    SEG = { text, labels, parts };
    return text;
  }
  const inLabel = (labels, a, b) => (labels || []).some(([x, y]) => a < y && b > x);
  function escSeg(text, a, b, labels){ // escape text[a,b) and make question labels bold
    let out = "", p = a;
    for(const [x, y] of labels || []){
      if(y <= p || x >= b) continue;
      out += esc(text.slice(p, Math.max(p, x))) + '<span class="lbl">' + esc(text.slice(Math.max(p, x), Math.min(b, y))) + '</span>';
      p = Math.min(b, y);
    }
    return out + esc(text.slice(p, b));
  }
  function entryText(e){ const v = { free: e.text || "" }; ALL_Q.forEach(([k]) => { v[k] = (e.answers && e.answers[k]) || ""; }); const s = compose(v, ALL_Q); return { text: s, labels: SEG.labels }; }
  function entryHtml(e){ const x = entryText(e); return escSeg(x.text, 0, x.text.length, x.labels); }

  function tokens(text){
    const out = []; const re = /[\p{L}]+(?:['’-][\p{L}]+)*/gu; let m;
    const seg = SEG && SEG.text === text ? SEG : null; let lastPart = -1;
    while((m = re.exec(text))){
      const raw = text.slice(0, m.index);
      const before = raw.replace(/[\s"„“‚‘(\[»«]+$/u, "");
      const ellipsis = /(\.\.\.|…)$/.test(before);
      const start = before === "" || (/[.!?]$/.test(before) && !ellipsis);
      const soft = ellipsis || /:$/.test(before) || raw.slice(before.length).includes("\n");
      const tok = { w: m[0], i: m.index, start, soft };
      if(seg){
        const pi = seg.parts.findIndex(([a, b]) => m.index >= a && m.index < b);
        tok.part = pi;
        if(pi >= 0 && pi !== lastPart){ tok.start = true; tok.soft = false; lastPart = pi; } // every answer starts a new sentence
        if(inLabel(seg.labels, m.index, m.index + m[0].length)) tok.label = true;
      }
      out.push(tok);
    }
    return out;
  }
  function diffIndex(a, b){ let i=0; while(i<a.length && i<b.length && a[i]===b[i]) i++; return i; }
  function where(i, len){ if(i <= 0) return "ganz am Anfang des Wortes"; if(i < len/3) return "am Anfang des Wortes"; if(i < 2*len/3) return "in der Mitte des Wortes"; return "am Ende des Wortes"; }
  function oneEdit(a, b){ // one insertion/deletion/substitution/transposition
    if(Math.abs(a.length-b.length) > 1) return false;
    let i = diffIndex(a,b);
    if(a.length === b.length){
      if(a.slice(i+1) === b.slice(i+1)) return true;
      return a[i]===b[i+1] && a[i+1]===b[i] && a.slice(i+2)===b.slice(i+2);
    }
    return a.length > b.length ? a.slice(i+1)===b.slice(i) : a.slice(i)===b.slice(i+1);
  }
  function classify(w, s){
    const a = lower(w), b = s ? lower(s) : "";
    const T = {
      ss: ["s, ss oder ß", "Hör genau hin: Ist der Vokal davor lang oder kurz? Nach einem langen Vokal oder ei, au, eu schreibt man ß, nach einem kurzen ss."],
      dbl: ["Doppelkonsonant", "Ein Konsonant oder zwei gleiche? Sprich das Wort deutlich: Nach einem kurzen Vokal kommen oft zwei."],
      ie: ["ie oder i", "i oder ie? Wird das i lang gesprochen, schreibt man meistens ie."],
      h: ["Dehnungs-h", "Es geht um ein h, das man nicht hört. Fehlt eins, oder ist eins zu viel? Denk an ein verwandtes Wort."],
      ae: ["ä oder e", "Gibt es ein verwandtes Wort mit a? Dann schreibt man ä (Wald → Wälder)."],
      aeu: ["äu oder eu", "Gibt es ein verwandtes Wort mit au? Dann schreibt man äu (Haus → Häuser)."],
      end: ["b/p, d/t oder g/k", "Verlängere das Wort, dann hörst du den Buchstaben deutlich (Hund → Hunde)."],
      fv: ["f, v oder w", "Das ist ein Merkwort. Schau dir das Wort genau an und präge es dir ein."],
      eiie: ["ei oder ie", "Sprich das Wort langsam: Hörst du ei wie in „Eis“ oder ein langes i wie in „Biene“?"],
      spiegel: ["b oder d, p oder q", "Diese Buchstaben sehen sich ähnlich, sie sind nur gespiegelt. Schau genau, auf welcher Seite der Bauch ist."],
      form: ["m, n oder u", "Diese Buchstaben sehen sich ähnlich. Zähle die Bögen und sprich den Laut leise mit."],
      swap: ["Buchstaben vertauscht", "Zwei Buchstaben stehen in der falschen Reihenfolge. Sprich das Wort langsam Laut für Laut."],
      miss: ["Buchstabe fehlt", "Hier fehlt ein Buchstabe. Sprich das Wort ganz langsam in Silben und schreib jeden Laut mit."],
      extra: ["Buchstabe zu viel", "Hier ist ein Buchstabe zu viel. Sprich das Wort langsam und vergleiche jeden Laut."],
      one: ["Buchstabe fehlt, zu viel oder vertauscht", "Sprich das Wort ganz langsam in Silben und schreib jeden Laut mit."],
      other: ["Schau genau hin", "Sprich das Wort langsam in Silben. Wie schreibt man die einzelnen Teile?"]
    };
    const pick = k => ({ cat:T[k][0], tip:T[k][1], generic: ["one","other","miss","extra","swap"].includes(k) });
    const swap = (x, p, q) => x.split(p).join(q);
    if(!s) return pick("other");
    if(swap(a,"ß","ss")===swap(b,"ß","ss") || swap(a,"ss","s")===swap(b,"ss","s") || swap(a,"ß","s")===swap(b,"ß","s")) return pick("ss");
    if(a !== b && (swap(a,"ei","ie")===b || swap(a,"ie","ei")===b)) return pick("eiie");
    if(swap(a,"äu","eu")===swap(b,"äu","eu")) return pick("aeu");
    if(swap(a,"ä","e")===swap(b,"ä","e")) return pick("ae");
    if(swap(a,"ie","i")===swap(b,"ie","i")) return pick("ie");
    const dedup = x => x.replace(/([bcdfgklmnprstz])\1/g, "$1").replace(/ck/g,"k").replace(/tz/g,"z");
    if(dedup(a)===dedup(b)) return pick("dbl");
    const noH = x => x.replace(/([aeiouäöü])h/g, "$1");
    if(noH(a)===noH(b)) return pick("h");
    const hard = x => x.replace(/[dt]/g,"t").replace(/[bp]/g,"p").replace(/[gk]/g,"k");
    if(hard(a)===hard(b)) return pick("end");
    const fv = x => x.replace(/[fvw]/g,"f").replace(/ph/g,"f");
    if(fv(a)===fv(b)) return pick("fv");
    const ops = editOps(a, b);
    if(ops.length === 1){ const c = opCat(ops[0]); const k = { spiegel:"spiegel", formaehnlich:"form", umstellung:"swap", auslassung:"miss", zusatz:"extra" }[c]; if(k) return pick(k); }
    if(oneEdit(a,b)) return pick("one");
    return pick("other");
  }
  // ---------- error categories for the parent overview (no words, only kinds of mistakes) ----------
  function editOps(a, b){ // Damerau-Levenshtein with backtrace
    const m = a.length, n = b.length, d = Array.from({length:m+1}, () => new Array(n+1).fill(0));
    for(let i=0;i<=m;i++) d[i][0] = i; for(let j=0;j<=n;j++) d[0][j] = j;
    for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (a[i-1]===b[j-1]?0:1));
      if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2]+1);
    }
    const ops = []; let i = m, j = n;
    while(i > 0 || j > 0){
      if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1] && a[i-1]!==a[i-2] && d[i][j]===d[i-2][j-2]+1){ ops.push({ t:"swap" }); i-=2; j-=2; }
      else if(i>0 && j>0 && d[i][j]===d[i-1][j-1] + (a[i-1]===b[j-1]?0:1)){ if(a[i-1]!==b[j-1]) ops.push({ t:"sub", a:a[i-1], b:b[j-1] }); i--; j--; }
      else if(i>0 && d[i][j]===d[i-1][j]+1){ ops.push({ t:"extra", a:a[i-1] }); i--; }
      else { ops.push({ t:"miss", b:b[j-1] }); j--; }
    }
    return ops;
  }
  function opCat(o){
    if(o.t === "swap") return "umstellung";
    if(o.t === "miss") return "auslassung";
    if(o.t === "extra") return "zusatz";
    const p = [o.a, o.b].sort().join("");
    if(p === "bd" || p === "pq") return "spiegel";
    if(p === "mn" || p === "nu" || p === "mw") return "formaehnlich";
    if(p === "bp" || p === "dt" || p === "gk") return "hartweich";
    if(p === "fv" || p === "vw" || p === "fw") return "fvw";
    return "other";
  }
  function fineCats(w, fix){
    if(!fix) return ["other"];
    const a = lower(w), b = lower(fix), cats = [];
    if(isUpper1(w) !== isUpper1(fix)) cats.push(isUpper1(fix) ? "gross" : "klein");
    if(a === b) return cats.length ? cats : ["other"];
    const sw = (x, p, q) => x.split(p).join(q);
    const sNorm = x => sw(sw(x, "ß", "ss"), "ss", "s");
    const dedup = x => x.replace(/([bcdfgklmnprstz])\1/g, "$1").replace(/ck/g,"k").replace(/tz/g,"z");
    const noH = x => x.replace(/([aeiouäöü])h/g, "$1");
    if(sNorm(a) === sNorm(b)) cats.push("ss");
    else if(sw(a,"ei","ie") === b || sw(a,"ie","ei") === b) cats.push("eiie");
    else if(sw(a,"äu","eu") === sw(b,"äu","eu")) cats.push("aeu");
    else if(sw(a,"ä","e") === sw(b,"ä","e")) cats.push("ae");
    else if(sw(a,"ie","i") === sw(b,"ie","i")) cats.push("ie");
    else if(dedup(a) === dedup(b)) cats.push("dopp");
    else if(noH(a) === noH(b)) cats.push("dehnung");
    else editOps(a, b).forEach(o => cats.push(opCat(o)));
    return [...new Set(cats)];
  }
  const KIND = { "Komma":"komma", "Satzende":"satzende", "Leerzeichen":"leer", "Satzzeichen":"satzz", "das oder dass":"dassdas",
    "Wörter passen nicht zusammen":"fall", "Verb passt nicht":"verb", "Grammatik":"grammatik", "Wort doppelt?":"doppelwort",
    "Verwechselt?":"verwechselt", "Getrennt oder zusammen":"getrennt" };
  function errCats(e){
    if(KIND[e.cat]) return [KIND[e.cat]];
    if(e.cat === "Großschreibung") return ["gross"];
    if(e.cat === "Kleinschreibung") return ["klein"];
    return fineCats(e.w, e.fix);
  }
  const CAT_GROUPS = [
    ["Groß- und Kleinschreibung", { gross:"Großschreibung vergessen", klein:"fälschlich großgeschrieben" }],
    ["s, ss oder ß", { ss:"" }],
    ["Lange Vokale (ie, Dehnungs-h)", { ie:"i/ie", dehnung:"Dehnungs-h" }],
    ["Doppelte Konsonanten (mm, ll, ck, tz …)", { dopp:"" }],
    ["ä/e und äu/eu", { ae:"ä/e", aeu:"äu/eu" }],
    ["Harte und weiche Laute (b/p, d/t, g/k)", { hartweich:"" }],
    ["f, v oder w", { fvw:"" }],
    ["Typische LRS-Muster", { spiegel:"b/d oder p/q", formaehnlich:"m/n/u", eiie:"ei/ie vertauscht", umstellung:"Buchstaben vertauscht", auslassung:"Buchstabe ausgelassen", zusatz:"Buchstabe zu viel" }],
    ["Zeichensetzung", { komma:"Komma", satzende:"Satzende", leer:"Leerzeichen", satzz:"Satzzeichen" }],
    ["Grammatik und Satzbau", { fall:"Fall/Endungen", verb:"Verbform", grammatik:"Satzbau", doppelwort:"Wort doppelt", verwechselt:"Wort verwechselt" }],
    ["das oder dass", { dassdas:"" }],
    ["Getrennt oder zusammen", { getrennt:"" }],
    ["Sonstige", { other:"" }]
  ];

  // kid-friendly name + a concrete trick for every kind of mistake (shown under "Noch ein Tipp")
  const TRICK = {
    gross:["Großschreibung","Mach die Artikelprobe: Setz der, die oder das davor. Passt es, ist es ein Nomen und wird großgeschrieben. Und am Satzanfang immer groß!"],
    klein:["Kleinschreibung","Nur Nomen, Namen und das erste Wort im Satz schreibt man groß. Verben und Adjektive schreibt man klein."],
    ss:["s, ss oder ß","Sprich das Wort und hör auf den Vokal davor: Ist er lang oder steht ei, au, eu davor, schreibt man ß (Straße). Ist er kurz, schreibt man ss (Wasser)."],
    ie:["i oder ie","Ein lang gesprochenes i schreibt man meistens ie (Biene, Lied, spielen)."],
    dehnung:["Dehnungs-h","Das stumme h steht oft vor l, m, n oder r (fahren, nehmen, Zahl). Solche Wörter sind Merkwörter: Schau sie dir genau an."],
    dopp:["Doppelte Konsonanten","Schwing das Wort in Silben (Mut-ter, Son-ne). Ist der Vokal davor kurz, kommt oft ein doppelter Konsonant. Statt kk schreibt man ck, statt zz schreibt man tz."],
    ae:["ä oder e","Suche ein verwandtes Wort mit a: Hände kommt von Hand, also ä."],
    aeu:["äu oder eu","Suche ein verwandtes Wort mit au: Bäume kommt von Baum, also äu."],
    hartweich:["b/p, d/t, g/k","Verlängere das Wort, dann hörst du es deutlich: Hund → Hunde, Berg → Berge, Korb → Körbe."],
    fvw:["f, v oder w","Das v klingt oft wie f (Vogel, Vater, viel). Das sind Merkwörter: Sprich sie in Gedanken mit V."],
    spiegel:["b oder d","Das kleine b hat den Bauch rechts, das kleine d hat den Bauch links. Schau genau hin, bevor du weiterschreibst."],
    formaehnlich:["m, n oder u","Zähl die Bögen: m hat zwei, n hat einen. Das u ist wie ein umgedrehtes n."],
    eiie:["ei oder ie","ei klingt wie in „Eis“, ie ist ein langes i wie in „Biene“. Sprich das Wort leise mit."],
    umstellung:["Buchstaben-Reihenfolge","Fahr mit dem Finger unter dem Wort entlang und sprich jeden Laut in der richtigen Reihenfolge."],
    auslassung:["Vergessene Buchstaben","Schwing das Wort in Silben und zähl die Laute. Hat jeder Laut einen Buchstaben?"],
    zusatz:["Buchstaben zu viel","Sprich das Wort langsam: Gehört zu jedem Buchstaben auch ein Laut?"],
    komma:["Komma","Ein Komma trennt zwei Teilsätze. Jeder Teilsatz hat ein eigenes Verb. Vor weil, dass, wenn und aber steht meistens ein Komma."],
    satzende:["Satzende","Jeder Satz endet mit einem Punkt, Ausrufezeichen oder Fragezeichen."],
    leer:["Leerzeichen","Satzzeichen kleben am Wort davor, danach kommt ein Leerzeichen."],
    satzz:["Satzzeichen","Ein Satzzeichen genügt. Nur „…“, „!!“ und „?!“ sind erlaubt."],
    dassdas:["das oder dass","Kannst du dieses oder welches einsetzen? Dann das. Sonst dass."],
    fall:["Endungen","Frag nach dem Fall: Wer? Wem? Wen? (mit dem Hund, für den Hund)"],
    verb:["Verbformen","Ich gehe, du gehst, er geht, wir gehen: Das Verb passt sich der Person an."],
    getrennt:["Getrennt oder zusammen","Probier, ob man ein Wort dazwischen schieben kann. Wenn ja, schreibt man getrennt."]
  };
  function focusCounts(){
    const since = new Date(); since.setDate(since.getDate() - 29); const from = keyOf(since), tot = {};
    state.entries.filter(e => e.date >= from && e.errCats).forEach(e => Object.entries(e.errCats).forEach(([k, n]) => { tot[k] = (tot[k] || 0) + n; }));
    return tot;
  }
  function renderFocus(){ return; /* replaced by the pattern cards */

    const tot = focusCounts();
    const top = Object.entries(tot).filter(([k, n]) => TRICK[k] && n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 2);
    const box = $("#focusBox");
    if(!top.length){ box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<h2>🎯 Darauf achte ich gerade</h2>' + top.map(([k]) =>
      '<div class="focus"><b>' + esc(TRICK[k][0]) + '</b><p>' + esc(TRICK[k][1]) + '</p></div>').join("");
  }

  function lev(a, b){
    const m = a.length, n = b.length; let prev = Array.from({length:n+1}, (_, j) => j);
    for(let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++){ cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1]===b[j-1]?0:1)); } prev = cur; }
    return prev[n];
  }
  function bestSuggestion(w){
    let cands = [];
    try{
      cands = hun.suggest(w);
      if(!isUpper1(w)) cands = cands.concat(hun.suggest(cap(w)));
    }catch(e){ return null; }
    const norm = x => lower(x).replace(/ß/g, "ss");
    let best = null, bestScore = Infinity;
    cands.filter(x => x && !x.includes(" ") && !x.startsWith("-")).forEach((s, idx) => {
      let score = lev(norm(w), norm(s));
      if(!classify(w, s).generic) score -= 0.5;
      score += idx * 0.001;
      if(score < bestScore){ bestScore = score; best = s; }
    });
    return bestScore <= 2.01 ? best : null;
  }
  function check(text, skipComma){
    const errs = [];
    const toks = tokens(text);
    toks.forEach((t, k) => { t.k = k; });
    for(const t of toks){
      const w = t.w;
      if(t.label) continue;
      if(w.length > 1 && w === w.toLocaleUpperCase("de-DE")) continue; // ABKÜRZUNG
      if(t.start && !t.soft && !isUpper1(w)){
        if(correct(cap(w)) || correct(w)){
          errs.push({ i:t.i, w, cat:"Großschreibung", tip:"Am Satzanfang schreibt man immer groß.", tip2:"Schau dir den ersten Buchstaben an.", fix:cap(w) });
          continue;
        }
      }
      if(isUpper1(w) && !t.start && !t.soft && !POLITE.has(w) && w.length > 1 && correct(lower(w)) && !nounCapable(w) && !allowCapAfter(text, toks, t.k)){
        errs.push({ i:t.i, w, cat:"Kleinschreibung", tip:"Mitten im Satz schreibt man nur Nomen und Namen groß. Oder fehlt vor diesem Wort ein Punkt?", tip2:"Schau dir den ersten Buchstaben an und das, was davor steht.", fix:lower(w) });
        continue;
      }
      let ok = correct(w) || (t.start && correct(lower(w)));
      if(ok){
        if(!isUpper1(w) && !t.start && nounCapable(w) && nounContext(text, toks, t.k))
          errs.push({ i:t.i, w, cat:"Großschreibung", tip:"Davor steht ein Begleiter wie der, die, das, ein, mein oder im. Dann ist das Wort hier ein Nomen, und Nomen schreibt man groß.", tip2:"Schau dir den ersten Buchstaben an.", fix:cap(w) });
        continue;
      }
      if(!isUpper1(w) && correct(cap(w))){
        errs.push({ i:t.i, w, cat:"Großschreibung", tip:"Ist das ein Nomen? Mach die Artikelprobe: Passt der, die oder das davor?", tip2:"Schau dir den ersten Buchstaben an.", fix:cap(w) });
        continue;
      }
      const s = bestSuggestion(w);
      const c = classify(w, s);
      if(s && isUpper1(s) && !isUpper1(w) && !t.start) c.tip += " Und denk an die Großschreibung: Ist es ein Nomen?";
      const tip2 = s ? "Der Fehler steckt " + where(diffIndex(lower(w), lower(s)), w.length) + "." : "Frag Mama oder Papa, ob es dieses Wort so gibt.";
      errs.push({ i:t.i, w, cat:c.cat, tip:c.tip, tip2, fix:s, name: isUpper1(w) && !t.start });
    }
    punctuation(text, toks, errs, skipComma);
    // one mark per word: keep the first (spelling before punctuation), sort by position
    const seen = new Set();
    return errs.filter(e => { if(seen.has(e.i)) return false; seen.add(e.i); return true; }).sort((a,b) => a.i - b.i);
  }

  // ---------- grammar via LanguageTool (online, optional) ----------
  const LT_SKIP_RULES = ["GERMAN_WORD_REPEAT_BEGINNING_RULE","WHITESPACE_RULE","DE_DOUBLE_PUNCTUATION","DOPPELTES_LEERZEICHEN","LEERZEICHEN_VOR_SATZZEICHEN","LEERZEICHEN_HINTER_SATZZEICHEN","DE_SENTENCE_WHITESPACE","PUNCTUATION_PARAGRAPH_END","UPPERCASE_SENTENCE_START"];
  const LT_SKIP_CATS = new Set(["STYLE","TYPOGRAPHY","COLLOQUIALISMS","REDUNDANCY","REGIONALISMS","GENDER_NEUTRALITY","PLAIN_ENGLISH","WIKIPEDIA"]);
  async function ltCheck(text){
    if(!state.parent.grammar || !navigator.onLine) return null;
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 10000);
    try{
      const body = new URLSearchParams({ text, language:"de-DE", disabledCategories:[...LT_SKIP_CATS].join(","), disabledRules: LT_SKIP_RULES.join(",") });
      const r = await fetch("https://api.languagetool.org/v2/check", { method:"POST", body, signal:ctl.signal });
      if(!r.ok) return null;
      const data = await r.json();
      return Array.isArray(data.matches) ? data.matches : null;
    }catch(e){ return null; }
    finally{ clearTimeout(timer); }
  }
  function ltTip(m, w){
    const id = (m.rule && m.rule.id || "").toUpperCase();
    const cat = (m.rule && m.rule.category && m.rule.category.id || "").toUpperCase();
    const rep0 = m.replacements && m.replacements[0] && m.replacements[0].value;
    const T = (c, tip, tip2) => ({ cat:c, tip, tip2: tip2 || "Lies den Satz bis zu dieser Stelle laut vor. Was klingt nicht richtig?" });
    if(/DAS_DASS|DASS/.test(id)) return T("das oder dass", "Kannst du statt das auch dieses, jenes oder welches sagen? Dann schreibt man das. Sonst schreibt man dass.");
    if(/KOMMA|COMMA/.test(id) || (cat === "PUNCTUATION" && /,/.test((rep0 || "") + w)))
      return T("Komma", "Hier fehlt ein Komma oder eins ist zu viel. Lies den Satz laut: Wo fängt ein neuer Teilsatz an?", "Ein Teilsatz hat ein eigenes Verb. Finde die Verben im Satz.");
    if(cat === "PUNCTUATION") return T("Satzzeichen", "Hier stimmt etwas mit den Satzzeichen nicht. Ist der Satz zu Ende? Ist es eine Frage?");
    if(/^GERMAN_WORD_REPEAT_RULE$|WORD_REPEAT_RULE$|DOPPELTES_WORT|DUPLICATE/.test(id) && !/BEGINNING/.test(id)) return T("Wort doppelt?", "Steht hier ein Wort zweimal hintereinander?");
    if(cat === "CASING" || /GROSS|KLEIN|UPPERCASE|LOWERCASE|CAPITAL/.test(id))
      return T("Groß- oder Kleinschreibung", "Ist das ein Nomen? Mach die Artikelprobe. Und steht das Wort am Satzanfang?", "Schau dir den ersten Buchstaben an.");
    if(/ZUSAMMEN|GETRENNT|COMPOUND|SPLIT/.test(id)) return T("Getrennt oder zusammen", "Schreibt man das als ein Wort oder als zwei Wörter?");
    if(/VERB/.test(id) && /AGREE|KONGRUENZ|PERS|SUBJ/.test(id)) return T("Verb passt nicht", "Passt das Verb zur Person? (ich gehe, du gehst, er geht, wir gehen)");
    if(/AGREEMENT|KONGRUENZ|DE_CASE|PRAEP|PREP|KASUS|DEKLIN|ADJ/.test(id))
      return T("Wörter passen nicht zusammen", "Passen Begleiter, Adjektiv und Nomen zusammen? Achte auf die Endungen (der, dem, den, des).", "Frag: Wer oder was? Wem? Wen? Dann merkst du, welche Form passt.");
    if(cat === "CONFUSED_WORDS" || cat === "SEMANTICS") return T("Verwechselt?", "Es gibt ein ähnliches Wort mit einer anderen Bedeutung. Welches passt hier?");
    if(cat === "TYPOS"){ const c = classify(w, rep0 || null); return T(c.cat, c.tip, "Sprich das Wort langsam in Silben."); }
    return T("Grammatik", "Lies den Satz langsam laut vor. Klingt etwas komisch? Fehlt ein Wort oder ist eins zu viel?");
  }
  function mergeLT(text, errs, matches){
    const taken = errs.map(e => [e.i, e.i + e.w.length]);
    const overlaps = (a, b) => taken.some(([x, y]) => a < y && b > x);
    for(const m of matches){
      const cat = (m.rule && m.rule.category && m.rule.category.id || "").toUpperCase();
      const rid = (m.rule && m.rule.id || "").toUpperCase(), itype = (m.rule && m.rule.issueType || "").toLowerCase();
      if(LT_SKIP_CATS.has(cat) || LT_SKIP_RULES.includes(rid)) continue;
      if(/REPEAT_BEGINNING|WHITESPACE|LEERZEICHEN/.test(rid) || itype === "style" || itype === "whitespace") continue;   // our own checks cover spaces; style is not an error
      if(/^\s*$/.test(text.slice(m.offset, m.offset + m.length)) && !/KOMMA|COMMA/.test(rid)) continue;          // marks on pure whitespace
      let a = m.offset, b = m.offset + m.length;
      if(a < 0 || b > text.length || b <= a) continue;
      // grow tiny/space-only marks to the neighbouring word so a child can tap them
      if(!/\p{L}/u.test(text.slice(a, b))){
        let s = a; while(s > 0 && /\s/.test(text[s-1])) s--; while(s > 0 && /[\p{L}\d]/u.test(text[s-1])) s--;
        if(s < a) a = s; else { while(b < text.length && /[\p{L}\d]/u.test(text[b])) b++; }
      }
      const w = text.slice(a, b).replace(/\s+$/, ""); b = a + w.length;
      if(!w || overlaps(a, b) || (SEG && SEG.text === text && inLabel(SEG.labels, a, b))) continue;
      if(cat === "TYPOS" && state.names.includes(w)) continue;
      const tip = ltTip(m, w);
      errs.push({ i:a, w, cat:tip.cat, tip:tip.tip, tip2:tip.tip2, punct: cat !== "TYPOS", fix: cat === "TYPOS" && m.replacements && m.replacements[0] ? m.replacements[0].value : null });
      taken.push([a, b]);
    }
    return errs.sort((x, y) => x.i - y.i);
  }

  // ---------- punctuation ----------
  const POLITE = new Set(["Sie","Ihr","Ihre","Ihren","Ihrem","Ihrer","Ihres","Ihnen"]);
  function allowCapAfter(text, toks, k){
    if(k === 0) return true;
    const p = lower(toks[k-1].w);
    if(DET.has(p) || /^(etwas|nichts|viel|wenig|alles|allem|beim|zum|vom)$/.test(p)) return true; // "das Schwimmen", "etwas Schönes"
    if(k >= 2 && DET.has(lower(toks[k-2].w)) && !isUpper1(toks[k-1].w)) return true;           // "das schöne Malen"
    return false;
  }
  const SUBORD = new Set(["weil","dass","obwohl","bevor","nachdem","sondern","wenn","ob","falls","sodass"]);
  const NO_COMMA_BEFORE = new Set(["und","oder","so","als","auch","selbst","nur","außer","ohne","statt","anstatt","sowie","immer","erst","besonders","gerade","genau","kurz","lange","gleich","schon","noch","aber"]);
  function punctuation(text, toks, errs, skipComma){
    const P = (tok, cat, tip, tip2) => errs.push({ i:tok.i, w:tok.w, cat, tip, tip2, punct:true });
    toks.forEach((t, k) => {
      const prev = toks[k-1];
      if(t.label || (prev && (prev.label || prev.part !== t.part))) return;
      const between = prev ? gap(text, prev, t) : "";
      // missing comma before subordinate conjunction
      if(!skipComma && prev && !t.start && !t.soft && SUBORD.has(lower(t.w)) && !NO_COMMA_BEFORE.has(lower(prev.w)) && !/[,;:()–—-]/.test(between) && !prev.start)
        P(t, "Komma", "Vor Wörtern wie weil, dass, wenn, obwohl oder sondern steht ein Komma.", "Schau dir an, was direkt vor diesem Wort steht.");
      if(!prev) return;
      // space before punctuation: "Park ." / "Hallo ,"
      if(/\s[.,!?;:]/.test(between) && !/\.\.\./.test(between))
        P(prev, "Leerzeichen", "Vor einem Satzzeichen steht kein Leerzeichen. Das Satzzeichen klebt am Wort davor.", "Schau dir den Platz direkt nach diesem Wort an.");
      // missing space after punctuation: "Park.Danach"
      else if(/[.,!?;:]$/.test(between) && !/\.\.\.$/.test(between))
        P(t, "Leerzeichen", "Nach einem Satzzeichen kommt ein Leerzeichen.", "Schau dir den Platz direkt vor diesem Wort an.");
      // too many punctuation marks: ",," "..", ",." (but "...", "?!", "!!" are fine)
      const marks = between.replace(/[^.,!?;:]/g, "");
      if(marks.length > 1 && !/^(\.\.\.|[!?]+)$/.test(marks))
        P(prev, "Satzzeichen", "Hier stehen zu viele Satzzeichen hintereinander.", "Schau dir den Platz direkt nach diesem Wort an.");
    });
    // every part (free text and each answer) must end with . ! ?
    const parts = SEG && SEG.text === text ? SEG.parts : [[0, text.length]];
    for(const [pa, pb] of parts){
      const ptoks = toks.filter(x => x.i >= pa && x.i < pb && !x.label);
      const last = ptoks[ptoks.length-1];
      if(!last) continue;
      const tail = text.slice(last.i + last.w.length, pb);
      if(/^\s+[.,!?;:]/.test(tail)) P(last, "Leerzeichen", "Vor einem Satzzeichen steht kein Leerzeichen. Das Satzzeichen klebt am Wort davor.", "Schau dir den Platz direkt nach diesem Wort an.");
      else if(/^[.,!?;:]{2,}/.test(tail.trim()) && !/^(\.\.\.|[!?]+)/.test(tail.trim().replace(/[^.,!?;:].*$/s, "")))
        P(last, "Satzzeichen", "Hier stehen zu viele Satzzeichen hintereinander.", "Schau dir den Platz direkt nach diesem Wort an.");
      const partEnd = text.slice(pa, pb).replace(/[\s\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]+$/u, "");
      if(!/[.!?…]["“”»«')\]]*\s*$/.test(partEnd))
        P(last, "Satzende", "Am Ende eines Satzes steht ein Punkt, ein Ausrufezeichen oder ein Fragezeichen.", parts.length > 1 ? "Schau dir das Ende dieses Abschnitts an." : "Schau dir das Ende deines Textes an.");
    }
  }

  // ---------- UI: streak, lists ----------
  function renderStreak(){
    const days = coveredDays();
    let d = new Date(); if(!days.has(keyOf(d))) d.setDate(d.getDate()-1);
    let n = 0; while(days.has(keyOf(d))){ n++; d.setDate(d.getDate()-1); }
    $("#streakNum").textContent = n;
    $("#streakLabel").textContent = n === 1 ? "Tag am Stück" : "Tage am Stück";
    const week = $("#week"); week.innerHTML = "";
    const names = ["So","Mo","Di","Mi","Do","Fr","Sa"];
    for(let i=6;i>=0;i--){
      const x = new Date(); x.setDate(x.getDate()-i);
      const el = document.createElement("div");
      el.className = "day" + (days.has(keyOf(x)) ? " done" : "") + (i===0 ? " today" : "");
      el.innerHTML = '<span class="dot"></span>' + names[x.getDay()];
      week.appendChild(el);
    }
  }
  // ---------- kid view: mistake patterns instead of an endless word list ----------
  const PAT_ICON = { gross:"🔠", klein:"🔡", ss:"🐍", ie:"📏", dehnung:"🤫", dopp:"👯", ae:"🅰️", aeu:"🏠", hartweich:"🔨", fvw:"🐦",
    spiegel:"🪞", formaehnlich:"〰️", eiie:"🥚", umstellung:"🔀", auslassung:"🕳️", zusatz:"➕", komma:"✏️", satzende:"🛑",
    leer:"↔️", satzz:"❗", dassdas:"⚖️", fall:"🧩", verb:"🏃", getrennt:"✂️" };
  const LEGACY_FINE = { "s, ss oder ß":"ss", "Doppelkonsonant":"dopp", "ie oder i":"ie", "Dehnungs-h":"dehnung", "ä oder e":"ae", "äu oder eu":"aeu",
    "b/p, d/t oder g/k":"hartweich", "f, v oder w":"fvw", "Großschreibung":"gross", "Kleinschreibung":"klein", "ei oder ie":"eiie",
    "b oder d, p oder q":"spiegel", "m, n oder u":"formaehnlich", "Buchstaben vertauscht":"umstellung", "Buchstabe fehlt":"auslassung", "Buchstabe zu viel":"zusatz" };
  const wordFine = w => w.fine || LEGACY_FINE[w.kategorie] || "other";
  let showAllPatterns = false;
  function catCounts(fromDays, toDays){
    const a = new Date(); a.setDate(a.getDate() - fromDays); const b = new Date(); b.setDate(b.getDate() - toDays);
    const from = keyOf(a), to = keyOf(b), tot = {};
    state.entries.filter(e => e.errCats && e.date >= from && e.date <= to).forEach(e => Object.entries(e.errCats).forEach(([k, n]) => { tot[k] = (tot[k] || 0) + n; }));
    return tot;
  }
  function renderWords(){
    const now = catCounts(29, 0), before = catCounts(59, 30);
    const byCat = {};
    Object.entries(state.words).forEach(([key, w]) => { const k = wordFine(w); (byCat[k] = byCat[k] || []).push([key, w]); });
    const cats = [...new Set([...Object.keys(now), ...Object.keys(byCat)])].filter(k => TRICK[k])
      .map(k => ({ k, n: now[k] || 0, prev: before[k] || 0, words: (byCat[k] || []).sort((a, b) => (b[1].last || "").localeCompare(a[1].last || "")) }))
      .sort((a, b) => b.n - a.n || b.words.length - a.words.length);
    const box = $("#patterns");
    if(!cats.length){ box.innerHTML = '<p class="empty">Gerade gibt es nichts zu üben. Weiter so! 🌟</p>'; return; }
    const shown = showAllPatterns ? cats : cats.slice(0, 3);
    box.innerHTML = '<div class="pats">' + shown.map(c => {
      const trend = c.prev && c.n < c.prev ? '<p class="trend good">📉 Seltener als im Monat davor. Super!</p>'
        : (c.n >= 3 ? '<p class="trend">Das passiert dir gerade öfter. Mit dem Trick schaffst du das!</p>' : '');
      const chips = c.words.slice(0, 3).map(([key, w]) => '<span class="chip">' + esc(w.richtig) + '<button type="button" data-done="' + esc(key) + '" aria-label="' + esc(w.richtig) + ' kann ich">✓</button></span>').join("");
      const more = c.words.length > 3 ? '<span class="chipmore">+' + (c.words.length - 3) + ' weitere</span>' : '';
      const dots = c.n ? '<span class="dots" title="' + c.n + '-mal in den letzten 30 Tagen">' + "●".repeat(Math.min(c.n, 8)) + (c.n > 8 ? "+" : "") + '</span>' : '';
      return '<div class="pat"><div class="pat-head"><span class="pat-icon" aria-hidden="true">' + (PAT_ICON[c.k] || "🔍") + '</span><b>' + esc(TRICK[c.k][0]) + '</b>' + dots + '</div>' +
        '<p class="pat-trick">💡 ' + esc(TRICK[c.k][1]) + '</p>' + trend +
        (chips ? '<div class="chips"><span class="chiplabel">Deine Wörter:</span>' + chips + more + '</div>' : '') + '</div>';
    }).join("") + '</div>' +
      (cats.length > 3 ? '<button type="button" class="linkbtn" id="patAll">' + (showAllPatterns ? 'Weniger anzeigen' : 'Alle ' + cats.length + ' anzeigen') + '</button>' : '');
    box.querySelectorAll("[data-done]").forEach(b => b.onclick = () => { delete state.words[b.dataset.done]; save(); renderWords(); });
    const all = $("#patAll"); if(all) all.onclick = () => { showAllPatterns = !showAllPatterns; renderWords(); };
  }
  function renderNames(){
    const ul = $("#names"); ul.innerHTML = "";
    if(!state.names.length){ ul.innerHTML = '<li class="empty">Noch keine.</li>'; return; }
    state.names.forEach((n, idx) => {
      const li = document.createElement("li"); li.className = "word name";
      li.innerHTML = "<b>"+esc(n)+"</b>";
      const b = document.createElement("button"); b.textContent = "Entfernen";
      b.onclick = () => { state.names.splice(idx,1); try{ hun && hun.removeWord(n); }catch(e){} save(); renderNames(); };
      li.appendChild(b); ul.appendChild(li);
    });
  }
  function renderEntries(){
    const ul = $("#entries"); ul.innerHTML = "";
    if(!state.entries.length){ ul.innerHTML = '<li class="empty">Dein erster Tagebucheintrag erscheint hier, sobald alles richtig ist.</li>'; return; }
    $("#readAll").hidden = false;
    for(const e of state.entries.slice(0,3)){
      const li = document.createElement("li"); li.className = "entry";
      const badge = !e.firstErrors ? '<span class="badge clean">auf Anhieb fehlerfrei</span>'
        : '<span class="badge fixed">'+e.firstErrors+' Fehler selbst verbessert</span>';
      li.innerHTML = '<div class="entry-top"><span>'+esc(fmtDate(e.date))+'</span>'+badge+(e.pic ? '<span>🎨 mit Bild</span>' : '')+'</div><p>'+entryHtml(e)+'</p>';
      ul.appendChild(li);
    }
  }

  // ---------- writing ----------
  function countSentences(t){ const min = (state && state.reward && state.reward.cfg && state.reward.cfg.sentenceWords) || R().cfg.sentenceWords || 1; return t.split(/[.!?]+/).filter(s => /\p{L}/u.test(s) && tokens(s).length >= min).length; }
  const minWords = () => R().cfg.entryWords, minSent = () => R().cfg.entrySentences;
  let spellReady = false;
  function goalMet(){ const c = contentText(); return countSentences(c) >= minSent() && tokens(c).length >= minWords(); }
  function updateCount(){
    const c = contentText(), n = countSentences(c), w = tokens(c).length;
    const sc = $("#sentenceCount");
    const MIN_WORDS = minWords(), MIN_SENTENCES = minSent();
    sc.innerHTML = '<span class="goal'+(w>=MIN_WORDS?' met':'')+'">'+w+' von '+MIN_WORDS+' Wörtern</span>, <span class="goal'+(n>=MIN_SENTENCES?' met':'')+'">'+n+' von '+MIN_SENTENCES+(MIN_SENTENCES===1?' Satz':' Sätzen')+'</span>';
    if(spellReady){
      checkBtn.disabled = !goalMet();
      if(goalMet()) statusEl.textContent = "";
      else {
        const parts = [];
        if(w < MIN_WORDS) parts.push("noch " + (MIN_WORDS - w) + (MIN_WORDS - w === 1 ? " Wort" : " Wörter"));
        if(n < MIN_SENTENCES) parts.push("noch " + (MIN_SENTENCES - n) + (MIN_SENTENCES - n === 1 ? " Satz" : " Sätze") + (R().cfg.sentenceWords > 1 ? " mit mindestens " + R().cfg.sentenceWords + " Wörtern" : ""));
        statusEl.textContent = "Bis zum Prüfen: " + parts.join(" und ") + ".";
      }
    }
    if(session.checks && compose() !== session.checkedText){ const st = resultEl.querySelector(".stale"); if(st) st.hidden = false; }
  }
  let draftTimer = null;
  Object.values(qa).forEach(el => el.addEventListener("input", () => {
    updateCount(); clearTimeout(draftTimer);
    draftTimer = setTimeout(() => { state.draft = ta.value; QUESTIONS.forEach(([k]) => { state.draftQ[k] = qa[k].value; }); save(); }, 800);
  }));
  ta.addEventListener("input", () => { updateCount(); clearTimeout(draftTimer); draftTimer = setTimeout(() => { state.draft = ta.value; QUESTIONS.forEach(([k]) => { state.draftQ[k] = qa[k].value; }); save(); }, 800); });

  function showWarn(t){ warnEl.textContent = t; warnEl.hidden = false; }

  let checking = false;
  async function runCheck(){
    warnEl.hidden = true;
    const text = compose(), labels = SEG.labels;
    if(!goalMet()){ updateCount(); return; }
    if(!hun || checking) return;
    checking = true; checkBtn.disabled = true; allFields().forEach(f => { f.readOnly = true; });
    statusEl.textContent = state.parent.grammar ? "Ich prüfe deinen Text …" : "";
    const matches = await ltCheck(text);
    checking = false; checkBtn.disabled = false; allFields().forEach(f => { f.readOnly = false; });
    compose(); // SEG for this text again (LT is async)
    let errs = check(text, !!matches);
    if(matches) errs = mergeLT(text, errs, matches);
    statusEl.textContent = "";
    session.basicOnly = state.parent.grammar && !matches;
    if(text !== SEG.text) return;
    session.checks++;
    if(session.checks === 1) session.firstCount = errs.length;
    for(const e of errs){
      // count each mistake once: words by spelling, other marks only at the first check (positions shift later)
      const key = e.punct ? (session.checks === 1 ? e.cat + "@" + e.i : null) : "w:" + lower(e.w);
      if(key && !session.catKeys[key]){ session.catKeys[key] = 1; for(const c of errCats(e)) session.cats[c] = (session.cats[c] || 0) + 1; }
    }
    for(const e of errs){ if(!e.punct && !session.found[lower(e.w)]) session.found[lower(e.w)] = { wrong:e.w, fix:e.fix, cat:e.cat }; }
    const tot = focusCounts();
    // never let an example in a tip give away the answer (e.g. "Hund → Hunde" when "Hund" is the word he needs)
    const reveals = (txt, fix) => !!fix && !!txt && lower(txt).split(/[^\p{L}]+/u).includes(lower(fix));
    const unreveal = (txt, fix) => {
      if(!reveals(txt, fix)) return txt;
      const cut = txt.replace(/\s*\([^)]*\)/g, "").replace(/:\s*[^.:]*→[^.]*\./g, ".").replace(/\s*\.\./g, ".");
      return reveals(cut, fix) ? "" : cut;
    };
    errs.forEach(e => {
      e.fine = errCats(e)[0]; e.trick = TRICK[e.fine] ? TRICK[e.fine][1] : ""; e.often = (tot[e.fine] || 0) >= 3;
      e.tip = unreveal(e.tip, e.fix) || "Sprich das Wort ganz langsam in Silben. Hör genau auf jeden Laut.";
      e.trick = unreveal(e.trick, e.fix);
      if(e.trick && lower(e.trick).slice(0, 18) === lower(e.tip).slice(0, 18)) e.trick = ""; // nearly the same as the first tip
    });
    if(session.ignore) errs = errs.filter(e => !session.ignore[e.cat + "|" + e.w]);
    session.current = errs; session.checkedText = text; session.labels = labels; session.active = -1; session.more = false;
    if(errs.length){ renderResult(); if(innerWidth < 1000) resultEl.scrollIntoView({ behavior:"smooth", block:"start" }); }
    else finish(text);
  }

  function renderResult(){
    const errs = session.current, text = session.checkedText;
    let html = "", pos = 0;
    errs.forEach((e, idx) => {
      html += escSeg(text, pos, e.i, session.labels);
      html += '<button type="button" class="err'+(idx===session.active?" active":"")+'" data-i="'+idx+'">'+esc(e.w)+'</button>';
      pos = e.i + e.w.length;
    });
    html += escSeg(text, pos, text.length, session.labels);
    const n = errs.length;
    const msg = (session.checks === 1 || session.basicOnly ? "" : "Schon besser! ") + (n === 1 ? "Eine Stelle ist noch falsch." : n + " Stellen sind noch falsch.");
    let hint = "";
    if(session.active >= 0){
      const e = errs[session.active];
      hint = '<div class="hint"><p class="cat">'+esc(e.cat)+'</p><p>'+esc(e.tip)+'</p>' +
        (session.more ? '<p>'+esc(e.tip2)+'</p>' + (e.trick && e.trick !== e.tip ? '<p class="trick">💡 '+esc(e.trick)+'</p>' : '') : '') +
        (e.often ? '<p class="often">🎯 Darauf achtest du gerade besonders. Gut, dass du es selbst verbesserst!</p>' : '') +
        '<div class="row">' + (session.more ? '' : '<button type="button" class="btn-ghost" id="moreBtn">Noch ein Tipp</button>') +
        (e.name ? '<button type="button" class="btn-ghost" id="nameBtn">Das ist ein Name</button>' : '') +
        ((e.punct || /Großschreibung|Kleinschreibung/.test(e.cat)) ? '<button type="button" class="btn-ghost" id="okBtn">🤔 Ich finde, das stimmt so</button>' : '') + '</div></div>';
    }
    resultEl.innerHTML = '<p class="result-msg">'+msg+'</p>' +
      (session.basicOnly ? '<p class="note">Gerade ohne Internet: Ich prüfe nur Rechtschreibung und einfache Satzzeichen, keine Grammatik.</p>' : '') +
      '<p class="note">Tippe auf eine rot markierte Stelle für einen Tipp. Verbessere es dann in deinem Text und drück nochmal auf Prüfen.</p>' +
      '<div class="sheet checked"><div class="lined">'+html+'</div></div>' + hint +
      '<p class="stale" hidden>Du hast etwas verändert. Drück auf Prüfen, um es zu testen.</p>';
    resultEl.hidden = false;
    checkBtn.textContent = "Nochmal prüfen";
    resultEl.querySelectorAll(".err").forEach(b => b.onclick = () => {
      const i = Number(b.dataset.i);
      session.active = session.active === i ? -1 : i; session.more = false; renderResult();
      const nb = resultEl.querySelector('.err[data-i="'+i+'"]'); if(nb) nb.focus();
      const hb = resultEl.querySelector(".hint"); if(hb && innerWidth >= 1000) hb.scrollIntoView({ block:"nearest" });
    });
    const more = $("#moreBtn"); if(more) more.onclick = () => { session.more = true; renderResult(); };
    const okBtn = $("#okBtn");
    if(okBtn) okBtn.onclick = () => {
      const e = errs[session.active];
      session.ignore = session.ignore || {}; session.ignore[e.cat + "|" + e.w] = 1; session.overrides = (session.overrides || 0) + 1;
      for(const c of errCats(e)) if(session.cats[c]) session.cats[c] = Math.max(0, session.cats[c] - 1);   // not counted as a mistake any more
      session.current = errs.filter(x => x !== e); session.active = -1; session.more = false;
      if(session.current.length) renderResult(); else finish(session.checkedText);
    };
    const nameBtn = $("#nameBtn");
    if(nameBtn) nameBtn.onclick = () => {
      const w = errs[session.active].w;
      if(!state.names.includes(w)){ state.names.push(w); hun.addWord(w); save(); renderNames(); }
      delete session.found[lower(w)];
      runCheck();
    };
    updateCount();
  }

  function finish(text){
    const date = todayKey();
    const finalWords = new Set(tokens(text).map(t => lower(t.w)));
    const fixed = Object.values(session.found).filter(f => f.fix && finalWords.has(lower(f.fix)));
    const v = fieldValues(), content = contentText(v);
    const wc = tokens(content).length, scount = countSentences(content);
    const answers = {}; QUESTIONS.forEach(([k]) => { if(v[k]) answers[k] = v[k]; });
    const id = "e" + Date.now(), hasPic = padDirty;
    let picUrl = null;
    if(hasPic){ picUrl = pad.toDataURL("image/jpeg", 0.85); idb.set(id, picUrl); idb.del("draft:" + state.id); blankPad(); padDirty = false; undoStack = []; }
    const earned = coinsFor(v);
    const already = R().cfg.firstOnly && state.entries.some(e => e.date === date);   // only the first entry of the day earns coins
    const coins = already ? 0 : earned.coins;
    state.entries.unshift({ id, date, text: v.free, answers, firstErrors: Math.max(0, session.firstCount - (session.overrides || 0)), words: wc, sentences: scount, pic: hasPic, errCats: session.cats, coins, coinDetail: earned, overrides: session.overrides || 0 });
    if(state.entries.length > 5000) state.entries.length = 5000;
    for(const f of fixed){
      const k = lower(f.fix), prev = state.words[k];
      state.words[k] = { richtig:f.fix, kategorie:f.cat, fine: errCats({ cat:f.cat, w:f.wrong, fix:f.fix })[0], count:(prev ? prev.count : 0) + 1, last:date };
    }
    state.draft = ""; state.draftQ = {}; save();
    renderStreak();
    const streakN = streakOf() || 1;
    notify("✏️ Tagebuch geschrieben: " + wc + " Wörter, " + scount + " Sätze. " +
      (session.firstCount === 0 ? "Auf Anhieb fehlerfrei!" : session.firstCount + (session.firstCount === 1 ? " Fehler" : " Fehler") + " selbst verbessert.") +
      " Serie: " + streakN + (streakN === 1 ? " Tag." : " Tage.") + (hasPic ? " 🎨 Mit Bild." : ""));
    const first = session.firstCount;
    const headline = first === 0 ? "Fehlerfrei beim ersten Versuch!" : "Geschafft! Alles richtig.";
    const sub = first === 0 ? "Stark. Dein Tagebucheintrag für heute ist gespeichert."
      : (first === 1 ? "Du hast einen Fehler selbst gefunden und verbessert." : "Du hast " + first + " Fehler selbst gefunden und verbessert.");
    resultEl.hidden = true; resultEl.innerHTML = "";
    $("#writeArea").hidden = true;
    settleWeeks(); weeklyReport();
    const wp = weekPending(), cfgD = R().cfg.days;
    const coinMsg = '<div class="coinwin">' + (coins
      ? '🪙 <b>+' + fmtC(coins) + ' Coins</b> für diesen Eintrag (' + earned.sentences + ' ganze Sätze' + (earned.commas ? ', ' + earned.commas + '× Komma-Bonus' : '') + '). Diese Woche gesammelt: ' + fmtC(wp.sum) + '. ' + (wp.days.size >= cfgD ? 'Am Sonntag kommen sie auf dein Konto!' : 'Schreib an ' + cfgD + ' Tagen, dann gibt es sie am Sonntag.')
      : '🪙 Für heute hast du deine Coins schon gesammelt. Toll, dass du noch mehr schreibst!') + (R().cfg.gameBase ? '<br>🎮 Das Spiel ist für heute freigeschaltet!' : '') + '</div>';
    doneEl.innerHTML = '<div class="done-box"><strong>'+headline+'</strong><p>'+sub+'</p><div class="sheet checked"><div class="lined">'+entryHtml(state.entries[0])+'</div></div>'+(picUrl ? '<img class="pic" alt="Dein Bild" src="'+picUrl+'">' : '')+coinMsg+'<div class="below"><button class="btn-ghost" id="againBtn">Noch etwas ins Tagebuch schreiben</button></div></div>';
    doneEl.hidden = false;
    $("#againBtn").onclick = reset;
    renderStreak(); renderWords(); renderEntries();
  }
  function reset(){
    session = newSession(); allFields().forEach(f => { f.value = ""; }); doneEl.hidden = true; doneEl.innerHTML = "";
    $("#writeArea").hidden = false; checkBtn.textContent = "Prüfen"; updateCount(); ta.focus();
    $("#drawPanel").hidden = true; $("#drawBtn").setAttribute("aria-expanded", "false"); updateDrawBtn();
  }
  checkBtn.addEventListener("click", runCheck);

  // ---------- emojis ----------
  const EMOJI = {
    "Gefühle": "😀 😃 😄 😁 😆 😂 🥰 😍 😎 🤩 🥳 😊 🙂 😉 😴 🥱 😢 😭 😠 😡 😱 😬 🤔 🤗 😋 🤒 🤕 🙈",
    "Tiere": "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦄 🐴 🐢 🐍 🐬 🐳 🐟 🦈 🐞 🦋 🐝 🦖",
    "Essen": "🍎 🍌 🍓 🍉 🍇 🍕 🍔 🍟 🌭 🍝 🍜 🍦 🍩 🍪 🎂 🍰 🍫 🍬 🥨 🥐 🥞 🧀 🥕 🥤",
    "Spiel & Sport": "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🛹 🚲 🏊 🎮 🕹️ 🎲 🧩 🎨 🎸 🎹 🎤 🎧 📚 ✏️ 🏆 🥇 🎯",
    "Natur & Wetter": "☀️ 🌤️ ⛅ 🌧️ ⛈️ ❄️ ☃️ 🌈 🌙 ⭐ 🌟 🔥 💧 🌊 🌳 🌲 🌸 🌻 🍁 🍂",
    "Sachen & Orte": "🏠 🏫 🏥 🏰 ⛺ 🚗 🚌 🚂 ✈️ 🚀 🛸 🎁 🎈 🎉 🎄 🎃 💡 📱 💻 ⏰ ❤️ 💙 💚 💛 👍 👎"
  };
  let emoCat = "Gefühle";
  function renderEmoji(){
    $("#emoCats").innerHTML = Object.keys(EMOJI).map(c => '<button type="button" class="'+(c===emoCat?'on':'')+'" data-c="'+esc(c)+'">'+esc(c)+'</button>').join("");
    $("#emoGrid").innerHTML = EMOJI[emoCat].split(" ").map(e => '<button type="button" aria-label="'+e+' einfügen">'+e+'</button>').join("");
    $("#emoCats").querySelectorAll("button").forEach(b => b.onmousedown = e => e.preventDefault());
    $("#emoCats").querySelectorAll("button").forEach(b => b.onclick = () => { emoCat = b.dataset.c; renderEmoji(); });
    $("#emoGrid").querySelectorAll("button").forEach(b => b.onmousedown = e => e.preventDefault());
    $("#emoGrid").querySelectorAll("button").forEach(b => b.onclick = () => insertAtCursor(b.textContent));
  }
  let lastField = ta;
  allFields().forEach(f => {
    f.addEventListener("focus", () => { lastField = f; });
    ["keyup","click","select","input","blur"].forEach(ev => f.addEventListener(ev, () => { f._caret = [f.selectionStart, f.selectionEnd]; }));
  });
  function insertAtCursor(s){
    const f = lastField;
    if(f.readOnly) return;
    let [a, b] = document.activeElement === f ? [f.selectionStart, f.selectionEnd] : (f._caret || [f.value.length, f.value.length]);
    a = Math.min(a, f.value.length); b = Math.min(b, f.value.length);
    f.value = f.value.slice(0, a) + s + f.value.slice(b);
    f.selectionStart = f.selectionEnd = a + s.length;
    f.dispatchEvent(new Event("input"));
    f._caret = [a + s.length, a + s.length];
  }
  function togglePanel(btn, panel){
    const open = panel.hidden; panel.hidden = !open; btn.setAttribute("aria-expanded", String(open));
  }
  document.addEventListener("pointerdown", e => {
    const p = $("#emojiPanel");
    if(!p.hidden && !p.contains(e.target) && e.target !== $("#emojiBtn") && !e.target.closest("textarea")){ p.hidden = true; $("#emojiBtn").setAttribute("aria-expanded", "false"); }
  });
  $("#emojiBtn").onclick = () => { togglePanel($("#emojiBtn"), $("#emojiPanel")); if(!$("#emojiPanel").hidden) renderEmoji(); };

  // ---------- picture storage (IndexedDB: room for many drawings) ----------
  const idb = {
    db: null,
    open(){ if(this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => { const r = indexedDB.open("tagebuch-bilder", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("pics");
        r.onsuccess = () => { this.db = r.result; res(r.result); }; r.onerror = () => rej(r.error); }); },
    async run(mode, fn){ const db = await this.open(); return new Promise((res, rej) => { const q = fn(db.transaction("pics", mode).objectStore("pics")); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
    get(k){ return this.run("readonly", s => s.get(k)).catch(() => null); },
    set(k, v){ return this.run("readwrite", s => s.put(v, k)).catch(() => null); },
    del(k){ return this.run("readwrite", s => s.delete(k)).catch(() => null); }
  };

  // ---------- drawing pad ----------
  const pad = $("#pad"), ctx = pad.getContext("2d");
  const COLORS = ["#222222","#e53935","#fb8c00","#fdd835","#43a047","#1e88e5","#8e24aa","#8d6e63","#ec407a","#ffffff"];
  const SIZES = [4, 10, 22];
  let penColor = COLORS[0], penSize = SIZES[1], erasing = false, drawing = false, lastPt = null, padDirty = false, undoStack = [];
  function blankPad(){ ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pad.width, pad.height); }
  blankPad();
  function renderTools(){
    $("#swatches").innerHTML = COLORS.map(c => '<button type="button" class="swatch'+(c===penColor && !erasing?' on':'')+'" style="background:'+c+'" data-c="'+c+'" aria-label="Farbe"></button>').join("");
    $("#sizes").innerHTML = SIZES.map(s => '<button type="button" class="size'+(s===penSize?' on':'')+'" data-s="'+s+'" aria-label="Stiftgröße"><span style="width:'+Math.max(4,s/1.6)+'px;height:'+Math.max(4,s/1.6)+'px"></span></button>').join("");
    $("#swatches").querySelectorAll("button").forEach(b => b.onclick = () => { penColor = b.dataset.c; erasing = false; renderTools(); });
    $("#sizes").querySelectorAll("button").forEach(b => b.onclick = () => { penSize = Number(b.dataset.s); renderTools(); });
    $("#eraser").classList.toggle("on", erasing);
  }
  function pt(e){ const r = pad.getBoundingClientRect(); return { x:(e.clientX - r.left) * pad.width / r.width, y:(e.clientY - r.top) * pad.height / r.height }; }
  function stroke(a, b){
    ctx.strokeStyle = erasing ? "#fff" : penColor; ctx.lineWidth = erasing ? penSize * 2.5 : penSize;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x + 0.01, b.y); ctx.stroke();
  }
  pad.addEventListener("pointerdown", e => {
    if(ta.readOnly) return;
    pad.setPointerCapture(e.pointerId); drawing = true;
    undoStack.push(ctx.getImageData(0, 0, pad.width, pad.height)); if(undoStack.length > 12) undoStack.shift();
    lastPt = pt(e); stroke(lastPt, lastPt); padDirty = true;
  });
  pad.addEventListener("pointermove", e => { if(!drawing) return; const p = pt(e); stroke(lastPt, p); lastPt = p; });
  const endStroke = () => { if(!drawing) return; drawing = false; saveDraftPic(); updateDrawBtn(); };
  pad.addEventListener("pointerup", endStroke); pad.addEventListener("pointercancel", endStroke);
  $("#eraser").onclick = () => { erasing = !erasing; renderTools(); };
  $("#undoDraw").onclick = () => { const s = undoStack.pop(); if(s){ ctx.putImageData(s, 0, 0); padDirty = undoStack.length > 0 || padDirty; saveDraftPic(); } };
  $("#clearDraw").onclick = () => { if(!padDirty) return; undoStack.push(ctx.getImageData(0, 0, pad.width, pad.height)); blankPad(); padDirty = false; idb.del("draft:" + state.id); updateDrawBtn(); };
  function updateDrawBtn(){ $("#drawBtn").textContent = padDirty ? "🎨 Mein Bild ✓" : "🎨 Malen"; $("#drawBtn").classList.toggle("on", padDirty); }
  function closeDraw(){ $("#drawPanel").hidden = true; $("#drawBtn").setAttribute("aria-expanded", "false"); updateDrawBtn(); }
  $("#drawBtn").onclick = () => { $("#emojiPanel").hidden = true; $("#emojiBtn").setAttribute("aria-expanded", "false"); $("#drawPanel").hidden = false; $("#drawBtn").setAttribute("aria-expanded", "true"); renderTools(); };
  $("#drawDone").onclick = closeDraw;
  $("#drawPanel").addEventListener("pointerdown", e => { if(e.target === $("#drawPanel")) closeDraw(); });
  addEventListener("keydown", e => { if(e.key === "Escape"){ if(!$("#drawPanel").hidden) closeDraw(); $("#emojiPanel").hidden = true; $("#emojiBtn").setAttribute("aria-expanded", "false"); } });
  let picTimer = null;
  function saveDraftPic(){ clearTimeout(picTimer); picTimer = setTimeout(() => { if(padDirty) idb.set("draft:" + state.id, pad.toDataURL("image/jpeg", 0.85)); }, 600); }
  function loadImg(url){ return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; }); }
  async function restoreDraftPic(){
    blankPad(); padDirty = false; undoStack = []; updateDrawBtn();
    let url = await idb.get("draft:" + state.id);
    if(!url && family.legacyDraft === state.id) url = await idb.get("draft");
    if(!url) return;
    const im = await loadImg(url); if(!im) return;
    ctx.drawImage(im, 0, 0, pad.width, pad.height); padDirty = true;
    updateDrawBtn();
  }
  function fillPics(root){
    root.querySelectorAll("img[data-pic]").forEach(async img => { const url = await getPic(img.dataset.pic); if(url) img.src = url; else img.remove(); });
  }

  // ---------- reading ----------
  let readIdx = -1, readMode = "day";
  function days(){ return [...new Set(state.entries.map(e => e.date))].sort(); }
  function fmtLong(k){ const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
  const Q_ICON = { best:"⭐", worst:"🌧️", learned:"💡", tomorrow:"🚀" };
  function answersCard(e){
    const items = ALL_Q.filter(([k]) => e.answers && e.answers[k]);
    if(!items.length) return "";
    return '<div class="answers">' + items.map(([k, l]) =>
      '<div class="ans"><span class="lbl">' + Q_ICON[k] + ' ' + esc(l.replace(/:$/, "")) + '</span><p>' + esc(e.answers[k]) + '</p></div>').join("") + '</div>';
  }
  function entryLayout(e, day){
    // PC screen: text on the left, picture (or the answers) on the right, so one entry fits on one screen
    const sheet = e.text ? '<div class="sheet read-sheet"><div class="lined">' + esc(e.text) + '</div></div>' : "";
    const ans = answersCard(e);
    const pic = e.pic && e.id ? '<div class="read-pic"><img class="pic" data-pic="'+esc(e.id)+'" alt="Bild vom '+esc(fmtLong(day))+'"></div>' : "";
    let left, right = "";
    if(pic){ left = sheet + ans; right = pic; }
    else if(sheet && ans){ left = sheet; right = ans; }
    else left = sheet || ans;
    const key = e.id || (e.date + "#" + state.entries.indexOf(e));
    const words = e.words || tokens(contentText({ free: e.text || "", ...(e.answers || {}) })).length;
    const need = Math.max(8, Math.round(words / 2)); // ~120 words per minute
    return '<div class="read-entry' + (right ? ' two' : '') + '" data-key="' + esc(key) + '" data-need="' + need + '"><div class="read-col">' + left + '</div>' + (right ? '<div class="read-col">' + right + '</div>' : '') + '</div>';
  }
  function dayHtml(day){
    const es = state.entries.filter(e => e.date === day).reverse();
    return '<div class="read-day"><p class="read-date">'+esc(fmtLong(day))+'</p>' + es.map(e => entryLayout(e, day)).join("") + '</div>';
  }
  function renderRead(){
    const ds = days(), page = $("#readPage");
    $("#dayBar").hidden = readMode !== "day"; $("#rangeBar").hidden = readMode !== "range";
    $("#readAloud").hidden = !canSpeak();
    document.querySelectorAll("#readView .tab").forEach(b => { const on = b.dataset.mode === readMode; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on)); });
    page.classList.toggle("flow", readMode !== "day");
    page.classList.toggle("dayonly", readMode === "day");
    if(!ds.length){
      page.innerHTML = '<p class="empty">Dein Tagebuch ist noch leer. Schreib deinen ersten Eintrag!</p>';
      $("#daySel").innerHTML = ""; $("#prevDay").disabled = true; $("#nextDay").disabled = true; return;
    }
    if(readMode === "day"){
      if(readIdx < 0 || readIdx >= ds.length) readIdx = ds.length - 1;
      $("#daySel").innerHTML = ds.map((d,i) => '<option value="'+i+'"'+(i===readIdx?' selected':'')+'>'+esc(fmtLong(d))+'</option>').reverse().join("");
      page.innerHTML = dayHtml(ds[readIdx]) + '<p class="read-count">Seite '+(readIdx+1)+' von '+ds.length+'</p>';
      fillPics(page); observeEntries();
      $("#prevDay").disabled = readIdx === 0;
      $("#nextDay").disabled = readIdx === ds.length - 1;
      return;
    }
    let list = ds;
    if(readMode === "range"){
      const f = $("#fromDate"), to = $("#toDate");
      f.min = to.min = ds[0]; f.max = to.max = ds[ds.length-1];
      if(!f.value) f.value = ds[0];
      if(!to.value) to.value = ds[ds.length-1];
      let a = f.value, b = to.value; if(a > b){ const x = a; a = b; b = x; }
      list = ds.filter(d => d >= a && d <= b);
    }
    page.innerHTML = list.length
      ? list.map(dayHtml).join("") + '<p class="read-count">'+list.length+(list.length===1?' Tag':' Tage')+' im Tagebuch</p>'
      : '<p class="empty">In diesem Zeitraum gibt es keine Einträge.</p>';
    fillPics(page); observeEntries();
  }
  const EXTRA_TABS = { shop:["#shopView","#tabShop"], practice:["#practiceView","#tabPractice"], game:["#gameView","#tabGame"] };
  function setTab(tab){
    if(GM && !GM.over && tab !== "game") GM.paused = true;
    if(tab !== "game" && arcadeTimer) closeArcade();
    if(EXTRA_TABS[tab]){
      stopReading(); if(window.speechSynthesis) speechSynthesis.cancel();
      $("#writeView").hidden = true; $("#readView").hidden = true;
      [["#tabWrite",false],["#tabRead",false]].forEach(([s, on]) => { $(s).classList.remove("active"); $(s).setAttribute("aria-pressed", "false"); });
      Object.entries(EXTRA_TABS).forEach(([k, [v, b]]) => { $(v).hidden = k !== tab; $(b).classList.toggle("active", k === tab); $(b).setAttribute("aria-pressed", String(k === tab)); });
      if(tab === "shop"){ settleWeeks(); renderShop(); renderJoker(); }
      if(tab === "practice") renderPractice();
      if(tab === "game") renderGame();
      return;
    }
    showView(tab === "read");
  }
  function showView(read){
    if(arcadeTimer) closeArcade();
    Object.values(EXTRA_TABS).forEach(([v, b]) => { $(v).hidden = true; $(b).classList.remove("active"); $(b).setAttribute("aria-pressed", "false"); });
    if(GM && !GM.over) GM.paused = true;
    if(window.speechSynthesis) speechSynthesis.cancel();
    document.querySelector("main").classList.add("wide");
    $("#writeView").hidden = read; $("#readView").hidden = !read;
    $("#tabWrite").classList.toggle("active", !read); $("#tabRead").classList.toggle("active", read);
    $("#tabWrite").setAttribute("aria-pressed", String(!read)); $("#tabRead").setAttribute("aria-pressed", String(read));
    if(read){
      readIdx = -1; renderRead(); startReading();
    } else stopReading();
  }
  $("#tabWrite").onclick = () => showView(false);
  $("#tabRead").onclick = () => showView(true);
  $("#tabShop").onclick = () => setTab("shop");
  $("#tabPractice").onclick = () => setTab("practice");
  $("#tabGame").onclick = () => setTab("game");
  $("#ideaBtn").onclick = () => { $("#prefsPanel").hidden = true; $("#emojiPanel").hidden = true; showIdea(); ta.focus(); };
  $("#prefsBtn").onclick = () => { $("#ideaPanel").hidden = true; $("#emojiPanel").hidden = true; renderPrefs(); };
  $("#printBtn").onclick = printBook;
  $("#readAloud").onclick = readAloud;
  $("#readAll").onclick = () => { showView(true); window.scrollTo(0,0); };
  document.querySelectorAll("#readView .tab").forEach(b => b.onclick = () => { readMode = b.dataset.mode; readIdx = -1; renderRead(); });
  $("#fromDate").onchange = renderRead; $("#toDate").onchange = renderRead;
  $("#prevDay").onclick = () => { readIdx--; renderRead(); };
  $("#nextDay").onclick = () => { readIdx++; renderRead(); };
  $("#daySel").onchange = e => { readIdx = Number(e.target.value); renderRead(); };
  document.addEventListener("keydown", e => {
    if($("#readView").hidden || readMode !== "day" || /SELECT|INPUT/.test(e.target.tagName)) return;
    if(e.key === "ArrowLeft" && !$("#prevDay").disabled){ readIdx--; renderRead(); }
    if(e.key === "ArrowRight" && !$("#nextDay").disabled){ readIdx++; renderRead(); }
  });

  // ---------- 🪙 coins & shop ----------
  function R(){
    if(!state.reward) state.reward = {};
    const r = state.reward;
    r.cfg = Object.assign({ minWords:5, perSentence:10, perWord:2, comma:5, days:7, firstOnly:true, gameBase:10, gamePerTask:5, gameMax:30, jokers:1, jokerMax:5, dictLevel:"auto", entryWords:35, entrySentences:2 }, r.cfg || {});
    if(r.cfg.sentenceWords == null) r.cfg.sentenceWords = r.cfg.minWords != null && r.cfg.minWords !== 5 ? r.cfg.minWords + 1 : 5;   // older setting "mehr als N"
    r.items = r.items || [ { id:"i1", icon:"🐷", name:"1 Cent ins Sparschwein", price:10 }, { id:"i2", icon:"🎮", name:"1 Minute mehr Zockzeit (diese Woche)", price:20 } ];
    r.ledger = r.ledger || []; r.orders = r.orders || []; r.settled = r.settled || {};
    return r;
  }
  const fmtC = n => Number(n || 0).toLocaleString("de-DE");
  const balance = () => R().ledger.reduce((s, l) => s + (l.amount || 0), 0);
  const reserved = () => R().orders.filter(o => o.status === "open").reduce((s, o) => s + o.total, 0);
  const parseKey = k => { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); };
  function weekStartKey(k){ const d = parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyOf(d); }
  function addDays(k, n){ const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  function coinsFor(v){
    const c = R().cfg; let coins = 0, sentences = 0, commas = 0;
    [v.free, ...QUESTIONS.map(([k]) => v[k])].filter(Boolean).forEach(part => {
      const chunks = part.match(/[^.!?…]+[.!?…]+/g) || [];
      chunks.forEach(ch => {
        const n = tokens(ch).length;
        if(n >= c.sentenceWords){ coins += c.perSentence + c.perWord * (n - c.sentenceWords); sentences++; }
        if(/,/.test(ch) && n > 1){ coins += c.comma; commas++; }
      });
    });
    return { coins, sentences, commas };
  }
  function weekDays(ws){ const out = []; for(let i=0;i<7;i++) out.push(addDays(ws, i)); return out; }
  function settleWeeks(){
    const r = R(), today = todayKey(), weeks = {};
    state.entries.forEach(e => { if(e.coins) { const ws = weekStartKey(e.date); weeks[ws] = (weeks[ws] || 0) + e.coins; } });
    for(const [ws, sum] of Object.entries(weeks)){
      if(r.settled[ws]) continue;
      const sunday = addDays(ws, 6);
      if(today < sunday) continue;                                         // paid out on Sunday at the earliest
      const cov = coveredDays(), days = weekDays(ws).filter(d => cov.has(d)).length;
      if(days >= r.cfg.days){
        r.settled[ws] = "credit";
        r.ledger.push({ id:"l" + Date.now() + ws, at:Date.now(), type:"credit", amount:sum, note:"Wochenbonus " + fmtShort(ws) + "–" + fmtShort(sunday) + " (" + days + " Tage geschrieben)" });
        notify("🪙 Wochenbonus: " + childName() + " hat " + fmtC(sum) + " Tagebuch-Coins bekommen (" + days + " Tage geschrieben).");
      } else if(today > sunday){
        r.settled[ws] = "forfeit";
        r.ledger.push({ id:"l" + Date.now() + ws, at:Date.now(), type:"forfeit", amount:0, note:"Woche " + fmtShort(ws) + "–" + fmtShort(sunday) + ": nur " + days + " von " + r.cfg.days + " Tagen, " + fmtC(sum) + " Coins verfallen" });
      }
    }
    save();
  }
  function fmtShort(k){ return parseKey(k).toLocaleDateString("de-DE", { day:"numeric", month:"numeric" }); }
  function weekPending(){
    const ws = weekStartKey(todayKey());
    return { ws, sum: state.entries.filter(e => e.date >= ws && e.coins).reduce((s, e) => s + e.coins, 0),
      days: new Set(weekDays(ws).filter(d => coveredDays().has(d))) };
  }
  function renderCoinBadge(){ $("#coinNum").textContent = fmtC(balance()); }
  function renderShop(){
    const r = R(), bal = balance(), res = reserved(), avail = bal - res;
    $("#shopBalance").textContent = fmtC(bal);
    $("#shopAvail").textContent = res ? fmtC(res) + " Coins sind für deine Wünsche reserviert. Frei: " + fmtC(avail) + "." : "Tagebuch-Coins auf deinem Konto.";
    const wp = weekPending(), names = ["Mo","Di","Mi","Do","Fr","Sa","So"];
    $("#weekMo").innerHTML = weekDays(wp.ws).map((d, i) => '<span class="' + (wp.days.has(d) ? 'on' : '') + (d === todayKey() ? ' today' : '') + '">' + names[i] + '</span>').join("");
    const need = r.cfg.days, have = wp.days.size;
    $("#weekInfo").textContent = "Gesammelt: " + fmtC(wp.sum) + " Coins. " + (have >= need
      ? "Geschafft! Am Sonntag kommen sie auf dein Konto. 🎉"
      : "Schreib an " + need + " Tagen dieser Woche, dann bekommst du sie am Sonntag. Noch " + (need - have) + (need - have === 1 ? " Tag." : " Tage."));
    $("#shopItems").innerHTML = r.items.length ? r.items.map(it =>
      '<div class="item"><div class="item-top"><span class="item-icon">' + esc(it.icon || "🎁") + '</span><div><div class="item-name">' + esc(it.name) + '</div><div class="item-price">' + fmtC(it.price) + ' Coins pro Stück</div></div></div>' +
      '<div class="item-buy"><input type="number" class="num" min="1" value="1" data-qty="' + esc(it.id) + '" aria-label="Anzahl"><button type="button" class="btn" data-buy="' + esc(it.id) + '">Einlösen</button><span class="item-total" data-total="' + esc(it.id) + '"></span></div></div>').join("")
      : '<p class="empty">Mama und Papa haben noch nichts in den Shop gestellt.</p>';
    const upd = id => {
      const it = r.items.find(x => x.id === id), q = Math.max(1, Math.floor(Number(document.querySelector('[data-qty="' + id + '"]').value) || 1)), tot = q * it.price;
      document.querySelector('[data-total="' + id + '"]').textContent = "= " + fmtC(tot) + " Coins" + (tot > avail ? " (zu wenig Coins)" : "");
      document.querySelector('[data-buy="' + id + '"]').disabled = tot > avail;
    };
    r.items.forEach(it => { upd(it.id); document.querySelector('[data-qty="' + it.id + '"]').oninput = () => upd(it.id); });
    document.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
      const it = r.items.find(x => x.id === b.dataset.buy), q = Math.max(1, Math.floor(Number(document.querySelector('[data-qty="' + it.id + '"]').value) || 1)), tot = q * it.price;
      if(tot > balance() - reserved()) return;
      if(!confirm(q + " × " + it.name + " für " + fmtC(tot) + " Coins einlösen? Mama oder Papa müssen das noch bestätigen.")) return;
      r.orders.push({ id:"o" + Date.now(), at:Date.now(), itemId:it.id, name:it.name, icon:it.icon, qty:q, price:it.price, total:tot, status:"open" });
      save(); notify("🛒 " + childName() + " möchte einlösen: " + q + " × " + it.name + " (" + fmtC(tot) + " Coins). Bitte im Elternbereich bestätigen.");
      renderShop();
    });
    $("#kidOrders").innerHTML = orderList(r.orders.slice().reverse().slice(0, 15), false) || '<li class="empty">Noch keine Wünsche.</li>';
    $("#coinRules").innerHTML = '<p>Jeder ganze Satz ab ' + r.cfg.sentenceWords + ' Wörtern bringt ' + r.cfg.perSentence + ' Coins, jedes weitere Wort noch ' + r.cfg.perWord + ' Coins dazu. Ein Satz mit richtigem Komma bringt ' + r.cfg.comma + ' Extra-Coins.</p><p>Die Coins sammelst du die Woche über. Schreibst du an ' + r.cfg.days + ' Tagen, kommen sie am Sonntag auf dein Konto.' + (r.cfg.firstOnly ? ' Coins gibt es für den ersten Eintrag des Tages.' : '') + '</p>';
    renderCoinBadge();
  }
  const ST = { open:"wartet", done:"bestätigt", rejected:"abgelehnt" };
  function orderList(list, parent){
    return list.map(o => '<li><span>' + esc(o.icon || "🎁") + '</span><b>' + o.qty + ' × ' + esc(o.name) + '</b><span>' + fmtC(o.total) + ' Coins</span><span class="st ' + o.status + '">' + ST[o.status] + '</span><span class="when">' + new Date(o.at).toLocaleDateString("de-DE") + '</span>' +
      (parent && o.status === "open" ? '<button type="button" class="btn" data-ok="' + o.id + '">Bestätigen</button><button type="button" class="btn-ghost" data-no="' + o.id + '">Ablehnen</button>' : '') + '</li>').join("");
  }
  function renderRewardParent(){
    const r = R(), open = r.orders.filter(o => o.status === "open");
    $("#parentOrders").innerHTML = orderList(open, true) || '<li class="empty">Keine offenen Einkäufe.</li>';
    $("#parentCoinInfo").textContent = "Kontostand: " + fmtC(balance()) + " Coins" + (reserved() ? " (davon " + fmtC(reserved()) + " reserviert)" : "") + ". Diese Woche gesammelt, noch nicht gutgeschrieben: " + fmtC(weekPending().sum) + ".";
    document.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => decide(b.dataset.ok, true));
    document.querySelectorAll("[data-no]").forEach(b => b.onclick = () => decide(b.dataset.no, false));
    $("#itemEditor").innerHTML = '<p class="note">Der Shop gilt für das oben ausgewählte Kind. Name, Preis und Symbol werden beim Bearbeiten automatisch gespeichert.</p>' + r.items.map(it => '<div class="itemrow" data-row="' + esc(it.id) + '"><input class="ic" value="' + esc(it.icon || "") + '" aria-label="Symbol" maxlength="64"><button type="button" class="btn-ghost" data-pick-icon="' + esc(it.id) + '" aria-label="Symbol auswählen">😀</button><input class="nm" value="' + esc(it.name) + '" aria-label="Name"><input class="num pr" type="number" min="1" value="' + it.price + '" aria-label="Preis in Coins"> Coins <button type="button" class="btn-ghost" data-del="' + esc(it.id) + '">Löschen</button></div>').join("") +
      '<div class="below"><button type="button" class="btn" id="saveItems">Shop speichern</button><span class="status" id="itemMsg" role="status"></span></div>';
    $("#itemEditor").querySelectorAll("[data-row]").forEach(row => {
      const update = () => {
        const item = r.items.find(x => x.id === row.dataset.row);
        if(!item) return;
        const name = row.querySelector(".nm").value.trim(), price = Number(row.querySelector(".pr").value);
        if(!name || !Number.isFinite(price) || price < 1){
          $("#itemMsg").textContent = "Bitte einen Namen und einen Preis ab 1 Coin eingeben. Der letzte gültige Stand bleibt gespeichert.";
          return;
        }
        Object.assign(item, { name, icon: row.querySelector(".ic").value.trim() || "🎁", price: Math.floor(price) });
        save(); $("#itemMsg").textContent = "Automatisch gespeichert.";
      };
      row.querySelectorAll("input").forEach(input => input.oninput = update);
      row.querySelector("[data-pick-icon]").onclick = () => pickShopIcon(row.querySelector(".ic"));
    });
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { r.items = r.items.filter(x => x.id !== b.dataset.del); save(); renderRewardParent(); });
    $("#saveItems").onclick = () => {
      const rows = [...$("#itemEditor").querySelectorAll("[data-row]")];
      if(rows.some(row => !row.querySelector(".nm").value.trim() || !Number.isFinite(Number(row.querySelector(".pr").value)) || Number(row.querySelector(".pr").value) < 1)){
        $("#itemMsg").textContent = "Bitte allen Artikeln einen Namen und einen Preis ab 1 Coin geben."; return;
      }
      r.items = rows.map(row => ({ id: row.dataset.row, icon: row.querySelector(".ic").value.trim() || "🎁", name: row.querySelector(".nm").value.trim(), price: Math.floor(Number(row.querySelector(".pr").value)) }));
      save(); $("#itemMsg").textContent = "Gespeichert.";
    };
    const c = r.cfg;
    $("#cfgSent").value = c.perSentence; $("#cfgWord").value = c.perWord; $("#cfgComma").value = c.comma; $("#cfgDays").value = c.days; $("#cfgFirst").checked = !!c.firstOnly;
    $("#ledgerList").innerHTML = r.ledger.slice().reverse().slice(0, 40).map(l => '<li><span class="st ' + l.type + '">' + ({ credit:"Gutschrift", spend:"Einkauf", forfeit:"verfallen", adjust:"Korrektur" }[l.type] || l.type) + '</span><b>' + (l.amount > 0 ? "+" : "") + fmtC(l.amount) + '</b><span>' + esc(l.note || "") + '</span><span class="when">' + new Date(l.at).toLocaleDateString("de-DE") + '</span></li>').join("") || '<li class="empty">Noch keine Buchungen.</li>';
  }
  function pickShopIcon(input){
    const dialog = $("#shopIconDialog"), choices = $("#shopIconChoices");
    choices.replaceChildren();
    for(const [category, symbols] of Object.entries(EMOJI)){
      const heading = document.createElement("h3"); heading.textContent = category; choices.append(heading);
      const grid = document.createElement("div"); grid.className = "shop-symbols";
      for(const symbol of symbols.split(" ")){
        const button = document.createElement("button"); button.type = "button"; button.textContent = symbol;
        button.setAttribute("aria-label", "Symbol " + symbol + " wählen");
        button.onclick = () => { input.value = symbol; input.dispatchEvent(new Event("input", { bubbles:true })); dialog.close(); };
        grid.append(button);
      }
      choices.append(grid);
    }
    dialog.showModal();
  }
  $("#shopIconClose").onclick = () => $("#shopIconDialog").close();
  function decide(id, ok){
    const r = R(), o = r.orders.find(x => x.id === id); if(!o || o.status !== "open") return;
    o.status = ok ? "done" : "rejected"; o.decidedAt = Date.now();
    if(ok) r.ledger.push({ id:"l" + Date.now(), at:Date.now(), type:"spend", amount:-o.total, note:o.qty + " × " + o.name });
    save(); renderRewardParent(); renderOverviewCards();
  }
  $("#addItem").onclick = () => { R().items.push({ id:"i" + crypto.randomUUID(), icon:"🎁", name:"Neuer Artikel", price:50 }); save(); renderRewardParent(); };
  $("#saveCfg").onclick = () => {
    const c = R().cfg, num = (id, min, max) => Math.min(max, Math.max(min, Math.floor(Number($(id).value) || 0)));
    c.perSentence = num("#cfgSent", 0, 1000); c.perWord = num("#cfgWord", 0, 100); c.comma = num("#cfgComma", 0, 100); c.days = num("#cfgDays", 1, 7); c.firstOnly = $("#cfgFirst").checked;
    save(); $("#cfgMsg").textContent = "Gespeichert. Gilt für neue Einträge.";
  };
  $("#adjBtn").onclick = () => {
    const n = Math.round(Number($("#adjAmount").value) || 0); if(!n) return;
    R().ledger.push({ id:"l" + Date.now(), at:Date.now(), type:"adjust", amount:n, note:$("#adjNote").value.trim() || "Korrektur durch Eltern" });
    $("#adjAmount").value = ""; $("#adjNote").value = ""; save(); renderRewardParent();
  };
  $("#coinBadge").onclick = () => setTab("shop");

  // ---------- reading tracker: only counts real, active reading ----------
  const RT = { active:false, sec:0, dwell:{}, need:{}, read:new Set(), visible:new Set(), timer:null, obs:null, lastAct:Date.now(), idle:0 };
  const ACT_WINDOW = 60;      // seconds without any input that still count as reading
  const IDLE_STOP = 300;      // after 5 idle minutes the reading session ends
  ["mousemove","wheel","scroll","keydown","pointerdown","touchstart"].forEach(ev => addEventListener(ev, () => {
    RT.lastAct = Date.now();
    if(!RT.active && !$("#readView").hidden && !$("#kidView").hidden) startReading(); // came back after a pause
  }, { passive:true, capture:true }));
  function observeEntries(){
    if(!RT.obs) return;
    RT.obs.disconnect(); RT.visible.clear();
    document.querySelectorAll("#readPage .read-entry").forEach(el => { RT.need[el.dataset.key] = Number(el.dataset.need) || 8; RT.obs.observe(el); });
  }
  function startReading(){
    if(RT.active) return;
    Object.assign(RT, { active:true, sec:0, dwell:{}, read:new Set(), idle:0, lastAct:Date.now() });
    RT.obs = new IntersectionObserver(list => {
      for(const en of list){
        const k = en.target.dataset.key;
        const seen = en.isIntersecting && (en.intersectionRatio >= 0.4 || en.intersectionRect.height >= innerHeight * 0.5);
        if(seen) RT.visible.add(k); else RT.visible.delete(k);
      }
    }, { threshold:[0, .2, .4, .6, .8, 1] });
    observeEntries();
    RT.timer = setInterval(readTick, 1000);
  }
  function readTick(){
    if(!RT.active) return;
    const focused = document.visibilityState === "visible" && document.hasFocus();
    const recent = (Date.now() - RT.lastAct) / 1000 < ACT_WINDOW;
    if(focused && recent && RT.visible.size){
      RT.sec++; RT.idle = 0;
      const share = 1 / RT.visible.size;           // several entries on screen share the time
      for(const k of RT.visible){ RT.dwell[k] = (RT.dwell[k] || 0) + share; if(RT.dwell[k] >= (RT.need[k] || 8)) RT.read.add(k); }
    } else if(++RT.idle >= IDLE_STOP) stopReading();
  }
  function stopReading(unloading){
    if(!RT.active) return;
    RT.active = false; clearInterval(RT.timer); if(RT.obs){ RT.obs.disconnect(); RT.obs = null; }
    if(!RT.sec) return;
    const k = todayKey(), log = state.readLog[k] || (state.readLog[k] = { sec:0, entries:[], sent:0 });
    log.sec += RT.sec; log.entries = [...new Set([...log.entries, ...RT.read])];
    const keys = Object.keys(state.readLog).sort(); while(keys.length > 60) delete state.readLog[keys.shift()];
    const min = (state.parent.readMin || 2) * 60;
    if(state.parent.notifyRead && RT.sec >= min && RT.read.size && log.sent < 3){
      log.sent++;
      const m = Math.round(RT.sec / 60);
      notify("📖 " + m + (m === 1 ? " Minute" : " Minuten") + " im Tagebuch gelesen, dabei " + RT.read.size + (RT.read.size === 1 ? " Eintrag" : " Einträge") + " lange genug angeschaut.", unloading);
    }
    save();
  }
  addEventListener("pagehide", () => stopReading(true));

  // ---------- notifications (ntfy) ----------
  function notify(msg, unloading){
    if(!state.parent.topic) return;
    state.parent.queue.push({ msg, at: Date.now() });
    if(state.parent.queue.length > 50) state.parent.queue.splice(0, state.parent.queue.length - 50);
    if(unloading && navigator.sendBeacon){ // page is closing: a normal request would be cancelled
      if(navigator.sendBeacon("https://ntfy.sh/" + encodeURIComponent(state.parent.topic), msg)) state.parent.queue.pop();
      save(); return;
    }
    save(); flushQueue();
  }
  let flushing = false;
  async function flushQueue(){
    const topic = state.parent.topic;
    if(flushing || !topic || !state.parent.queue.length) return;
    flushing = true;
    try{
      while(state.parent.queue.length){
        const item = state.parent.queue[0];
        const late = Date.now() - item.at > 30*60*1000 ? " (nachgereicht vom " + new Date(item.at).toLocaleDateString("de-DE") + ")" : "";
        const r = await fetch("https://ntfy.sh/" + encodeURIComponent(topic), { method:"POST", body: item.msg + late });
        if(!r.ok) break;
        state.parent.queue.shift(); save();
      }
    }catch(e){ /* offline: try again later */ }
    flushing = false;
  }
  window.addEventListener("online", flushQueue);
  setInterval(flushQueue, 5*60*1000);

  // ---------- parent area ----------
  let parentOpen = false;
  // ---------- PINs (stored only as salted hash: nobody can read them back) ----------
  async function hashPin(v){
    if(!family.salt){ const a = new Uint8Array(16); crypto.getRandomValues(a); family.salt = Array.from(a, b => b.toString(16).padStart(2,"0")).join(""); save(); }
    const s = family.salt + ":" + v;
    try{
      const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2,"0")).join("");
    }catch(e){
      let h = 2166136261; for(let r=0;r<5000;r++) for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      return "f" + h.toString(16);
    }
  }
  function pinForm(box, o){
    box.innerHTML = '<p class="note">' + o.intro + '</p><div class="pin">' +
      '<input type="password" inputmode="numeric" class="p1" aria-label="PIN" placeholder="PIN" autocomplete="off" maxlength="8">' +
      (o.mode === "set" ? '<input type="password" inputmode="numeric" class="p2" aria-label="PIN wiederholen" placeholder="PIN nochmal" autocomplete="off" maxlength="8">' : '') +
      '<button type="button" class="btn go">' + o.button + '</button><span class="status msg" role="status"></span></div>' +
      (o.cancel ? '<button type="button" class="linkbtn cancel">Abbrechen</button>' : '') + (o.extra || "");
    const p1 = box.querySelector(".p1"), p2 = box.querySelector(".p2"), msg = box.querySelector(".msg");
    const go = async () => {
      const v = p1.value.trim();
      if(o.mode === "set"){
        if(!/^\d{4,8}$/.test(v)){ msg.textContent = "Bitte 4 bis 8 Ziffern."; return; }
        if(p2.value.trim() !== v){ msg.textContent = "Die beiden PINs sind nicht gleich."; p2.value = ""; p2.focus(); return; }
        await o.onOk(v);
      } else if(await o.check(v)) await o.onOk(v);
      else { msg.textContent = "Falsche PIN."; p1.value = ""; p1.focus(); }
    };
    box.querySelector(".go").onclick = go;
    [p1, p2].forEach(x => { if(x) x.onkeydown = e => { if(e.key === "Enter") go(); }; });
    if(o.cancel) box.querySelector(".cancel").onclick = o.cancel;
    setTimeout(() => p1.focus(), 30);
  }
  async function parentCheck(v){
    if(state.parent.pinHash) return (await hashPin(v)) === state.parent.pinHash;
    if(state.parent.pin && v === state.parent.pin){ state.parent.pinHash = await hashPin(v); state.parent.pin = ""; save(); return true; } // old plain PIN → hash it
    return false;
  }
  function renderPinBox(){
    const box = $("#pinBox");
    $("#parentArea").hidden = !parentOpen;
    if(parentOpen){ box.innerHTML = ""; return; }
    const open = () => { parentOpen = true; renderParent(); renderPinBox(); };
    if(state.parent.pinHash || state.parent.pin)
      pinForm(box, { mode:"enter", intro:"Bitte Eltern-PIN eingeben.", button:"Öffnen", check: parentCheck, onOk: open });
    else
      pinForm(box, { mode:"set", intro:"Legt zuerst eine Eltern-PIN fest (4 bis 8 Ziffern).", button:"PIN festlegen",
        onOk: async v => { state.parent.pinHash = await hashPin(v); state.parent.pin = ""; save(); open(); } });
  }
  function renderParent(){
    $("#topic").value = state.parent.topic; renderNtfyHelp();
    renderChildBar();
    $("#cfgEntryWords").value = R().cfg.entryWords; $("#cfgEntrySent").value = R().cfg.entrySentences;
    $("#kidPinHead").textContent = genitive(childName()) + " PIN";
    $("#kidPinState").textContent = state.kidPinHash
      ? childName() + " hat eine eigene PIN festgelegt. Ihr kennt sie nicht und könnt sie auch hier nicht sehen. Hat " + childName() + " sie vergessen, könnt ihr sie zurücksetzen."
      : childName() + " hat noch keine eigene PIN. Beim nächsten Öffnen wird " + childName() + " gebeten, eine festzulegen.";
    $("#kidPinMsg").textContent = ""; $("#changePinBox").innerHTML = "";
    $("#notifyRead").checked = !!state.parent.notifyRead;
    $("#readMin").value = String(state.parent.readMin || 2);
    $("#grammarOn").checked = !!state.parent.grammar;
    const rows = [];
    for(let i=0;i<14;i++){
      const d = new Date(); d.setDate(d.getDate()-i); const k = keyOf(d);
      const es = state.entries.filter(e => e.date === k);
      const words = es.reduce((n,e) => n + (e.words || tokens(e.text).length), 0);
      const fixed = es.reduce((n,e) => n + (e.firstErrors || 0), 0);
      const label = d.toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"numeric"});
      rows.push(es.length
        ? '<tr><td>'+esc(label)+'</td><td>✓ '+es.length+(es.length===1?' Eintrag':' Einträge')+'</td><td>'+words+' Wörter</td><td>'+fixed+' Fehler verbessert</td>'+readCell(k)+'</tr>'
        : '<tr><td>'+esc(label)+'</td><td class="no" colspan="3">nichts geschrieben</td>'+readCell(k)+'</tr>');
    }
    $("#stats").innerHTML = '<thead><tr><th>Tag</th><th>Geschrieben</th><th>Umfang</th><th>Rechtschreibung</th><th>Gelesen</th></tr></thead><tbody>'+rows.join("")+'</tbody>';
    if(!family.children.length || family.children.some(id => !(family.data[id].name || "").trim()) || (STORE().mode === "folder" && canFolder() && !folderReady() && pSection === "overview" && !state.parent.storeAsked)){ pSection = "settings"; state.parent.storeAsked = true; }
    $("#cfgSentWords").value = R().cfg.sentenceWords;
    renderNames(); renderErrStats(); renderParentWords(); settleWeeks(); renderRewardParent(); renderPauseParent(); renderPracticeStats(); renderBackup(); renderStore(); renderOverviewCards(); goSection(pSection);
    const c = R().cfg; $("#cfgGameBase").value = c.gameBase; $("#cfgGameTask").value = c.gamePerTask; $("#cfgGameMax").value = c.gameMax; $("#cfgDictLevel").value = c.dictLevel || "auto";
    renderSpeechSettings();
  }
  let pSection = "overview";
  function goSection(s){
    pSection = s;
    document.querySelectorAll(".psec").forEach(x => { x.hidden = x.dataset.sec !== s; });
    document.querySelectorAll(".pm[data-go]").forEach(b => { const on = b.dataset.go === s; b.classList.toggle("active", on); b.setAttribute("aria-current", on ? "page" : "false"); });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".pm[data-go]").forEach(b => b.onclick = () => goSection(b.dataset.go));
  function renderOverviewCards(){
    const n = childName(), today = todayKey();
    const wrote = state.entries.filter(e => e.date === today);
    const streak = streakOf();
    const open = R().orders.filter(o => o.status === "open");
    const rd = state.readLog[today];
    const wp = weekPending();
    const card = (big, label, go, alert) => (go ? '<button type="button" class="pcard' + (alert ? ' alert' : '') + '" data-goto="' + go + '">' : '<div class="pcard">') +
      '<span class="big">' + big + '</span><span class="lbl2">' + label + '</span>' + (go ? '</button>' : '</div>');
    $("#pcards").innerHTML =
      card(wrote.length ? "✓" : "–", wrote.length ? "Heute geschrieben (" + wrote.reduce((s, e) => s + (e.words || 0), 0) + " Wörter)" : "Heute noch nichts geschrieben") +
      card("🔥 " + streak, streak === 1 ? "Tag am Stück" : "Tage am Stück") +
      card(wp.days.size + "/" + R().cfg.days, "Tage diese Woche geschrieben") +
      card(rd && rd.sec >= 60 ? Math.round(rd.sec / 60) + " Min." : "–", "Heute gelesen") +
      card("🪙 " + fmtC(balance()), "Coins auf " + genitive(n) + " Konto", "rewards") +
      card(open.length, open.length === 1 ? "offener Einkauf wartet" : "offene Einkäufe warten", "rewards", open.length > 0) +
      card("🎯 " + todaysTasks(), "Zusatzaufgaben heute", "spelling") +
      (folderReady()
        ? card("📁 ✓", "Im Tagebuch-Ordner gespeichert" + (STORE().lastSave ? ", " + ago(STORE().lastSave) : ""), "settings")
        : card("📁 !", STORE().mode === "browser" || !canFolder() ? "Nur im Browser gespeichert" : (dirHandle ? "Tagebuch-Ordner: Zugriff pausiert" : "Tagebuch-Ordner noch nicht gewählt"), "settings", true));
    document.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => goSection(b.dataset.goto));
    const badge = $("#orderBadge"); badge.hidden = !open.length; badge.textContent = open.length;
  }
  function renderPracticeStats(){
    const since = addDays(todayKey(), -29), log = (state.practice ? state.practice.log : []).filter(l => l.date >= since && l.done);
    const wd = log.filter(l => l.type === "words"), dt = log.filter(l => l.type === "dict");
    const wr = wd.reduce((s, l) => s + l.right, 0), wn = wd.reduce((s, l) => s + l.n, 0);
    const de = dt.reduce((s, l) => s + l.errors, 0), dw = dt.reduce((s, l) => s + l.words, 0);
    const cats = {}; log.forEach(l => Object.entries(l.cats || {}).forEach(([k, n]) => { cats[k] = (cats[k] || 0) + n; }));
    const top = Object.entries(cats).filter(([k]) => TRICK[k]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => TRICK[k][0] + " (" + n + ")");
    $("#practiceStats").innerHTML = log.length
      ? '<p>🔤 <b>' + wd.length + '</b> Wort-Diktate, ' + (wn ? Math.round(wr / wn * 100) : 0) + ' % der Wörter richtig.<br>📝 <b>' + dt.length + '</b> Kurz-Diktate, im Schnitt ' + (dw ? (de / dw * 100).toFixed(1) : 0) + ' Fehler pro 100 Wörter.' + (top.length ? '<br>Häufigste Fehler beim Üben: ' + esc(top.join(", ")) + '.' : '') + '</p>'
      : '<p class="empty">Noch keine Zusatzaufgaben gemacht.</p>';
  }
  $("#saveGame").onclick = () => { const c = R().cfg, n = (id, max) => Math.max(0, Math.min(max, Math.floor(Number($(id).value) || 0))); c.gameBase = n("#cfgGameBase", 120); c.gamePerTask = n("#cfgGameTask", 60); c.gameMax = n("#cfgGameMax", 240); save(); $("#gameMsg").textContent = "Gespeichert."; };
  $("#saveSentWords").onclick = () => { const c = R().cfg; c.sentenceWords = Math.max(1, Math.min(30, Math.floor(Number($("#cfgSentWords").value) || 1))); save(); $("#cfgSentWords").value = c.sentenceWords; $("#sentWordsMsg").textContent = "Gespeichert: Ein Satz zählt ab " + c.sentenceWords + (c.sentenceWords === 1 ? " Wort" : " Wörtern") + " (" + childName() + ")."; };
  $("#saveEntryCfg").onclick = () => {
    const c = R().cfg, n = (id, a, b) => Math.max(a, Math.min(b, Math.floor(Number($(id).value) || a)));
    c.entryWords = n("#cfgEntryWords", 5, 400); c.entrySentences = n("#cfgEntrySent", 1, 30); save();
    $("#cfgEntryWords").value = c.entryWords; $("#cfgEntrySent").value = c.entrySentences;
    $("#entryCfgMsg").textContent = "Gespeichert: " + c.entryWords + " Wörter, " + c.entrySentences + (c.entrySentences === 1 ? " Satz" : " Sätze") + " für " + childName() + ".";
  };
  $("#cfgDictLevel").onchange = () => { R().cfg.dictLevel = $("#cfgDictLevel").value; save(); };
  function renderErrStats(){
    const since = new Date(); since.setDate(since.getDate() - 29); const from = keyOf(since);
    const es = state.entries.filter(e => e.date >= from && e.errCats);
    const tot = {}; es.forEach(e => Object.entries(e.errCats).forEach(([k, n]) => { tot[k] = (tot[k] || 0) + n; }));
    const box = $("#errStats");
    if(!es.length){ box.innerHTML = '<p class="empty">Noch keine Daten. Die Auswertung beginnt mit den nächsten Einträgen.</p>'; return; }
    const ovr = state.entries.filter(e => e.date >= from).reduce((s, e) => s + (e.overrides || 0), 0);
    const groups = CAT_GROUPS.map(([name, subs]) => {
      const parts = Object.entries(subs).map(([k, label]) => [label, tot[k] || 0]).filter(([, n]) => n);
      return { name, n: parts.reduce((s, [, n]) => s + n, 0), parts, lrs: name.startsWith("Typische LRS") };
    }).filter(g => g.n).sort((a, b) => b.n - a.n);
    if(!groups.length){ box.innerHTML = '<p class="empty">In den letzten 30 Tagen (' + es.length + ' Einträge) keine Fehler gefunden. 🎉</p>' + (ovr ? '<p class="note">🤔 ' + ovr + '-mal hat ' + esc(childName()) + ' eine Markierung als richtig erklärt.</p>' : ''); return; }
    const max = groups[0].n;
    let html = '<p class="note">' + es.length + (es.length === 1 ? ' Eintrag' : ' Einträge') + ' ausgewertet.' + (ovr ? ' 🤔 ' + ovr + '-mal hat ' + esc(childName()) + ' eine Markierung als richtig erklärt.' : '') + '</p>' + groups.map(g =>
      '<div class="errgroup' + (g.lrs ? ' lrs' : '') + '"><div class="errrow"><span class="errname">' + esc(g.name) + '</span><span class="errbar"><span style="width:' + Math.round(g.n / max * 100) + '%"></span></span><span class="errcount">' + g.n + '</span></div>' +
      (g.parts.length > 1 || (g.parts[0] && g.parts[0][0]) ? '<p class="errdetail">' + g.parts.map(([l, n]) => esc(l) + ': ' + n).join(", ") + '</p>' : '') + '</div>').join("");
    // gentle hint, never a diagnosis
    const strong = ["spiegel","formaehnlich","eiie","umstellung"].reduce((s, k) => s + (tot[k] || 0), 0);
    const spelling = Object.entries(tot).filter(([k]) => !["komma","satzende","leer","satzz","fall","verb","grammatik","doppelwort","verwechselt","dassdas","getrennt"].includes(k)).reduce((s, [, n]) => s + n, 0);
    if(strong >= 5 && strong / Math.max(1, spelling) >= 0.2)
      html += '<div class="lrs-hint"><b>Hinweis:</b> Verwechslungen wie b/d, m/n, ei/ie oder vertauschte Buchstaben kommen recht häufig vor (' + strong + ' von ' + spelling + ' Rechtschreibfehlern). Das kann ganz normal sein, besonders in den ersten Schuljahren. Wenn es so bleibt, lohnt sich ein Gespräch mit der Lehrkraft. Ob eine Lese-Rechtschreib-Schwäche vorliegt, kann nur ein Test bei Fachleuten klären, zum Beispiel beim schulpsychologischen Dienst oder in der Kinder- und Jugendpsychiatrie. Das Tagebuch kann das nicht feststellen.</div>';
    box.innerHTML = html;
  }
  function renderParentWords(){
    const ul = $("#parentWords"), list = Object.values(state.words).sort((a, b) => b.count - a.count || (b.last || "").localeCompare(a.last || "")).slice(0, 30);
    ul.innerHTML = list.length ? list.map(w => '<li class="word"><b>' + esc(w.richtig) + '</b><small>' + esc(w.kategorie || "") + (w.count > 1 ? ', ' + w.count + '-mal' : '') + '</small></li>').join("") : '<li class="empty">Gerade keine.</li>';
  }
  function readCell(k){
    const r = state.readLog[k];
    if(!r || !r.sec) return '<td class="no">–</td>';
    if(r.sec < 60) return '<td class="no">kurz reingeschaut</td>';
    const m = Math.round(r.sec / 60), n = (r.entries || []).length;
    return '<td>📖 ' + m + ' Min., ' + n + (n === 1 ? ' Eintrag' : ' Einträge') + '</td>';
  }
  function renderNtfyHelp(){
    const tp = ($("#topic").value || "").trim(), box = $("#ntfyHelp");
    if(!tp){ box.innerHTML = ""; return; }
    const url = "https://ntfy.sh/" + tp;
    let qr = "";
    try{ if(window.qrcode){ const q = qrcode(0, "M"); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } }catch(e){}
    box.innerHTML = (qr ? '<div class="qr">' + qr + '</div>' : '') +
      '<div><b>📱 So kommt die Nachricht aufs Handy</b><ol>' +
      '<li>App <b>ntfy</b> installieren und öffnen (App Store oder Google Play). Benachrichtigungen erlauben.</li>' +
      '<li>In der App auf <b>+</b> tippen und genau diesen Namen eintragen: <code>' + esc(tp) + '</code>. Groß- und Kleinschreibung zählt. Server: <code>ntfy.sh</code> (Standard) lassen.</li>' +
      '<li>„Testnachricht senden“ klicken. Die Nachricht muss in der App unter dem Kanal erscheinen.</li></ol>' +
      '<p class="note">Kommt nichts an? Scannt den QR-Code mit der Handy-Kamera oder öffnet <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a>. Seht ihr die Testnachricht dort, kommt sie beim Server an, und es liegt an der App: Kanalname vergleichen, Benachrichtigungen für ntfy in den Handy-Einstellungen erlauben, unter Android den Akku-Sparmodus für ntfy ausschalten und in der App „Sofortige Zustellung“ aktivieren.</p></div>';
  }
  $("#topic").addEventListener("input", renderNtfyHelp);
  function randomTopic(){ const a = new Uint8Array(9); crypto.getRandomValues(a); return "tagebuch-" + Array.from(a, b => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join(""); }
  $("#genTopic").onclick = () => { $("#topic").value = randomTopic(); renderNtfyHelp(); };
  $("#saveParent").onclick = () => {
    const tp = $("#topic").value.trim();
    if(tp && !/^[A-Za-z0-9_-]{6,64}$/.test(tp)){ $("#parentStatus").textContent = "Nur Buchstaben, Zahlen, - und _ (6 bis 64 Zeichen)."; return; }
    state.parent.topic = tp; state.parent.notifyRead = $("#notifyRead").checked; state.parent.readMin = Number($("#readMin").value) || 2; save();
    $("#parentStatus").textContent = "Gespeichert."; flushQueue();
  };
  $("#testNotify").onclick = async () => {
    const tp = $("#topic").value.trim();
    if(!tp){ $("#parentStatus").textContent = "Bitte zuerst einen Kanalnamen eintragen."; return; }
    $("#parentStatus").textContent = "Sende …";
    try{
      const r = await fetch("https://ntfy.sh/" + encodeURIComponent(tp), { method:"POST", body:"👋 Testnachricht vom Tagebuch. Die Benachrichtigung funktioniert." });
      $("#parentStatus").textContent = r.ok ? "Gesendet. Kommt die Nachricht auf dem Handy an?" : "Senden hat nicht geklappt (Fehler " + r.status + ").";
    }catch(e){ $("#parentStatus").textContent = "Keine Verbindung zum Internet. Ohne Internet werden Nachrichten gesammelt und später verschickt."; }
  };
  $("#grammarOn").onchange = () => { state.parent.grammar = $("#grammarOn").checked; save(); $("#ltStatus").textContent = state.parent.grammar ? "Eingeschaltet." : "Ausgeschaltet."; };
  $("#testLT").onclick = async () => {
    const out = $("#ltStatus"); out.textContent = "Teste …";
    const where = location.protocol === "file:" ? "als Datei geöffnet" : "über " + location.host;
    if(!navigator.onLine){ out.textContent = "Das Gerät ist gerade offline."; return; }
    // 1) is the internet reachable at all? (ntfy answers browser requests from anywhere)
    let net = false;
    try{ const r = await fetch("https://ntfy.sh/v1/health", { cache:"no-store" }); net = r.ok; }catch(e){}
    // 2) LanguageTool itself
    try{
      const body = new URLSearchParams({ text:"Ich habe gestern mit meinen Freund gespielt weil es regnete.", language:"de-DE" });
      const r = await fetch("https://api.languagetool.org/v2/check", { method:"POST", body });
      if(r.ok){ const d = await r.json(); out.textContent = "Verbunden. Im Testsatz wurden " + (d.matches || []).length + " Fehler gefunden."; return; }
      out.textContent = "LanguageTool antwortet mit Fehler " + r.status + (r.status === 429 ? " (zu viele Anfragen, später nochmal versuchen)." : ".") + " Code: LT-" + r.status;
    }catch(e){
      out.textContent = net
        ? "Internet geht, aber der Browser lässt die Anfrage an LanguageTool nicht zu (Tagebuch " + where + "). Code: LT-BLOCK"
        : "Weder LanguageTool noch der Testserver sind erreichbar. Ist das Gerät wirklich online, oder blockiert ein Kinderschutz-Filter? Code: LT-NONET";
    }
  };
  $("#changePin").onclick = () => {
    const box = $("#changePinBox");
    pinForm(box, { mode:"set", intro:"Neue Eltern-PIN eingeben:", button:"Speichern", cancel: () => { box.innerHTML = ""; },
      onOk: async v => { state.parent.pinHash = await hashPin(v); state.parent.pin = ""; save(); box.innerHTML = '<p class="note">Neue Eltern-PIN gespeichert.</p>'; } });
  };
  $("#resetKidPin").onclick = () => {
    const n = childName();
    if(!state.kidPinHash){ $("#kidPinMsg").textContent = n + " hat noch keine PIN."; return; }
    if(!confirm(n + "s PIN wirklich zurücksetzen? " + n + " legt dann beim nächsten Öffnen eine neue PIN fest und sieht einen Hinweis, dass ihr sie zurückgesetzt habt.")) return;
    state.kidPinHash = ""; state.kidPinReset = true; save(); renderParent();
    $("#kidPinMsg").textContent = "Zurückgesetzt.";
  };
  $("#lockParent").onclick = () => goHome();

  // ---------- start page with tiles ----------
  function childName(){ return (state.name || "").trim() || "Kind"; }
  function diaryTitle(){ const n = (state.name || "").trim(); return n ? genitive(n) + " Tagebuch" : "Mein Tagebuch"; }
  function genitive(n){ return /[sßxz]$/i.test(n) ? n + "’" : n + "s"; }
  function streakOf(){ const days = coveredDays(); let d = new Date(); if(!days.has(keyOf(d))) d.setDate(d.getDate() - 1); let n = 0; while(days.has(keyOf(d))){ n++; d.setDate(d.getDate() - 1); } return n; }
  function renderHome(){
    const box = $("#kidTiles");
    const named = family.children.filter(id => (family.data[id].name || "").trim());
    box.innerHTML = named.map(id => withChild(id, () => {
      const today = state.entries.some(e => e.date === todayKey()), streak = streakOf();
      const sub = (today ? "Heute schon geschrieben ✓" + (streak > 1 ? "  🔥 " + streak : "") : (streak > 0 ? "🔥 " + streak + (streak === 1 ? " Tag" : " Tage") + " am Stück" : "Schreiben, malen und lesen")) + "  🪙 " + fmtC(balance());
      return '<button type="button" class="tile kid" data-kid="' + esc(id) + '"><span class="tile-emoji" aria-hidden="true">✏️</span><span class="tile-name">' + esc(childName()) + '</span><span class="tile-sub">' + esc(sub) + '</span></button>';
    })).join("");
    $("#noKids").hidden = named.length > 0;
    box.querySelectorAll("[data-kid]").forEach(b => b.onclick = () => { enterChild(b.dataset.kid); renderKidLock(false); show("kidLockView"); });
    document.title = "Mein Tagebuch";
  }
  function enterChild(id){
    useChild(id); save();
    // reset everything that belongs to the previous child
    session = newSession(); resultEl.hidden = true; resultEl.innerHTML = ""; doneEl.hidden = true; doneEl.innerHTML = ""; $("#writeArea").hidden = false; checkBtn.textContent = "Prüfen";
    ta.value = state.draft || ""; QUESTIONS.forEach(([k]) => { qa[k].value = (state.draftQ || {})[k] || ""; });
    $("#ideaPanel").hidden = true; $("#kidTitle").textContent = diaryTitle(); document.title = diaryTitle();
    if(typeof GM !== "undefined" && GM){ GM.over = true; GM = null; }
    applyPrefs(); updateCount(); renderStreak(); renderWords(); renderEntries(); renderNames(); renderCoinBadge(); restoreDraftPic();
  }
  function show(view){
    if(typeof arcadeTimer !== "undefined" && arcadeTimer) closeArcade();
    if(view !== "kidView") stopReading();
    document.querySelector("main").classList.toggle("wide", view === "kidView" || view === "parentView");
    ["homeView","kidView","kidLockView","parentView"].forEach(v => { $("#" + v).hidden = v !== view; });
    window.scrollTo(0, 0);
  }
  function goHome(){ parentOpen = false; renderPinBox(); renderStreak(); renderHome(); show("homeView"); }
  document.querySelectorAll("[data-home]").forEach(b => b.onclick = goHome);
  function openKid(){ settleWeeks(); renderCoinBadge(); showView(false); show("kidView"); }
  function renderKidLock(change){
    const n = childName(), box = $("#kidPinBox");
    $("#kidLockTitle").textContent = diaryTitle();
    const setNew = async v => { state.kidPinHash = await hashPin(v); state.kidPinReset = false; save(); openKid(); };
    if(change){
      pinForm(box, { mode:"set", intro:"Lege eine neue geheime PIN fest (4 bis 8 Ziffern).", button:"Speichern", onOk: setNew, cancel: () => show("kidView") });
    } else if(state.kidPinHash){
      pinForm(box, { mode:"enter", intro:"Hallo " + esc(n) + "! Gib deine PIN ein.", button:"Öffnen",
        check: async v => (await hashPin(v)) === state.kidPinHash, onOk: openKid,
        extra:'<p class="note">PIN vergessen? Mama oder Papa können sie zurücksetzen. Dann legst du eine neue fest.</p>' });
    } else {
      pinForm(box, { mode:"set", button:"PIN festlegen", onOk: setNew,
        intro: (state.kidPinReset ? "<b>Deine PIN wurde von Mama oder Papa zurückgesetzt.</b> " : "Hallo " + esc(n) + "! ") +
          "Lege deine eigene geheime PIN fest (4 bis 8 Ziffern). Nur du kennst sie, auch Mama und Papa nicht." });
    }
  }
  $("#kidHelpBtn").onclick = () => { $("#kidHelp").hidden = false; $("#kidHelpClose").focus(); };
  $("#kidHelpClose").onclick = () => { $("#kidHelp").hidden = true; };
  $("#kidHelp").addEventListener("pointerdown", e => { if(e.target === $("#kidHelp")) $("#kidHelp").hidden = true; });
  $("#kidPinChange").onclick = () => { renderKidLock(true); show("kidLockView"); };
  $("#tileParent").onclick = () => { parentOpen = false; pSection = "overview"; renderPinBox(); show("parentView"); setTimeout(() => { const p = $("#pinIn"); if(p) p.focus(); }, 50); };
  // ---------- children management (parents) ----------
  function renderChildBar(){
    const sel = $("#childSel");
    sel.innerHTML = family.children.map(id => { const c = family.data[id]; const open = ((c.reward && c.reward.orders) || []).filter(o => o.status === "open").length; return '<option value="' + esc(id) + '"' + (id === state.id ? ' selected' : '') + '>' + esc(c.name || "(ohne Namen)") + (open ? ' (🛒 ' + open + ')' : '') + '</option>'; }).join("");
    sel.disabled = family.children.length < 2;
    $("#unnamedHint").hidden = !family.children.some(id => !(family.data[id].name || "").trim());
    $("#kidList").innerHTML = family.children.map(id => { const c = family.data[id]; return '<li class="kidrow"><input type="text" value="' + esc(c.name) + '" data-rename="' + esc(id) + '" maxlength="30" placeholder="Name eingeben" aria-label="Name"><span class="when">' + c.entries.length + ' Einträge</span><button type="button" class="btn-ghost" data-delkid="' + esc(id) + '">Entfernen</button></li>'; }).join("") || '<li class="empty">Noch kein Kind angelegt.</li>';
    document.querySelectorAll("[data-rename]").forEach(inp => inp.onchange = () => { const v = inp.value.trim(); if(!v) return; family.data[inp.dataset.rename].name = v; save(); setTimeout(() => { renderParent(); renderHome(); }, 0); });
    document.querySelectorAll("[data-delkid]").forEach(b => b.onclick = () => removeChild(b.dataset.delkid));
  }
  function addChild(name){
    name = (name || "").trim(); if(!name) return false;
    const c = freshChild(name); c.folder = safeFolder(name); family.children.push(c.id); family.data[c.id] = c; useChild(c.id); save(); return true;
  }
  async function removeChild(id){
    const c = family.data[id]; if(!c) return;
    const sure = await dangerDialog({ title: c.name + " entfernen?", confirm: "Tagebuch endgültig löschen", word: c.name,
      html: '<p>Das ganze Tagebuch von <b>' + esc(c.name) + '</b> wird <b>unwiderruflich gelöscht</b>:</p><div class="dangerlist">' + c.entries.length + ' Einträge mit Bildern, Coins, Joker, Übungen und Spielstände' + (folderReady() ? '<br>und der Ordner <code>kinder/' + esc(c.folder || "") + '</code>' : '') + '</div>' });
    if(!sure) return;
    for(const e of c.entries) if(e.id) await idb.del(e.id);
    await removeChildFolder(c);
    await idb.del("draft:" + id);
    family.children = family.children.filter(x => x !== id); delete family.data[id];
    useChild(family.children[0]); save(); renderParent(); renderHome();
  }
  $("#childSel").onchange = () => { useChild($("#childSel").value); save(); renderParent(); };
  $("#addKid").onclick = () => { if(addChild($("#newKidName").value)){ $("#newKidName").value = ""; $("#kidMsg").textContent = "Angelegt."; renderParent(); renderHome(); } else $("#kidMsg").textContent = "Bitte einen Namen eingeben."; };
  $("#addKidTop").onclick = () => { goSection("settings"); $("#newKidName").focus(); };

  // =====================================================================
  // 🎯 PRACTICE: word dictation + short dictation (texts: MiniKlexikon/Klexikon, CC BY-SA 4.0)
  // =====================================================================
  let PD = null;
  function practiceData(){ if(!PD){ try{ PD = window.TB_PRACTICE || JSON.parse(document.getElementById("practiceData").textContent); }catch(e){ PD = null; } } return PD; }
  function P(){
    const p = state.practice || (state.practice = {});
    p.log = p.log || []; p.usedDict = p.usedDict || []; p.wordSeen = p.wordSeen || {}; p.seenTopics = p.seenTopics || []; p.badDict = p.badDict || [];
    return p;
  }
  // ---- speech ----
  let deVoice = null;
  let speechFinish = null, speechPreviewSerial = 0;
  function speechSettings(){
    const settings = (family && family.parent.speech) || {};
    const rate = Number(settings.rate);
    return { voice: typeof settings.voice === "string" ? settings.voice : "", rate: Number.isFinite(rate) && rate >= 0.6 && rate <= 1.2 ? rate : 0.85 };
  }
  const voiceId = voice => voice.voiceURI || voice.name + "|" + voice.lang;
  const germanVoices = () => ((window.speechSynthesis && speechSynthesis.getVoices()) || []).filter(v => /^de(?:[-_]|$)/i.test(v.lang));
  function pickVoice(){
    const vs = germanVoices(), selected = speechSettings().voice;
    deVoice = vs.find(v => voiceId(v) === selected) || vs.find(v => /^de(-|_)DE/i.test(v.lang) && /google|microsoft|anna|helena|katja|hedda|petra/i.test(v.name)) || vs[0] || null;
  }
  function renderSpeechSettings(){
    pickVoice();
    const select = $("#speechVoice"), settings = speechSettings(), voices = germanVoices();
    select.replaceChildren();
    const automatic = document.createElement("option"); automatic.value = ""; automatic.textContent = "Automatisch auswählen"; select.append(automatic);
    voices.forEach(voice => { const option = document.createElement("option"); option.value = voiceId(voice); option.textContent = voice.name + " (" + voice.lang + ")"; select.append(option); });
    const missing = settings.voice && !voices.some(v => voiceId(v) === settings.voice);
    select.value = missing ? "" : settings.voice;
    select.disabled = !voices.length;
    $("#speechRate").value = settings.rate;
    $("#speechRateLabel").textContent = settings.rate.toLocaleString("de-DE", { minimumFractionDigits:2 }) + " ×";
    $("#speechVoiceInfo").textContent = !window.speechSynthesis ? "Dieser Browser unterstützt keine Sprachausgabe." : !voices.length ? "Noch keine deutsche Stimme verfügbar. Richtet sie im Betriebssystem ein und ladet die Stimmen erneut." :
      (missing ? "Die gespeicherte Stimme ist auf diesem Gerät nicht verfügbar. Stattdessen wird automatisch eine deutsche Stimme gewählt. " : "") + "Aktuelle Stimme: " + deVoice.name + ". Stimmen und Klang hängen vom Gerät und Browser ab; manche Stimmen benötigen Internet.";
    $("#speechTest").disabled = $("#speechTestSlow").disabled = !deVoice;
    $("#speechWindowsLinks").hidden = !/win/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "");
    $("#speechMacHelp").hidden = !(/Mac/i.test(navigator.platform) && !(navigator.maxTouchPoints > 1));
  }
  if(window.speechSynthesis){ pickVoice(); speechSynthesis.addEventListener("voiceschanged", renderSpeechSettings); }
  function stopSpeech(){
    if(speechFinish) speechFinish(false);
    if(window.speechSynthesis) speechSynthesis.cancel();
  }
  function speak(text, slow){
    return new Promise(res => {
      pickVoice();
      if(!window.speechSynthesis || !deVoice){ res(false); return; }
      stopSpeech();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = deVoice.lang; u.voice = deVoice;
      u.rate = Math.max(0.4, speechSettings().rate * (slow ? 0.6 / 0.85 : 1));
      const finish = ok => { if(speechFinish !== finish) return; speechFinish = null; res(ok); };
      speechFinish = finish;
      u.onend = () => finish(true); u.onerror = () => finish(false);
      try{ speechSynthesis.speak(u); }catch(e){ finish(false); }
    });
  }
  function saveSpeechSettings(){
    family.parent.speech = { voice: $("#speechVoice").value, rate: Number($("#speechRate").value) };
    save(); renderSpeechSettings(); $("#speechStatus").textContent = "Gespeichert. Die Einstellung gilt auch für die Diktate.";
  }
  $("#speechVoice").onchange = saveSpeechSettings;
  $("#speechRate").oninput = () => { $("#speechRateLabel").textContent = Number($("#speechRate").value).toLocaleString("de-DE", { minimumFractionDigits:2 }) + " ×"; };
  $("#speechRate").onchange = saveSpeechSettings;
  $("#speechRefresh").onclick = renderSpeechSettings;
  async function speechPreview(slow){
    const serial = ++speechPreviewSerial, text = $("#speechSample").value.trim();
    if(!text){ $("#speechStatus").textContent = "Bitte einen Text für die Hörprobe eingeben."; return; }
    $("#speechStatus").textContent = "Hörprobe läuft …";
    const ok = await speak(text, slow);
    if(serial === speechPreviewSerial) $("#speechStatus").textContent = ok ? "Hörprobe beendet. Passt die Stimme? Ihr könnt Stimme und Tempo verändern und erneut testen." : "Die Hörprobe konnte nicht abgespielt werden. Bitte Stimme und Lautstärke prüfen und erneut versuchen.";
  }
  $("#speechTest").onclick = () => speechPreview(false);
  $("#speechTestSlow").onclick = () => speechPreview(true);
  $("#speechStop").onclick = () => { speechPreviewSerial++; stopSpeech(); $("#speechStatus").textContent = "Hörprobe gestoppt."; };
  const canSpeak = () => !!window.speechSynthesis && !!deVoice;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function todaysTasks(){ return P().log.filter(l => l.date === todayKey() && l.done).length; }
  function weakCats(){
    const tot = catCounts(29, 0);
    const list = Object.entries(tot).filter(([k]) => k !== "other").sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return list.length ? list : ["ss","dopp","ie","dehnung","gross","hartweich"];
  }
  // ---------- word dictation ----------
  const LEITNER = [0, 1, 3, 7, 14, 30];
  function pickWords(n){
    const d = practiceData(), p = P(), today = todayKey(), out = [], seen = new Set();
    // 1) due words from his own practice list (spaced repetition)
    const own = Object.entries(state.words).filter(([, w]) => { const lv = w.lv || 0; return !w.due || w.due <= today; }).sort(() => Math.random() - .5).slice(0, Math.ceil(n / 2));
    own.forEach(([k, w]) => { if(!seen.has(w.richtig)){ seen.add(w.richtig); out.push({ word: w.richtig, ctx: ctxFor(w.richtig), own: k, cat: wordFine(w) }); } });
    // 2) bank words from his weak categories, not seen in the last 21 days
    const cats = weakCats().filter(c => d && d.b[c] && d.b[c].length);
    let guard = 0;
    while(out.length < n && guard++ < 400){
      const c = cats[Math.floor(Math.random() * Math.min(cats.length, 3))] || "ss";
      const pool = d.b[c]; const idx = pool[Math.floor(Math.random() * pool.length)];
      const [w, si] = d.w[idx];
      const last = p.wordSeen[w];
      if(seen.has(w) || (last && addDays(last, 21) > today)) continue;
      seen.add(w); out.push({ word: w, ctx: si >= 0 ? d.s[si] : "", cat: c });
    }
    return out;
  }
  function ctxFor(word){
    const d = practiceData(); if(!d) return "";
    const hit = d.w.find(x => x[0] === word); if(hit && hit[1] >= 0) return d.s[hit[1]];
    const s = d.s.find(x => new RegExp("(^|[^\\p{L}])" + word + "([^\\p{L}]|$)", "u").test(x) && x.length < 90);
    return s || "";
  }
  let WD = null;
  function startWordDictation(){
    WD = { items: pickWords(10), i: 0, right: 0, phase: "ask", cats: {} };
    renderWordDictation(); sayWord();
  }
  async function sayWord(slow){
    const it = WD && WD.items[WD.i]; if(!it) return;
    await speak(it.word, slow); await sleep(350);
    if(it.ctx){ await speak(it.ctx, slow); await sleep(350); await speak(it.word, slow); }
  }
  function renderWordDictation(){
    const box = $("#practiceBox"), it = WD.items[WD.i];
    if(!it){ return finishWordDictation(); }
    box.innerHTML = '<div class="pcardx"><div class="prog">Wort ' + (WD.i + 1) + ' von ' + WD.items.length + ' · ' + WD.right + ' richtig</div>' +
      '<div class="speakrow"><button type="button" class="btn" id="wdSay">🔊 Nochmal hören</button><button type="button" class="btn-ghost" id="wdSlow">🐢 Langsam</button></div>' +
      (WD.phase === "ask"
        ? '<input type="text" class="dictin" id="wdIn" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Schreib das Wort …"><div class="below"><button type="button" class="btn" id="wdCheck">Prüfen</button></div>'
        : '<p class="wrongmsg">Nicht ganz. So schreibt man es richtig:</p><p class="rightword">' + esc(it.word) + '</p><p class="note">Schreib es einmal richtig ab, damit es sich einprägt:</p><input type="text" class="dictin" id="wdIn" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><div class="below"><button type="button" class="btn" id="wdCheck">Weiter</button></div>') +
      '<p class="note">Tipp: Achte auch auf Groß- und Kleinschreibung.</p></div>';
    $("#wdSay").onclick = () => sayWord(false); $("#wdSlow").onclick = () => sayWord(true);
    const inp = $("#wdIn"); setTimeout(() => inp.focus(), 30);
    const go = () => {
      const v = inp.value.trim(); if(!v) return;
      const p = P();
      if(WD.phase === "ask"){
        const ok = v === it.word;
        p.wordSeen[it.word] = todayKey();
        if(it.own){ const w = state.words[it.own]; if(w){ w.lv = ok ? Math.min((w.lv || 0) + 1, LEITNER.length - 1) : 0; w.due = addDays(todayKey(), LEITNER[w.lv]); if(ok && w.lv >= LEITNER.length - 1) delete state.words[it.own]; } }
        else if(!ok){ const k = lower(it.word); state.words[k] = state.words[k] || { richtig: it.word, kategorie: (TRICK[it.cat] || [""])[0], fine: it.cat, count: 0, last: todayKey() }; state.words[k].count++; }
        if(ok){ WD.right++; WD.i++; flash(true); save(); renderWordDictation(); if(WD && WD.i < WD.items.length) setTimeout(sayWord, 500); }
        else { WD.cats[it.cat] = (WD.cats[it.cat] || 0) + 1; WD.phase = "copy"; save(); renderWordDictation(); }
      } else {
        if(v !== it.word){ inp.classList.add("shake"); setTimeout(() => inp.classList.remove("shake"), 400); return; }
        WD.phase = "ask"; WD.i++; renderWordDictation(); if(WD && WD.i < WD.items.length) setTimeout(sayWord, 400);
      }
    };
    $("#wdCheck").onclick = go; inp.onkeydown = e => { if(e.key === "Enter") go(); };
  }
  function flash(ok){ const b = $("#practiceBox"); b.classList.add(ok ? "okflash" : "noflash"); setTimeout(() => b.classList.remove("okflash", "noflash"), 500); }
  function finishWordDictation(){
    const p = P(), n = WD.items.length;
    p.log.push({ date: todayKey(), type: "words", n, right: WD.right, cats: WD.cats, done: true });
    if(p.log.length > 400) p.log.splice(0, p.log.length - 400);
    save(); renderWords();
    $("#practiceBox").innerHTML = '<div class="pcardx done"><div class="bigok">' + (WD.right === n ? "🏆" : "✅") + '</div><h3>' + WD.right + ' von ' + n + ' Wörtern richtig!</h3>' +
      '<p>' + (WD.right === n ? "Perfekt! " : "Die falschen Wörter kommen in den nächsten Tagen wieder, bis sie sitzen. ") + 'Das war eine Zusatzaufgabe' + gameBonusText() + '.</p>' +
      '<div class="below"><button type="button" class="btn-ghost" id="pBack">Zurück zur Übersicht</button></div></div>';
    $("#pBack").onclick = renderPractice; WD = null;
  }
  // ---------- short dictation ----------
  let DT = null;
  function dictLevel(){ const c = R().cfg.dictLevel || "auto"; if(c !== "auto") return c === "mittel" ? 2 : 1; const done = P().log.filter(l => l.type === "dict" && l.done); const recent = done.slice(-5); const avg = recent.length ? recent.reduce((s, l) => s + l.errors / Math.max(1, l.words), 0) / recent.length : 1; return recent.length >= 3 && avg < 0.05 ? 2 : 1; }
  function pickDictation(exclude){
    const d = practiceData(); if(!d) return null;
    const p = P(), lvl = dictLevel(), used = new Set([...p.usedDict, ...p.badDict, ...(exclude || [])]);
    const weak = weakCats().slice(0, 3), w = {}; weak.forEach((c, i) => { w[c] = 3 - i; });
    let cand = d.d.map((x, i) => ({ i, x })).filter(o => o.x[1] === lvl && !used.has(o.i));
    if(cand.length < 20){ p.usedDict = []; cand = d.d.map((x, i) => ({ i, x })).filter(o => o.x[1] === lvl && !p.badDict.includes(o.i)); }
    const lastTopics = new Set(p.log.filter(l => l.type === "dict").slice(-30).map(l => l.topic));
    cand.forEach(o => { o.score = d.cats.reduce((s, c, k) => s + (w[c] || 0) * Math.min(o.x[3][k], 4), 0) + Math.random() * 4 - (lastTopics.has(o.x[0]) ? 10 : 0); });
    cand.sort((a, b) => b.score - a.score);
    const top = cand.slice(0, 25); return top[Math.floor(Math.random() * top.length)];
  }
  function chunksOf(text){
    // split into dictation parts of max ~5 words, keeping punctuation
    const out = [];
    text.match(/[^.!?]+[.!?]/g).forEach(sent => {
      const parts = sent.trim().split(/(?<=,)\s+/);
      parts.forEach(part => {
        const ws = part.split(/\s+/);
        for(let i = 0; i < ws.length; i += 5){ const rest = ws.length - i; const take = rest <= 7 ? rest : 5; out.push(ws.slice(i, i + take).join(" ")); i += take - 5; }
      });
    });
    return out;
  }
  const PUNCT_WORD = { ",": " Komma.", ".": " Punkt.", "!": " Ausrufezeichen.", "?": " Fragezeichen." };
  async function startDictation(){
    const d = practiceData(); if(!d) return;
    $("#practiceBox").innerHTML = '<div class="pcardx"><p>Ich suche einen passenden Text …</p></div>';
    let pick = null; const tried = [];
    for(let k = 0; k < 4; k++){
      pick = pickDictation(tried); if(!pick) break;
      const text = pick.x[2].map(i => d.s[i]).join(" ");
      if(state.parent.grammar && navigator.onLine){            // double-check the source text with LanguageTool when online
        const m = await ltCheck(text);
        if(m && m.length){ P().badDict.push(pick.i); tried.push(pick.i); save(); pick = null; continue; }
      }
      break;
    }
    if(!pick){ $("#practiceBox").innerHTML = '<div class="pcardx"><p>Gerade ist kein Text verfügbar.</p></div>'; return; }
    const text = pick.x[2].map(i => d.s[i]).join(" ");
    DT = { id: pick.i, topic: d.t[pick.x[0]], text, chunks: chunksOf(text), k: -1 };
    renderDictation();
  }
  async function sayChunk(k, slow){ if(!DT) return; const c = DT.chunks[k]; if(!c) return; const end = c.slice(-1); const body = c.replace(/[,.!?]$/, ""); await speak(body + (PUNCT_WORD[end] || ""), slow); }
  function renderDictation(){
    const box = $("#practiceBox");
    box.innerHTML = '<div class="pcardx"><div class="prog">Diktat zum Thema „' + esc(DT.topic) + '“ · ' + DT.chunks.length + ' Teile</div>' +
      '<p class="note">So geht es: Hör dir zuerst den ganzen Text an. Dann sage ich ihn Stück für Stück. Satzzeichen sage ich mit an („Komma“, „Punkt“).</p>' +
      '<div class="speakrow"><button type="button" class="btn-ghost" id="dtAll">🔊 Ganzer Text</button><button type="button" class="btn" id="dtNext">▶ ' + (DT.k < 0 ? 'Los geht’s' : 'Nächster Teil') + '</button><button type="button" class="btn-ghost" id="dtAgain" ' + (DT.k < 0 ? 'disabled' : '') + '>🔁 Teil wiederholen</button><button type="button" class="btn-ghost" id="dtSlow" ' + (DT.k < 0 ? 'disabled' : '') + '>🐢 Langsam</button></div>' +
      '<div class="prog">' + (DT.k < 0 ? '' : 'Teil ' + (DT.k + 1) + ' von ' + DT.chunks.length) + '</div>' +
      '<textarea class="lined dictarea" id="dtIn" spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="off" placeholder="Hier schreibst du das Diktat …"></textarea>' +
      '<div class="below"><button type="button" class="btn" id="dtDone" ' + (DT.k < DT.chunks.length - 1 ? 'disabled' : '') + '>Fertig, vergleichen</button></div>' +
      '<p class="credit2">Text aus dem ' + (practiceData().d[DT.id][1] === 1 ? 'MiniKlexikon' : 'Klexikon') + ' (klexikon.zum.de), Lizenz CC BY-SA 4.0</p></div>';
    const inp = $("#dtIn"); if(DT.typed) inp.value = DT.typed; inp.oninput = () => { DT.typed = inp.value; };
    $("#dtAll").onclick = () => speak(DT.text);
    $("#dtNext").onclick = async () => { DT.typed = inp.value; if(DT.k < DT.chunks.length - 1){ DT.k++; const k = DT.k; renderDictation(); await sayChunk(k); await sleep(1200); if(DT && DT.k === k) await sayChunk(k); } };
    $("#dtAgain").onclick = () => sayChunk(DT.k); $("#dtSlow").onclick = () => sayChunk(DT.k, true);
    $("#dtDone").onclick = () => { DT.typed = inp.value; compareDictation(); };
    setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 30);
  }
  function tokenize(s){ return (s.match(/[\p{L}]+(?:-[\p{L}]+)*|[.,!?]/gu) || []); }
  function align(a, b){ // LCS on tokens -> pairs
    const n = a.length, m = b.length, L = Array.from({ length:n+1 }, () => new Array(m+1).fill(0));
    for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) L[i][j] = a[i] === b[j] ? L[i+1][j+1] + 1 : Math.max(L[i+1][j], L[i][j+1]);
    const out = []; let i = 0, j = 0;
    while(i < n || j < m){
      if(i < n && j < m && a[i] === b[j]){ out.push([a[i], b[j]]); i++; j++; }
      else if(i < n && j < m && L[i+1][j+1] >= Math.max(L[i+1][j], L[i][j+1])){ out.push([a[i], b[j]]); i++; j++; }  // substitution
      else if(j < m && (i >= n || L[i][j+1] >= L[i+1][j])){ out.push([null, b[j]]); j++; }  // missing in typed
      else { out.push([a[i], null]); i++; }                                                    // extra typed
    }
    return out;
  }
  function compareDictation(){
    const typed = tokenize(DT.typed || ""), orig = tokenize(DT.text), pairs = align(typed, orig);
    let errors = 0, words = orig.filter(t => /\p{L}/u.test(t)).length; const cats = {};
    const origHtml = [], typedHtml = [];
    pairs.forEach(([t, o]) => {
      const sp = x => (x && /^[.,!?]$/.test(x) ? "" : " ");
      if(t === o){ origHtml.push(sp(o) + esc(o)); typedHtml.push(sp(t) + esc(t)); return; }
      errors++;
      const c = !o || !t ? (/^[.,!?]$/.test(o || t) ? ((o || t) === "," ? "komma" : "satzende") : "auslassung") : (/^[.,!?]$/.test(o) ? (o === "," ? "komma" : "satzende") : fineCats(t, o)[0]);
      cats[c] = (cats[c] || 0) + 1;
      if(o){ origHtml.push(sp(o) + '<mark class="ok">' + esc(o) + '</mark>'); }
      if(t){ typedHtml.push(sp(t) + '<mark class="bad">' + esc(t) + '</mark>'); } else typedHtml.push(' <mark class="bad gap">_</mark>');
      if(o && t && /\p{L}/u.test(o)){ const k = lower(o); state.words[k] = state.words[k] || { richtig: o, kategorie: (TRICK[c] || [""])[0], fine: c, count: 0, last: todayKey() }; state.words[k].count++; }
    });
    const p = P(); p.usedDict.push(DT.id);
    p.log.push({ date: todayKey(), type: "dict", id: DT.id, topic: DT.topic, words, errors, cats, done: true });
    save(); renderWords();
    const grade = errors === 0 ? "🏆 Fehlerfrei!" : errors <= 2 ? "⭐ Sehr gut!" : errors <= 5 ? "👍 Gut gemacht!" : "💪 Weiter üben, du schaffst das!";
    $("#practiceBox").innerHTML = '<div class="pcardx"><h3>' + grade + ' ' + errors + (errors === 1 ? ' Fehler' : ' Fehler') + ' bei ' + words + ' Wörtern</h3>' +
      '<div class="cmpgrid"><div><b>Dein Diktat</b><p class="cmp">' + typedHtml.join("").trim() + '</p></div><div><b>So ist es richtig</b><p class="cmp">' + origHtml.join("").trim() + '</p></div></div>' +
      (errors ? '<p class="note">Grün markiert ist, wie es richtig heißt. Die falsch geschriebenen Wörter kommen in dein Wort-Training.</p>' : '') +
      '<p>Das war eine Zusatzaufgabe' + gameBonusText() + '.</p><div class="below"><button type="button" class="btn-ghost" id="pBack">Zurück zur Übersicht</button></div>' +
      '<p class="credit2">Text aus dem Klexikon-Projekt (klexikon.zum.de), Lizenz CC BY-SA 4.0</p></div>';
    $("#pBack").onclick = renderPractice; DT = null;
  }
  function gameBonusText(){ const c = R().cfg; return c.gamePerTask ? ' (+' + c.gamePerTask + ' Minuten Spielzeit 🎮)' : ''; }
  function renderPractice(){
    const box = $("#practiceBox"), p = P(), n = todaysTasks();
    if(!practiceData()){ box.innerHTML = '<p class="empty">Die Übungsdaten fehlen in dieser Datei.</p>'; return; }
    const speech = canSpeak();
    const due = Object.values(state.words).filter(w => !w.due || w.due <= todayKey()).length;
    box.innerHTML = (speech ? '' : '<div class="warn">Dein Browser hat keine deutsche Vorlesestimme. Unter Windows: Einstellungen → Zeit und Sprache → Sprache → Deutsch → Sprachausgabe installieren. Oder Chrome bzw. Edge verwenden.</div>') +
      '<p class="note">Freiwillige Zusatzaufgaben. Heute erledigt: <b>' + n + '</b>.' + (R().cfg.gamePerTask ? ' Jede bringt +' + R().cfg.gamePerTask + ' Minuten Spielzeit 🎮.' : '') + '</p>' +
      '<div class="tasks">' +
      '<button type="button" class="task" id="tWords" ' + (speech ? '' : 'disabled') + '><span class="ti">🔤</span><b>Wort-Diktat</b><span>10 Wörter, passend zu deinen Fehler-Detektiven' + (due ? ' (' + due + ' Wiederholungen fällig)' : '') + '. Ca. 5 Minuten.</span></button>' +
      '<button type="button" class="task" id="tDict" ' + (speech ? '' : 'disabled') + '><span class="ti">📝</span><b>Kurz-Diktat</b><span>Ein kurzer Text aus dem Kinderlexikon, immer ein anderes Thema. Ca. 10 Minuten.</span></button>' +
      '</div>' +
      (p.log.length ? '<h3>Zuletzt geübt</h3><ul class="orders">' + p.log.slice(-6).reverse().map(l => '<li><span>' + (l.type === "words" ? "🔤" : "📝") + '</span><b>' + (l.type === "words" ? l.right + "/" + l.n + " Wörter richtig" : l.errors + " Fehler bei " + l.words + " Wörtern") + '</b>' + (l.topic ? '<span>' + esc(l.topic) + '</span>' : '') + '<span class="when">' + fmtShort(l.date) + '</span></li>').join("") + '</ul>' : '');
    if(speech){ $("#tWords").onclick = startWordDictation; $("#tDict").onclick = startDictation; }
  }

  // =====================================================================
  // 💡 WRITING IDEAS: personal W-questions for a diary (grades 3 to 6)
  //    tag a = any day, s = school day only, w = free day only (weekend or pause day)
  // =====================================================================
  const DIARY_Q = [["a", "Wie hast du dich heute beim Aufwachen gefühlt?"], ["a", "Welche Schulnote von 1 bis 6 würdest du deinem Tag geben? Warum?"], ["a", "Wie hast du heute jemandem geholfen?"], ["a", "Wie hat dir heute jemand geholfen?"], ["a", "Wie war das Wetter heute, und was hast du deshalb gemacht?"], ["a", "Wie hast du den Nachmittag verbracht?"], ["a", "Wie hast du dich gefühlt, als du heute nach Hause gekommen bist?"], ["a", "Mit welchen drei Wörtern würdest du deinen Tag beschreiben? Erkläre sie."], ["a", "Was gab es heute zu essen, und wie hat es dir geschmeckt?"], ["a", "Wie lange warst du heute draußen, und was hast du dort gemacht?"], ["s", "Wie hast du heute die Pause verbracht?"], ["s", "Wie lief heute der Unterricht in deinem Lieblingsfach?"], ["a", "Wie hast du einen Streit gelöst, oder wie hättest du ihn lösen können?"], ["s", "Wie war heute dein Weg zur Schule? Was hast du unterwegs gesehen?"], ["a", "Wie hast du den Abend verbracht?"], ["a", "Wie hast du heute jemanden zum Lachen gebracht?"], ["a", "Wie geht es dir gerade in diesem Moment?"], ["w", "Wie war dein freier Tag bisher?"], ["a", "Wie würde dein bester Freund oder deine beste Freundin deinen Tag beschreiben?"], ["a", "Wann warst du heute mutig?"], ["a", "Wie hast du heute etwas Neues ausprobiert?"], ["a", "Wie fühlst du dich, wenn du an morgen denkst?"], ["a", "Wie hast du heute Rücksicht auf jemanden genommen?"], ["a", "Wie war heute die Stimmung bei euch zu Hause?"], ["a", "Wie sah der Himmel heute aus?"], ["a", "Wie hast du heute Zeit mit deinen Geschwistern oder Freunden verbracht?"], ["a", "Was war heute das Lustigste, das passiert ist?"], ["a", "Was hat dich heute überrascht?"], ["a", "Was hast du heute zum ersten Mal gemacht?"], ["a", "Was hat dich heute geärgert, und was hast du dann gemacht?"], ["a", "Was hat dich heute stolz gemacht?"], ["a", "Was würdest du gern noch einmal erleben?"], ["a", "Was würdest du an diesem Tag ändern, wenn du könntest?"], ["s", "Was hast du heute in der Pause gespielt?"], ["a", "Was hast du heute gelesen, gehört oder gesehen, das dir gefallen hat?"], ["a", "Was war heute schwierig für dich?"], ["a", "Was hast du heute geschafft, obwohl es nicht leicht war?"], ["a", "Was hat dir heute Sorgen gemacht?"], ["a", "Was hat dich heute zum Nachdenken gebracht?"], ["a", "Was hast du heute mit jemandem geteilt?"], ["a", "Was hast du heute vermisst?"], ["a", "Was hast du dir heute gewünscht?"], ["a", "Was hast du heute mit deiner Familie gemacht?"], ["a", "Was hast du heute mit deinen Freunden gemacht?"], ["s", "Was war heute in der Schule anders als sonst?"], ["a", "Was war die beste Idee, die du heute hattest?"], ["a", "Was hast du heute gebaut, gemalt oder gebastelt?"], ["a", "Was hast du heute draußen entdeckt?"], ["a", "Was hat heute gut geklappt?"], ["a", "Was ist heute schiefgegangen, und was lernst du daraus?"], ["a", "Was hast du heute über einen anderen Menschen erfahren?"], ["a", "Was hat dir heute jemand Nettes gesagt?"], ["a", "Was hast du heute jemandem Nettes gesagt?"], ["a", "Was hat heute gut gerochen oder gestunken? Beschreibe den Geruch."], ["a", "Was hast du heute gehört, das dich zum Lachen gebracht hat?"], ["w", "Was hast du dir für dieses Wochenende vorgenommen?"], ["a", "Was hast du heute ganz für dich allein gemacht?"], ["a", "Was hat dich heute müde gemacht?"], ["a", "Was hat dir heute Kraft und gute Laune gegeben?"], ["a", "Was hast du heute geübt, zum Beispiel Sport, ein Instrument oder Hausaufgaben?"], ["a", "Was würde dein Haustier oder dein Kuscheltier über deinen Tag erzählen?"], ["a", "Was hast du heute verloren oder gefunden?"], ["a", "Was war heute in einer Sendung, einem Spiel oder einem Buch spannend?"], ["a", "Was hast du heute über dich selbst herausgefunden?"], ["a", "Was möchtest du dir von heute unbedingt merken?"], ["a", "Was hat heute länger gedauert als gedacht?"], ["s", "Was hast du heute in den Hausaufgaben gemacht?"], ["s", "Was habt ihr heute im Sportunterricht gemacht?"], ["s", "Was war heute das Schönste in der Schule?"], ["w", "Was war heute das Schönste an deinem freien Tag?"], ["a", "Was hat dich heute zum Staunen gebracht?"], ["a", "Was hat dich heute neugierig gemacht?"], ["a", "Was hast du heute in der Natur beobachtet, zum Beispiel Tiere, Pflanzen oder Wolken?"], ["a", "Was hast du heute aufgeräumt oder sortiert?"], ["a", "Was hast du heute in einem Spiel oder im Internet erlebt?"], ["a", "Was hast du heute vergessen?"], ["a", "Was hast du heute selbst entschieden?"], ["a", "Wer hat dich heute zum Lachen gebracht?"], ["a", "Wer hat dir heute geholfen?"], ["a", "Wer war heute besonders nett zu dir?"], ["a", "Wer hat heute etwas Spannendes erzählt? Was war es?"], ["a", "Wer hat dich heute geärgert, und wie hast du reagiert?"], ["a", "Wer ist dir heute begegnet, den du lange nicht gesehen hast?"], ["s", "Wer hat heute neben dir gesessen?"], ["a", "Wer hat heute mit dir gespielt?"], ["a", "Wer hat dich heute angerufen, dir geschrieben oder dich besucht?"], ["a", "Wer hat heute etwas richtig gut gemacht? Erzähl davon."], ["a", "Wer würde sich freuen, wenn du ihm oder ihr heute etwas Liebes sagst?"], ["a", "Wer hat heute gekocht, und wie war das Essen?"], ["a", "Wer hat dich heute überrascht?"], ["a", "Wer war heute traurig, und hast du es bemerkt?"], ["a", "Wer hat heute mit dir gelernt oder Hausaufgaben gemacht?"], ["s", "Wer aus deiner Klasse hat heute etwas Lustiges gemacht?"], ["a", "Wer hat dir heute etwas beigebracht?"], ["a", "Mit wem hast du heute am meisten geredet?"], ["a", "Mit wem hast du heute gespielt, und was habt ihr gespielt?"], ["a", "Mit wem hast du heute gegessen?"], ["a", "Mit wem würdest du gern morgen etwas unternehmen?"], ["a", "Mit wem hast du dich heute gestritten oder wieder vertragen?"], ["a", "Mit wem hast du heute gelacht?"], ["a", "Mit wem warst du heute draußen?"], ["s", "Mit wem warst du heute in der Pause zusammen?"], ["a", "Mit wem hast du heute telefoniert oder geschrieben?"], ["a", "Wem hast du heute geholfen?"], ["a", "Wem möchtest du heute Danke sagen? Wofür?"], ["a", "Wem hast du heute etwas erzählt?"], ["a", "Wen hast du heute vermisst?"], ["a", "Wen möchtest du gern mal wieder treffen?"], ["a", "Wen hast du heute neu kennengelernt?"], ["a", "Wen hast du heute bewundert? Warum?"], ["a", "Wo warst du heute überall?"], ["a", "Wo hast du dich heute am wohlsten gefühlt?"], ["a", "Wo hast du heute gespielt?"], ["a", "Wo warst du heute draußen unterwegs?"], ["a", "Wo würdest du morgen am liebsten sein?"], ["a", "Wo hast du heute etwas Interessantes entdeckt?"], ["s", "Wo hast du heute deine Hausaufgaben gemacht?"], ["a", "Wo war es heute besonders laut oder besonders leise?"], ["a", "Wo hast du heute gegessen?"], ["w", "Wo wart ihr heute unterwegs?"], ["a", "Wohin würdest du gern einmal reisen? Warum?"], ["a", "Wohin bist du heute gegangen oder gefahren?"], ["s", "Wohin möchtest du am Wochenende gern?"], ["a", "Woher kam heute deine gute Laune?"], ["a", "Woher kam heute deine schlechte Laune, falls du welche hattest?"], ["a", "Wann warst du heute am glücklichsten?"], ["a", "Wann hast du dich heute gelangweilt?"], ["a", "Wann warst du heute aufgeregt?"], ["a", "Wann hast du heute gelacht?"], ["a", "Wann bist du heute aufgestanden, und wie war der Morgen?"], ["a", "Wann hast du dich heute richtig konzentriert?"], ["a", "Wann ist die Zeit heute besonders schnell vergangen?"], ["a", "Wann hast du heute etwas für jemand anderen getan?"], ["a", "Wann warst du heute müde?"], ["a", "Wann warst du heute ganz für dich allein?"], ["a", "Wann hast du heute Nein gesagt, und warum?"], ["a", "Warum war heute ein guter Tag, oder warum nicht?"], ["a", "Warum freust du dich auf morgen?"], ["a", "Warum magst du deinen besten Freund oder deine beste Freundin?"], ["s", "Warum war heute eine Schulstunde spannend oder langweilig?"], ["a", "Warum hast du heute etwas anders gemacht als sonst?"], ["a", "Warum bist du heute stolz auf dich?"], ["a", "Welches Gefühl hattest du heute am häufigsten?"], ["a", "Welche Farbe würdest du dem heutigen Tag geben? Warum?"], ["a", "Welches Geräusch hast du heute oft gehört?"], ["a", "Welche Musik hast du heute gehört?"], ["a", "Welches Spiel hast du heute gespielt? Erkläre die Regeln."], ["a", "Welche Frage hättest du heute gern jemandem gestellt?"], ["a", "Welche drei Dinge sind heute gut gelaufen?"], ["a", "Welcher Moment heute war wie aus einem Film?"], ["a", "Welches Tier passt zu deinem Tag heute? Warum?"], ["a", "Welche Aufgabe hast du heute gern gemacht?"], ["s", "Welches Fach war heute am besten?"], ["a", "Welches Wetter hättest du dir heute gewünscht?"], ["a", "Welches Buch, welchen Film oder welche Serie magst du gerade? Warum?"], ["a", "Welche Überraschung würdest du gern jemandem machen?"], ["a", "Welcher Mensch war heute wichtig für dich?"], ["a", "Welche Regel hat dich heute genervt, und warum gibt es sie wohl?"], ["a", "Welchen Sport hast du heute gemacht oder gesehen?"], ["a", "Welches Essen war heute das beste?"], ["a", "Wie viel Zeit hast du heute draußen verbracht?"], ["a", "Wie viel hast du heute gelacht: wenig, mittel oder ganz viel? Erzähl davon."], ["a", "Wie viele neue Dinge hast du heute erlebt?"], ["a", "Wofür bist du heute dankbar?"], ["a", "Worüber hast du dich heute gefreut?"], ["a", "Worüber hast du heute nachgedacht?"], ["a", "Worauf freust du dich in dieser Woche?"], ["a", "Worüber habt ihr heute beim Abendessen gesprochen?"], ["a", "Womit hast du heute am liebsten gespielt?"], ["a", "Wovor hattest du heute ein bisschen Angst, und wie bist du damit umgegangen?"], ["a", "Woran möchtest du dich in einem Jahr noch erinnern?"], ["a", "Wofür hat dich heute jemand gelobt?"], ["a", "Worüber hast du heute gestaunt?"], ["a", "Worüber hast du dich heute gewundert?"], ["a", "Wonach hast du heute gesucht?"], ["a", "Worüber hast du heute mit deinen Eltern gesprochen?"], ["a", "Wovon hast du letzte Nacht geträumt?"], ["a", "Was hättest du heute gemacht, wenn du unsichtbar gewesen wärst?"], ["s", "Was würdest du machen, wenn du morgen schulfrei hättest?"], ["a", "Was würdest du erfinden, um deinen Alltag leichter zu machen?"], ["a", "Was würdest du dir wünschen, wenn heute eine Fee vorbeigekommen wäre?"], ["a", "Was würdest du deinem jüngeren Ich von vor einem Jahr erzählen?"], ["a", "Wie stellst du dir dein Leben in 20 Jahren vor?"], ["w", "Was habt ihr heute als Familie unternommen?"], ["w", "Wie lange hast du heute ausgeschlafen, und wie hat sich das angefühlt?"], ["w", "Was war heute schöner als an einem Schultag?"], ["w", "Wohin seid ihr heute gefahren oder gegangen?"], ["w", "Was hast du an deinem freien Tag zum ersten Mal ausprobiert?"]];
  function isFreeDay(){ const d = new Date(); return d.getDay() === 0 || d.getDay() === 6 || pauseSet().has(todayKey()); }
  function nextIdea(){
    const p = P(), free = isFreeDay();
    const ok = DIARY_Q.map((q, i) => i).filter(i => DIARY_Q[i][0] === "a" || DIARY_Q[i][0] === (free ? "w" : "s"));
    let seen = new Set(p.seenQ || []);
    let pool = ok.filter(i => !seen.has(i));
    if(!pool.length){ p.seenQ = []; seen = new Set(); pool = ok; }      // all asked: start a new round
    const i = pool[Math.floor(Math.random() * pool.length)];
    (p.seenQ = p.seenQ || []).push(i); save();
    return DIARY_Q[i][1];
  }
  function showIdea(){
    const q = nextIdea(), box = $("#ideaPanel");
    const w = q.match(/^(Mit wem|Wie viele?|[A-ZÄÖÜ][a-zäöüß]+)/)[0];
    box.innerHTML = '<span class="ideaicon" aria-hidden="true">💡</span><p class="ideatext" title="Du musst die Frage nicht genau beantworten. Sie soll dir nur beim Anfangen helfen."><span class="wword">' + esc(w) + '</span>' + esc(q.slice(w.length)) + '</p>' +
      '<span class="ideabtns"><button type="button" class="iconbtn" id="ideaNext" title="Andere Frage" aria-label="Andere Frage">🔄</button>' + (canSpeak() ? '<button type="button" class="iconbtn" id="ideaRead" title="Vorlesen" aria-label="Vorlesen">🔊</button>' : '') + '<button type="button" class="iconbtn" id="ideaClose" title="Schließen" aria-label="Schließen">✕</button></span>';
    box.hidden = false;
    $("#ideaClose").onclick = () => { box.hidden = true; ta.focus(); };
    $("#ideaNext").onclick = showIdea;
    const r = $("#ideaRead"); if(r) r.onclick = () => speak(q);
  }

  // =====================================================================
  // 🎮 KLÖTZCHEN-REGEN (falling blocks), unlocked by the daily entry + extra tasks
  // =====================================================================
  function G(){ const g = state.game || (state.game = {}); if(g.date !== todayKey()){ g.date = todayKey(); g.used = 0; } g.best = g.best || 0; return g; }
  function gameAllowance(){
    const c = R().cfg, wrote = state.entries.some(e => e.date === todayKey());
    if(!wrote) return 0;
    return Math.min(c.gameMax, c.gameBase + todaysTasks() * c.gamePerTask) * 60;
  }
  const COLS = 10, ROWS = 20;
  const SHAPES = { I:[[0,1],[1,1],[2,1],[3,1]], O:[[1,0],[2,0],[1,1],[2,1]], T:[[1,0],[0,1],[1,1],[2,1]], S:[[1,0],[2,0],[0,1],[1,1]], Z:[[0,0],[1,0],[1,1],[2,1]], J:[[0,0],[0,1],[1,1],[2,1]], L:[[2,0],[0,1],[1,1],[2,1]] };
  const BLOCK_COLORS = { I:"#22b8cf", O:"#fcc419", T:"#9c36b5", S:"#40c057", Z:"#fa5252", J:"#4263eb", L:"#fd7e14" };
  let GM = null;
  function newBag(){ return Object.keys(SHAPES).sort(() => Math.random() - .5); }
  function spawn(){
    if(!GM.bag.length) GM.bag = newBag();
    const t = GM.next || GM.bag.pop(); if(!GM.bag.length) GM.bag = newBag(); GM.next = GM.bag.pop();
    GM.cur = { t, cells: SHAPES[t].map(c => c.slice()), x: 3, y: 0 };
    if(collide(GM.cur.cells, GM.cur.x, GM.cur.y)) gameOver();
  }
  function collide(cells, x, y){ return cells.some(([cx, cy]) => { const X = cx + x, Y = cy + y; return X < 0 || X >= COLS || Y >= ROWS || (Y >= 0 && GM.board[Y][X]); }); }
  function rotate(dir){
    if(GM.cur.t === "O") return;
    const size = GM.cur.t === "I" ? 4 : 3;
    const rot = GM.cur.cells.map(([x, y]) => dir > 0 ? [size - 1 - y, x] : [y, size - 1 - x]);
    for(const k of [0, -1, 1, -2, 2]) if(!collide(rot, GM.cur.x + k, GM.cur.y)){ GM.cur.cells = rot; GM.cur.x += k; return; }
  }
  function move(dx){ if(!collide(GM.cur.cells, GM.cur.x + dx, GM.cur.y)) GM.cur.x += dx; }
  function drop(){ if(!collide(GM.cur.cells, GM.cur.x, GM.cur.y + 1)){ GM.cur.y++; return true; } lock(); return false; }
  function hardDrop(){ let n = 0; while(!collide(GM.cur.cells, GM.cur.x, GM.cur.y + 1)){ GM.cur.y++; n++; } GM.score += n * 2; lock(); }
  function lock(){
    GM.cur.cells.forEach(([cx, cy]) => { const Y = cy + GM.cur.y; if(Y >= 0) GM.board[Y][cx + GM.cur.x] = GM.cur.t; });
    let lines = 0;
    for(let y = ROWS - 1; y >= 0; y--){ if(GM.board[y].every(Boolean)){ GM.board.splice(y, 1); GM.board.unshift(new Array(COLS).fill(null)); lines++; y++; } }
    if(lines){ GM.lines += lines; GM.score += [0, 100, 300, 500, 800][lines] * GM.level; GM.level = 1 + Math.floor(GM.lines / 10); }
    spawn();
  }
  function gameOver(){
    GM.over = true; const g = G();
    if(GM.score > g.best){ g.best = GM.score; GM.newBest = true; }
    save(); drawGame();
  }
  function drawGame(){
    const cv = $("#gameCanvas"); if(!cv || !GM) return;
    const ctx2 = cv.getContext("2d"), S = cv.width / COLS;
    ctx2.fillStyle = "#101522"; ctx2.fillRect(0, 0, cv.width, cv.height);
    ctx2.strokeStyle = "rgba(255,255,255,.05)";
    for(let x = 0; x <= COLS; x++){ ctx2.beginPath(); ctx2.moveTo(x * S, 0); ctx2.lineTo(x * S, cv.height); ctx2.stroke(); }
    for(let y = 0; y <= ROWS; y++){ ctx2.beginPath(); ctx2.moveTo(0, y * S); ctx2.lineTo(cv.width, y * S); ctx2.stroke(); }
    const cell = (x, y, col, ghost) => { if(y < 0) return; ctx2.fillStyle = ghost ? "rgba(255,255,255,.12)" : col; ctx2.fillRect(x * S + 1, y * S + 1, S - 2, S - 2); if(!ghost){ ctx2.fillStyle = "rgba(255,255,255,.25)"; ctx2.fillRect(x * S + 1, y * S + 1, S - 2, 4); } };
    GM.board.forEach((row, y) => row.forEach((t, x) => { if(t) cell(x, y, BLOCK_COLORS[t]); }));
    if(GM.cur && !GM.over){
      let gy = GM.cur.y; while(!collide(GM.cur.cells, GM.cur.x, gy + 1)) gy++;
      GM.cur.cells.forEach(([cx, cy]) => cell(cx + GM.cur.x, cy + gy, null, true));
      GM.cur.cells.forEach(([cx, cy]) => cell(cx + GM.cur.x, cy + GM.cur.y, BLOCK_COLORS[GM.cur.t]));
    }
    const nv = $("#gameNext"); if(nv && GM.next){ const c2 = nv.getContext("2d"), s2 = 22; c2.clearRect(0, 0, nv.width, nv.height); SHAPES[GM.next].forEach(([x, y]) => { c2.fillStyle = BLOCK_COLORS[GM.next]; c2.fillRect(10 + x * s2, 10 + y * s2, s2 - 2, s2 - 2); }); }
    const left = Math.max(0, gameAllowance() - G().used);
    $("#gScore").textContent = fmtC(GM.score); $("#gLines").textContent = GM.lines; $("#gLevel").textContent = GM.level; $("#gBest").textContent = fmtC(G().best);
    $("#gTime").textContent = Math.floor(left / 60) + ":" + pad2(left % 60);
    const msg = $("#gMsg");
    if(GM.over){ msg.hidden = false; msg.innerHTML = '<b>' + (GM.timeUp ? '⏰ Zeit für heute ist um!' : 'Spiel vorbei') + '</b><br>' + fmtC(GM.score) + ' Punkte' + (GM.newBest ? ' – neuer Rekord! 🏆' : '') + (left > 0 && !GM.timeUp ? '<br><button type="button" class="btn" id="gAgain">Nochmal</button>' : ''); const a = $("#gAgain"); if(a) a.onclick = startGame; }
    else if(GM.paused){ msg.hidden = false; msg.innerHTML = '<b>Pause</b><br>Weiter mit P oder dem Knopf.'; }
    else msg.hidden = true;
  }
  let lastT = 0, acc = 0, secAcc = 0, raf = 0;
  function loop(t){
    if(!GM || GM.over){ raf = 0; return; }
    const dt = Math.min(100, t - (lastT || t)); lastT = t;
    const active = !GM.paused && document.visibilityState === "visible" && !$("#gameView").hidden;
    if(active){
      acc += dt; secAcc += dt;
      const speed = Math.max(90, 800 - (GM.level - 1) * 70);
      while(acc >= speed){ acc -= speed; drop(); if(GM.over) break; }
      if(secAcc >= 1000){ secAcc -= 1000; const g = G(); g.used++; if(g.used % 10 === 0) save(); if(g.used >= gameAllowance()){ GM.timeUp = true; gameOver(); } }
    }
    drawGame();
    raf = requestAnimationFrame(loop);
  }
  function startGame(){
    if(gameAllowance() - G().used <= 0){ renderGame(); return; }
    GM = { board: Array.from({ length: ROWS }, () => new Array(COLS).fill(null)), bag: newBag(), next: null, score: 0, lines: 0, level: 1, over: false, paused: false };
    spawn(); lastT = 0; acc = 0; secAcc = 0;
    const sb = $("#gStart"); if(sb) sb.textContent = "Neu starten";
    if(!raf) raf = requestAnimationFrame(loop);
    $("#gameCanvas").focus();
  }
  function gameKey(e){
    if(!GM || GM.over || $("#gameView").hidden) return;
    const k = e.key;
    if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," ","x","X","z","Z","p","P"].includes(k)) e.preventDefault(); else return;
    if(k === "p" || k === "P"){ GM.paused = !GM.paused; drawGame(); return; }
    if(GM.paused) return;
    if(k === "ArrowLeft") move(-1); else if(k === "ArrowRight") move(1);
    else if(k === "ArrowDown"){ if(drop()) GM.score += 1; }
    else if(k === "ArrowUp" || k === "x" || k === "X") rotate(1); else if(k === "z" || k === "Z") rotate(-1);
    else if(k === " ") hardDrop();
    drawGame();
  }
  addEventListener("keydown", gameKey);
  // ---------- 🕹️ arcade: game hub + games in a frame (files in app/spiele) ----------
  const ARCADE = [
    { id:"bloecke", name:"Klötzchen-Regen", icon:"🧱", desc:"Reihen füllen und abräumen" },
    { id:"weltraum", name:"Weltraum-Angriff", icon:"👾", file:"weltraum-angriff.html", desc:"Wehr die Angreifer aus dem All ab" },
    { id:"biene", name:"Bienchen-Labyrinth", icon:"🐝", file:"bienchen.html", desc:"Blütenstaub sammeln, Spinnen ausweichen" },
    { id:"minen", name:"Minensucher", icon:"💣", file:"minensucher.html", desc:"Knobeln: Wo liegen die Minen?" },
    { id:"aster", name:"Asteroiden-Sturm", icon:"☄️", file:"asteroiden.html", desc:"Felsbrocken im All abschießen" },
    { id:"schlange", name:"Schlange", icon:"🐍", file:"schlange.html", desc:"Futter fressen und länger werden" }
  ];
  let arcadeView = "hub", arcadeTimer = null;
  const fmtLeft = s => Math.floor(s / 60) + ":" + pad2(s % 60);
  function renderHub(box, left){
    box.innerHTML = '<p class="note">⏱️ Heute noch <b>' + fmtLeft(left) + '</b> Minuten Spielzeit. Die Zeit läuft nur, solange ein Spiel offen ist.</p>' +
      '<div class="arcade">' + ARCADE.map(a => '<button type="button" class="arc" data-arc="' + a.id + '"><span class="arcicon">' + a.icon + '</span><b>' + esc(a.name) + '</b><span>' + esc(a.desc) + '</span></button>').join("") + '</div>' +
      '<p class="credit2">Weltraum-Angriff und Schlange stammen aus „Vintage Arcade“ von Gbolahan Aziz (MIT-Lizenz), übersetzt. Die anderen Spiele sind eigene Umsetzungen für das Tagebuch.</p>';
    box.querySelectorAll("[data-arc]").forEach(b => b.onclick = () => { arcadeView = b.dataset.arc; renderGame(); });
  }
  function renderPlayer(box, game, left){
    box.innerHTML = '<div class="playerbar"><button type="button" class="btn-ghost" id="arBack">← Alle Spiele</button><b>' + game.icon + ' ' + esc(game.name) + '</b><span class="gstat2">⏱️ <b id="arTime">' + fmtLeft(left) + '</b></span></div>' +
      '<iframe id="arFrame" class="arframe" src="app/spiele/' + game.file + '" title="' + esc(game.name) + '"></iframe>';
    const fr = $("#arFrame"); fr.onload = () => { try{ fr.focus(); fr.contentWindow.focus(); }catch(e){} };
    $("#arBack").onclick = () => { closeArcade(); renderGame(); };
    clearInterval(arcadeTimer);
    arcadeTimer = setInterval(() => {
      if($("#gameView").hidden || document.visibilityState !== "visible" || !$("#arFrame")) return;
      const g = G(); g.used++; if(g.used % 10 === 0) save();
      const l = Math.max(0, gameAllowance() - g.used); const el = $("#arTime"); if(el) el.textContent = fmtLeft(l);
      if(l <= 0){ closeArcade(); save(); $("#gameBox").innerHTML = ''; renderGame(); }
    }, 1000);
  }
  function closeArcade(){ clearInterval(arcadeTimer); arcadeTimer = null; const f = $("#arFrame"); if(f){ f.src = "about:blank"; f.remove(); } if(arcadeView !== "bloecke") arcadeView = "hub"; save(); }

  function renderGame(){
    const box = $("#gameBox"), allow = gameAllowance(), left = Math.max(0, allow - G().used), c = R().cfg;
    if(!allow || left <= 0){
      GM = null;
      box.innerHTML = '<div class="pcardx locked"><div class="bigok">🔒</div><h3>' + (!allow ? 'Das Spiel ist noch gesperrt' : 'Die Spielzeit für heute ist aufgebraucht') + '</h3>' +
        '<p>' + (!allow ? 'Schreib deinen Tagebucheintrag für heute, dann bekommst du ' + c.gameBase + ' Minuten Spielzeit.' : 'Morgen geht es weiter!') + '</p>' +
        '<p>Jede Zusatzaufgabe unter „🎯 Üben“ bringt +' + c.gamePerTask + ' Minuten (höchstens ' + c.gameMax + ' Minuten am Tag).</p>' +
        (G().best ? '<p class="note">Dein Rekord: ' + fmtC(G().best) + ' Punkte</p>' : '') + '</div>';
      closeArcade(); return;
    }
    if(arcadeView === "hub") return renderHub(box, left);
    const game = ARCADE.find(a => a.id === arcadeView);
    if(game && game.file) return renderPlayer(box, game, left);
    box.innerHTML = '<div class="playerbar"><button type="button" class="btn-ghost" id="arBackB">← Alle Spiele</button><b>🧱 Klötzchen-Regen</b></div><div class="gamewrap"><div class="gamecol"><canvas id="gameCanvas" width="300" height="600" tabindex="0" aria-label="Spielfeld"></canvas><div id="gMsg" class="gmsg" hidden></div></div>' +
      '<div class="gameside"><div class="gstat"><span>⏱️ Zeit übrig</span><b id="gTime"></b></div><div class="gstat"><span>Punkte</span><b id="gScore">0</b></div><div class="gstat"><span>Reihen</span><b id="gLines">0</b></div><div class="gstat"><span>Level</span><b id="gLevel">1</b></div><div class="gstat"><span>🏆 Rekord</span><b id="gBest">0</b></div>' +
      '<div class="gstat"><span>Nächstes</span><canvas id="gameNext" width="110" height="70"></canvas></div>' +
      '<div class="below"><button type="button" class="btn" id="gStart">' + (GM && !GM.over ? 'Neu starten' : '▶ Start') + '</button><button type="button" class="btn-ghost" id="gPause">⏸ Pause</button></div>' +
      '<p class="note">← → bewegen · ↑ drehen · ↓ schneller · Leertaste: ganz runter · P: Pause</p>' +
      '<div class="touchpad"><button type="button" data-k="ArrowLeft">◀</button><button type="button" data-k="ArrowUp">⟳</button><button type="button" data-k="ArrowRight">▶</button><button type="button" data-k="ArrowDown">▼</button><button type="button" data-k=" ">⤓</button></div></div></div>';
    $("#arBackB").onclick = () => { if(GM && !GM.over) GM.paused = true; arcadeView = "hub"; renderGame(); };
    $("#gStart").onclick = startGame;
    $("#gPause").onclick = () => { if(GM && !GM.over){ GM.paused = !GM.paused; drawGame(); } };
    box.querySelectorAll("[data-k]").forEach(b => b.onclick = () => gameKey({ key: b.dataset.k, preventDefault(){} }));
    if(GM && !GM.over) drawGame(); else { GM = null; const cv = $("#gameCanvas").getContext("2d"); cv.fillStyle = "#101522"; cv.fillRect(0, 0, 300, 600); $("#gTime").textContent = Math.floor(left / 60) + ":" + pad2(left % 60); $("#gBest").textContent = fmtC(G().best); }
  }
  // =====================================================================
  // 💾 BACKUP (encrypted with a password: AES-GCM, key from PBKDF2)
  // =====================================================================
  const b64e = buf => { let s = ""; const u = new Uint8Array(buf); for(let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const b64d = str => { const bin = atob(str); const u = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  async function keyFrom(pw, salt){
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name:"PBKDF2", salt, iterations:200000, hash:"SHA-256" }, base, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
  }
  async function allPics(){
    try{ const db = await idb.open();
      return await new Promise((res, rej) => { const st = db.transaction("pics").objectStore("pics"), out = {}; const rq = st.openCursor();
        rq.onsuccess = () => { const c = rq.result; if(c){ out[c.key] = c.value; c.continue(); } else res(out); }; rq.onerror = () => rej(rq.error); });
    }catch(e){ return {}; }
  }
  async function encryptedFile(pw){
    const payload = JSON.stringify({ app:"tagebuch", v:2, at:Date.now(), state: JSON.parse(localStorage.getItem(KEY) || "null"), pics: await allPics() });
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, await keyFrom(pw, salt), new TextEncoder().encode(payload));
    return JSON.stringify({ app:"tagebuch-sicherung", v:1, salt:b64e(salt), iv:b64e(iv), data:b64e(data) });
  }
  async function makeBackup(pw){
    const file = await encryptedFile(pw);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([file], { type:"application/json" }));
    a.download = "tagebuch-sicherung-" + todayKey() + ".json";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    state.parent.lastBackup = Date.now(); save();
  }
  async function restoreBackup(file, pw){
    const f = JSON.parse(await file.text());
    if(f.app !== "tagebuch-sicherung") throw new Error("Das ist keine Tagebuch-Sicherung.");
    let plain;
    try{ plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv:b64d(f.iv) }, await keyFrom(pw, b64d(f.salt)), b64d(f.data)); }
    catch(e){ throw new Error("Das Kennwort stimmt nicht."); }
    const p = JSON.parse(new TextDecoder().decode(plain));
    if(p.state) p.state.savedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(p.state));
    const db = await idb.open();
    await new Promise(res => { const tx = db.transaction("pics", "readwrite"), st = tx.objectStore("pics"); st.clear(); Object.entries(p.pics || {}).forEach(([k, v]) => st.put(v, k)); tx.oncomplete = res; tx.onerror = res; });
    return p;
  }
  function backupAge(){ const t = Math.max(state.parent.lastBackup || 0, (state.parent.storage && state.parent.storage.lastSave) || 0); return t ? Math.floor((Date.now() - t) / 86400000) : null; }
  // =====================================================================
  // 📁 TAGEBUCH-ORDNER: the app lives in a folder; data is stored next to it
  //    config/familie.json              family settings (parents, children list)
  //    kinder/<Name>/files/tagebuch.json        diary + run data of one child (encrypted)
  //    kinder/<Name>/files/bilder/<id>.bild     drawings (encrypted)
  //    kinder/<Name>/files/sicherungen/…        daily copies, last 14 days
  // =====================================================================
  const canFolder = () => typeof window.showDirectoryPicker === "function";
  const hdb = { open(){ return new Promise((res, rej) => { const r = indexedDB.open("tagebuch-ordner", 1); r.onupgradeneeded = () => r.result.createObjectStore("h"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async get(){ try{ const db = await this.open(); return await new Promise(res => { const q = db.transaction("h").objectStore("h").get("dir"); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }catch(e){ return null; } },
    async set(v){ try{ const db = await this.open(); return await new Promise(res => { const tx = db.transaction("h", "readwrite"); v ? tx.objectStore("h").put(v, "dir") : tx.objectStore("h").delete("dir"); tx.oncomplete = res; tx.onerror = res; }); }catch(e){ return null; } } };
  let dirHandle = null, dirOk = false, flushTimer = null, flushing2 = false, flushAgain = false;
  const written = {};                                   // last written JSON per child, to write only changes
  const STORE = () => state.parent.storage || (state.parent.storage = { mode: "folder" });   // folder is the default
  const folderReady = () => STORE().mode === "folder" && !!dirHandle && dirOk;
  // --- family key: makes the files unreadable in a text editor (not a protection against experts) ---
  let keyCache = null;
  async function famKey(){
    if(!family.key) family.key = b64e(crypto.getRandomValues(new Uint8Array(32)));
    if(!keyCache || keyCache.raw !== family.key) keyCache = { raw: family.key, k: await crypto.subtle.importKey("raw", b64d(family.key), "AES-GCM", false, ["encrypt","decrypt"]) };
    return keyCache.k;
  }
  async function enc(text){ const iv = crypto.getRandomValues(new Uint8Array(12)); const d = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, await famKey(), new TextEncoder().encode(text)); return JSON.stringify({ tagebuch: 1, iv: b64e(iv), data: b64e(d) }); }
  async function dec(text){ const f = JSON.parse(text); if(!f || !f.tagebuch) return text; return new TextDecoder().decode(await crypto.subtle.decrypt({ name:"AES-GCM", iv: b64d(f.iv) }, await famKey(), b64d(f.data))); }
  // --- file helpers ---
  async function dirAt(path, create){ let d = dirHandle; for(const p of path.split("/").filter(Boolean)) d = await d.getDirectoryHandle(p, { create: create !== false }); return d; }
  async function writeText(path, text){ const parts = path.split("/"), name = parts.pop(); const d = await dirAt(parts.join("/")); const fh = await d.getFileHandle(name, { create:true }); const w = await fh.createWritable(); await w.write(text); await w.close(); }
  async function readText(path){ try{ const parts = path.split("/"), name = parts.pop(); const d = await dirAt(parts.join("/"), false); return await (await (await d.getFileHandle(name)).getFile()).text(); }catch(e){ return null; } }
  function safeFolder(name){
    let base = (name || "kind").normalize("NFC").replace(/[\\/:*?"<>|.]+/g, "").replace(/\s+/g, " ").trim().slice(0, 40) || "kind";
    const used = new Set(family.children.map(id => family.data[id].folder).filter(Boolean));
    let f = base, i = 2; while(used.has(f)) f = base + " " + i++;
    return f;
  }
  const childDir = c => "kinder/" + c.folder + "/files/";
  function childJSON(c){ return JSON.stringify(c, function(k, v){ return k === "parent" && this !== family ? undefined : v; }); }
  // --- permission / connect ---
  async function folderPermission(ask){
    if(!dirHandle) return false;
    try{ let p = await dirHandle.queryPermission({ mode:"readwrite" }); if(p !== "granted" && ask) p = await dirHandle.requestPermission({ mode:"readwrite" }); dirOk = p === "granted"; }
    catch(e){ dirOk = false; }
    return dirOk;
  }
  async function connectFolder(){
    // newer data wins: folder config vs. this browser
    const cfgText = await readText("config/familie.json");
    const cfg = cfgText ? JSON.parse(cfgText) : null;
    const localHasData = family.children.length > 0;
    if(cfg && cfg.children && (!localHasData || (cfg.savedAt || 0) >= (family.savedAt || 0))){
      const fam = { v:2, parent: cfg.parent || {}, salt: cfg.salt || "", key: cfg.key, savedAt: cfg.savedAt, children: [], data: {}, active: cfg.active };
      const prevKey = family.key; family.key = cfg.key; keyCache = null;
      for(const c of cfg.children){
        const t = await readText("kinder/" + c.folder + "/files/tagebuch.json"); if(!t) continue;
        try{ const d = JSON.parse(await dec(t)); Object.assign(d, { id: c.id, name: c.name, folder: c.folder }); fam.children.push(c.id); fam.data[c.id] = d; written[c.id] = childJSON(d); }catch(e){}
      }
      if(cfg.children.length && !fam.children.length){ family.key = prevKey; keyCache = null; throw new Error("Die Tagebuch-Dateien konnten nicht gelesen werden."); }
      family = fam; family.parent = Object.assign({ pin:"", topic:"", notifyRead:false, lastReadPing:"", readMin:2, queue:[], grammar:true }, family.parent || {}); family.parent.queue = family.parent.queue || [];
      useChild(family.data[family.active] ? family.active : family.children[0]);
      try{ localStorage.setItem(KEY, childJSON(family)); }catch(e){}
    } else {
      if(!cfg && family.children.length){
        const names = family.children.map(id => family.data[id].name || "ohne Namen").join(", ");
        const n = family.children.reduce((s, id) => s + family.data[id].entries.length, 0);
        const pick = await choiceDialog({ title: "📔 Vorhandenes Tagebuch gefunden",
          html: '<p>In diesem Browser ist schon ein Tagebuch gespeichert: <b>' + esc(names) + '</b> mit ' + n + (n === 1 ? ' Eintrag' : ' Einträgen') + '.</p><p>Soll es in diesen Ordner übernommen werden?</p>',
          a: "In den Ordner übernehmen", b: "Leer neu beginnen …" });
        if(pick === "b"){
          const sure = await dangerDialog({ title: "Wirklich leer neu beginnen?", confirm: "Endgültig löschen", word: "LÖSCHEN",
            html: '<p>Dann wird das vorhandene Tagebuch in diesem Browser <b>unwiderruflich gelöscht</b>:</p><div class="dangerlist">' + esc(names) + ': ' + n + ' Einträge, Bilder, Coins, PINs und Einstellungen</div><p>Habt ihr keine Sicherung davon, ist es danach weg.</p>' });
          if(sure) await wipeBrowserData(true);
        }
      }
      await flushFolder(true);                          // empty folder or older: write what this browser has
    }
  }
  async function initFolder(){
    if(STORE().mode !== "folder" || !canFolder()){ renderGate(); return; }
    dirHandle = await hdb.get();
    if(dirHandle && await folderPermission(false)){ try{ await connectFolder(); }catch(e){} }
    renderGate(); afterDataChange();
  }
  function afterDataChange(){ renderHome(); if(state.id && family.data[state.id] && !$("#kidView").hidden) enterChild(state.id); }
  // --- start-page gate: choose / re-allow the folder ---
  function renderGate(){
    const g = $("#folderGate"), st = STORE();
    let html = "";
    if(st.mode === "folder" && canFolder()){
      if(!dirHandle) html = '<div class="gatebig">📁</div><h2>Willkommen!</h2><p>Wähle einmalig den Ordner <b>„Tagebuch“</b> aus, in dem die Datei „Tagebuch.html“ liegt. Dort werden alle Einträge gespeichert.</p><div class="below center"><button type="button" class="btn" id="gatePick">Tagebuch-Ordner wählen</button></div><p class="note">Ohne Ordner geht es auch: <button type="button" class="linkbtn" id="gateBrowser">nur im Browser speichern</button></p>';
      else if(!dirOk) html = '<div class="gatebig">📁</div><h2>Ordner „' + esc(dirHandle.name) + '“ freigeben</h2><p>Der Browser fragt nach einem Neustart nach der Erlaubnis. Wähle <b>„Bei jedem Besuch zulassen“</b>, dann kommt die Frage nicht wieder.</p><div class="below center"><button type="button" class="btn" id="gateAllow">Zugriff erlauben</button></div>';
    }
    g.innerHTML = html; g.hidden = !html;
    $("#homeTiles").hidden = !!html;
    document.querySelector(".home-q").hidden = !!html;
    if(html) $("#noKids").hidden = true; else renderHome();
    const on = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };
    on("gatePick", pickFolder);
    on("gateAllow", async () => { if(await folderPermission(true)){ try{ await connectFolder(); }catch(e){ alert(e.message); } renderGate(); afterDataChange(); } });
    on("gateBrowser", () => { if(!confirm("Nur im Browser speichern? Werden die Browserdaten gelöscht, ist dann alles weg. Ihr könnt das später im Elternbereich ändern.")) return; STORE().mode = "browser"; save(); renderGate(); });
  }
  async function pickFolder(){
    try{
      const h = await window.showDirectoryPicker({ id:"tagebuch", mode:"readwrite", startIn:"documents" });
      dirHandle = h; await hdb.set(h); await folderPermission(true);
      let hasApp = false; try{ await h.getFileHandle("Tagebuch.html"); hasApp = true; }catch(e){}
      if(!hasApp && !confirm("In diesem Ordner liegt keine „Tagebuch.html“. Trotzdem hier speichern?")){ dirHandle = null; await hdb.set(null); return; }
      STORE().mode = "folder"; await connectFolder(); save();
    }catch(e){ if(e && e.name !== "AbortError") alert("Der Ordner konnte nicht verwendet werden. " + (e.message || "")); }
    renderGate(); afterDataChange(); if(!$("#parentArea").hidden) renderStore();
  }
  // --- writing ---
  function scheduleAutoSave(ms){ if(!folderReady()) return; clearTimeout(flushTimer); flushTimer = setTimeout(() => flushFolder(), ms == null ? 1500 : ms); }
  async function flushFolder(force){
    if(!dirHandle || !dirOk) return;
    if(flushing2){ flushAgain = true; return; }
    flushing2 = true;
    try{
      if(!family.key) await famKey();
      for(const id of family.children){
        const c = family.data[id];
        if(!c.folder) c.folder = safeFolder(c.name);
        // drawings: every entry picture once as a file
        c.picFiles = force ? {} : (c.picFiles || {});   // a forced write (new folder) stores every picture again
        for(const e of c.entries) if(e.pic && e.id && !c.picFiles[e.id]){ const u = await idb.get(e.id); if(u){ await writeText(childDir(c) + "bilder/" + e.id + ".bild", await enc(u)); c.picFiles[e.id] = 1; } }
        const json = childJSON(c);
        if(!force && written[id] === json) continue;
        const data = await enc(json);
        await writeText(childDir(c) + "tagebuch.json", data);
        await writeText(childDir(c) + "sicherungen/tagebuch-" + todayKey() + ".json", data);
        const cut = addDays(todayKey(), -14);
        try{ const sd = await dirAt(childDir(c) + "sicherungen"); for await (const [name] of sd.entries()){ const m = /^tagebuch-(\d{4}-\d{2}-\d{2})\.json$/.exec(name); if(m && m[1] < cut) await sd.removeEntry(name).catch(() => {}); } }catch(e){}
        written[id] = json;
      }
      STORE().lastSave = Date.now(); STORE().lastError = "";
      const cfg = { app:"tagebuch", v:3, savedAt: family.savedAt || Date.now(), parent: family.parent, salt: family.salt, key: family.key, active: family.active,
        children: family.children.map(id => ({ id, name: family.data[id].name, folder: family.data[id].folder })) };
      await writeText("config/familie.json", JSON.stringify(cfg, null, 2));
      try{ localStorage.setItem(KEY, childJSON(family)); }catch(e){}
    }catch(e){
      STORE().lastError = e && e.name === "NotAllowedError" ? "Kein Zugriff auf den Ordner." : "Speichern im Ordner fehlgeschlagen.";
      if(e && e.name === "NotAllowedError"){ dirOk = false; renderGate(); }
    }
    flushing2 = false;
    if(flushAgain){ flushAgain = false; scheduleAutoSave(800); }
    if(!$("#parentArea").hidden) renderStore();
  }
  async function getPic(id){
    let u = await idb.get(id);
    if(!u && folderReady() && state.folder){ const t = await readText(childDir(state) + "bilder/" + id + ".bild"); if(t){ try{ u = await dec(t); idb.set(id, u); }catch(e){} } }
    return u;
  }
  // danger dialog: big red warning, "Abbrechen" is the default, the action needs a typed word
  function dangerDialog(o){
    return new Promise(res => {
      const d = $("#dangerDlg");
      d.innerHTML = '<div class="modalbox dangerbox" role="alertdialog" aria-modal="true"><h3>⚠️ ' + esc(o.title) + '</h3>' + o.html +
        (o.word ? '<p>Zur Sicherheit bitte <b>' + esc(o.word) + '</b> eintippen:</p><input type="text" id="dgWord" autocomplete="off" spellcheck="false">' : '') +
        '<div class="below" style="justify-content:flex-end;margin-top:1rem"><button type="button" class="btn" id="dgNo">Abbrechen</button><button type="button" class="btn danger" id="dgYes"' + (o.word ? ' disabled' : '') + '>' + esc(o.confirm) + '</button></div></div>';
      d.hidden = false;
      const done = v => { d.hidden = true; d.innerHTML = ""; res(v); };
      $("#dgNo").onclick = () => done(false); $("#dgNo").focus();
      d.onclick = e => { if(e.target === d) done(false); };
      d.onkeydown = e => { if(e.key === "Escape") done(false); };
      if(o.word){ const w = $("#dgWord"); w.oninput = () => { $("#dgYes").disabled = w.value.trim() !== o.word; }; }
      $("#dgYes").onclick = () => { if(!o.word || $("#dgWord").value.trim() === o.word) done(true); };
    });
  }
  function choiceDialog(o){   // two harmless choices; closing the dialog picks the safe default
    return new Promise(res => {
      const d = $("#dangerDlg");
      d.innerHTML = '<div class="modalbox choicebox" role="dialog" aria-modal="true"><h3>' + esc(o.title) + '</h3>' + o.html +
        '<div class="below"><button type="button" class="btn-ghost" id="chB">' + esc(o.b) + '</button><button type="button" class="btn" id="chA">' + esc(o.a) + '</button></div></div>';
      d.hidden = false;
      const done = v => { d.hidden = true; d.innerHTML = ""; res(v); };
      $("#chA").onclick = () => done("a"); $("#chB").onclick = () => done("b"); $("#chA").focus();
      d.onclick = e => { if(e.target === d) done("a"); };
      d.onkeydown = e => { if(e.key === "Escape") done("a"); };
    });
  }
  async function wipeBrowserData(keepFolder){
    // removes everything this browser keeps (diary cache, pictures, folder link); files in the folder stay untouched
    try{ localStorage.removeItem(KEY); }catch(e){}
    if(idb.db){ try{ idb.db.close(); }catch(e){} idb.db = null; }
    await new Promise(res => { try{ const r = indexedDB.deleteDatabase("tagebuch-bilder"); r.onsuccess = r.onerror = r.onblocked = res; }catch(e){ res(); } });
    idb.db = null;
    if(!keepFolder){ await hdb.set(null); dirHandle = null; dirOk = false; }
    const parent = { pin:"", topic:"", notifyRead:false, lastReadPing:"", readMin:2, queue:[], grammar:true, storage: { mode: "folder" } };
    family = { v:2, parent, salt:"", children:[], data:{}, active:null };
    useChild(null);
  }
  async function removeChildFolder(c){ if(!folderReady() || !c.folder) return; try{ const k = await dirAt("kinder"); await k.removeEntry(c.folder, { recursive:true }); }catch(e){} }
  function ago(ts){ const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? "gerade eben" : s < 3600 ? "vor " + Math.round(s / 60) + " Min." : s < 86400 ? "vor " + Math.round(s / 3600) + " Std." : "vor " + Math.round(s / 86400) + " Tagen"; }
  function renderStore(){
    const st = STORE(), card = $("#storeCard");
    let html, cls;
    if(st.mode === "browser"){
      cls = "warn"; html = '<div class="big">🌐 Nur im Browser</div><p class="note">Die Daten liegen nur im Speicher dieses Browsers. Werden die Browserdaten gelöscht, ist alles weg. Ladet dann bitte regelmäßig eine Sicherung herunter.</p>' + (canFolder() ? '<div class="below"><button type="button" class="btn" id="stToFolder">Im Tagebuch-Ordner speichern</button></div>' : '');
    } else if(!canFolder()){
      cls = "warn"; html = '<div class="big">📁 In diesem Browser nicht möglich</div><p class="note">Das Speichern im Tagebuch-Ordner geht nur in Chrome oder Edge am PC. Hier wird im Browser gespeichert. Ladet bitte regelmäßig eine Sicherung herunter.</p>';
    } else if(!dirHandle){
      cls = "warn"; html = '<div class="big">📁 Noch kein Tagebuch-Ordner gewählt</div><div class="below"><button type="button" class="btn" id="stPick">Tagebuch-Ordner wählen</button></div>';
    } else if(!dirOk){
      cls = "warn"; html = '<div class="big">📁 „' + esc(dirHandle.name) + '“: Zugriff pausiert</div><div class="below"><button type="button" class="btn" id="stReconnect">Zugriff erlauben</button></div>';
    } else {
      cls = "ok"; html = '<div class="big">📁 Tagebuch-Ordner „' + esc(dirHandle.name) + '“</div><p class="note">Alles wird automatisch dort gespeichert' + (st.lastSave ? ', zuletzt ' + ago(st.lastSave) : '') + '. Einstellungen liegen in <code>config</code>, die Tagebücher in <code>kinder/&lt;Name&gt;/files</code>, mit Tagesständen der letzten 14 Tage.' + (st.lastError ? ' <span class="alerttext">' + esc(st.lastError) + '</span>' : '') + '</p>' +
        '<div class="below"><button type="button" class="btn-ghost" id="stNow">Jetzt speichern</button><button type="button" class="btn-ghost" id="stPick">Anderen Ordner wählen</button><button type="button" class="btn-ghost" id="stToBrowser">Nur im Browser speichern</button></div>';
    }
    card.className = "storecard " + cls; card.innerHTML = html;
    const on = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };
    on("stToFolder", () => { st.mode = "folder"; save(); renderStore(); initFolder(); });
    on("stToBrowser", () => { if(!confirm("Wirklich nur im Browser speichern? Dann wird nicht mehr in den Tagebuch-Ordner geschrieben.")) return; st.mode = "browser"; save(); renderStore(); renderGate(); });
    on("stReconnect", async () => { if(await folderPermission(true)){ try{ await connectFolder(); }catch(e){} } renderStore(); renderGate(); });
    on("stNow", async () => { await flushFolder(true); renderStore(); });
    on("stPick", pickFolder);
  }
  function saveQuiet(){ try{ localStorage.setItem(KEY, childJSON(family)); }catch(e){} }

  function renderBackup(){
    const a = backupAge();
    $("#backupInfo").textContent = a === null ? "Es wurde noch keine Sicherung gemacht." : "Letzte Sicherung: " + (a === 0 ? "heute" : "vor " + a + (a === 1 ? " Tag" : " Tagen")) + ".";
    $("#backupInfo").classList.toggle("alerttext", a === null || a > 30);
  }
  $("#wipeAll").onclick = async () => {
    const names = family.children.map(id => family.data[id].name || "ohne Namen").join(", ") || "keine";
    const n = family.children.reduce((s, id) => s + family.data[id].entries.length, 0);
    const sure = await dangerDialog({ title: "Achtung: Alles wird gelöscht!", confirm: "Alles endgültig löschen", word: "LÖSCHEN",
      html: '<p>Damit löscht ihr <b>alles</b>, was dieser Browser vom Tagebuch gespeichert hat. Das lässt sich <b>nicht rückgängig machen</b>.</p>' +
        '<div class="dangerlist">Kinder: ' + esc(names) + '<br>' + n + ' Tagebucheinträge mit Bildern<br>Coins, Joker, Übungen, PINs und alle Einstellungen</div>' +
        '<p>Die Dateien im Tagebuch-Ordner bleiben erhalten. Ladet vorher am besten eine Sicherung herunter.</p>' });
    if(!sure) return;
    await wipeBrowserData(false);
    location.reload();
  };
  $("#bkDo").onclick = async () => {
    const p1 = $("#bkPw1").value, p2 = $("#bkPw2").value, m = $("#bkMsg");
    if(p1.length < 6){ m.textContent = "Bitte ein Kennwort mit mindestens 6 Zeichen."; return; }
    if(p1 !== p2){ m.textContent = "Die beiden Kennwörter sind nicht gleich."; return; }
    if(!(window.crypto && crypto.subtle)){ m.textContent = "Dieser Browser kann nicht verschlüsseln. Bitte Chrome, Edge oder Firefox verwenden."; return; }
    m.textContent = "Sicherung wird erstellt …";
    try{ await makeBackup(p1); m.textContent = "Fertig. Die Datei liegt in deinem Download-Ordner. Bewahrt sie an einem sicheren Ort auf und merkt euch das Kennwort."; $("#bkPw1").value = $("#bkPw2").value = ""; renderBackup(); renderOverviewCards(); }
    catch(e){ m.textContent = "Das hat nicht geklappt: " + e.message; }
  };
  $("#rsDo").onclick = async () => {
    const f = $("#rsFile").files[0], pw = $("#rsPw").value, m = $("#rsMsg");
    if(!f || !pw){ m.textContent = "Bitte Datei auswählen und Kennwort eingeben."; return; }
    if(!confirm("Achtung: Alles, was jetzt im Tagebuch steht, wird durch die Sicherung ersetzt. Fortfahren?")) return;
    m.textContent = "Wird wiederhergestellt …";
    try{ await restoreBackup(f, pw); m.textContent = "Wiederhergestellt. Das Tagebuch lädt neu …"; setTimeout(() => location.reload(), 900); }
    catch(e){ m.textContent = e.message || "Das hat nicht geklappt."; }
  };

  // =====================================================================
  // 🏖️ PAUSE DAYS (parents) + 🃏 JOKER (kid)
  // =====================================================================
  function pauseSet(){ return new Set(state.pauseDays || []); }
  function jokerSet(){ return new Set((state.jokers || []).map(j => j.date)); }
  function coveredDays(){ const s = new Set(state.entries.map(e => e.date)); pauseSet().forEach(d => s.add(d)); jokerSet().forEach(d => s.add(d)); return s; }
  // jokers: a monthly allowance that can be saved up (up to a cap) and spent on any day
  function jokerBank(){
    const b = state.jokerBank || (state.jokerBank = { bal: null, month: null });
    const c = R().cfg, m = todayKey().slice(0, 7), per = c.jokers ?? 1, max = c.jokerMax ?? 5;
    if(b.bal == null){ b.bal = Math.max(0, per - (state.jokers || []).filter(j => (j.used || j.date).slice(0, 7) === m).length); b.month = m; }
    if(b.month !== m){
      const [y1, m1] = b.month.split("-").map(Number), [y2, m2] = m.split("-").map(Number);
      const months = Math.max(0, (y2 - y1) * 12 + (m2 - m1));
      b.bal = Math.min(max, b.bal + months * per); b.month = m; save();
    }
    return b;
  }
  function jokersLeft(){ return jokerBank().bal; }
  function renderJoker(){
    const box = $("#jokerBox"); if(!box) return;
    const bank = jokerBank(), c = R().cfg, today = todayKey(), cov = coveredDays();
    const minDay = weekStartKey(today), maxDay = addDays(today, 60);
    const mine = (state.jokers || []).filter(j => j.date >= minDay).sort((a, b) => a.date.localeCompare(b.date));
    const fmtD = d => parseKey(d).toLocaleDateString("de-DE", { weekday:"short", day:"numeric", month:"numeric" });
    box.innerHTML = '<b>🃏 Joker</b><p class="jokercount">' + "🃏".repeat(Math.min(bank.bal, 10)) + ' <span>' + bank.bal + (bank.bal === 1 ? ' Joker' : ' Joker') + ' gespart</span></p>' +
      '<p class="note">Jeden Monat gibt es ' + (c.jokers ?? 1) + ' neuen. Du kannst bis zu ' + (c.jokerMax ?? 5) + ' sparen. Ein Joker zählt einen Tag als geschafft, du darfst ihn auch schon vorher für einen Tag einplanen.</p>' +
      (bank.bal ? '<div class="formrow"><label class="field">Tag<input type="date" id="jokerDay" min="' + minDay + '" max="' + maxDay + '"></label><button type="button" class="btn" id="jokerUse">Joker einsetzen</button></div><p class="status" id="jokerMsg" role="status"></p>' : '') +
      (mine.length ? '<ul class="orders">' + mine.map(j => '<li><span>🃏</span><b>' + fmtD(j.date) + '</b><span class="when">' + (j.date > today ? 'eingeplant' : 'eingesetzt') + '</span>' + (j.date > today ? '<button type="button" class="btn-ghost" data-unjoker="' + j.date + '">Zurücknehmen</button>' : '') + '</li>').join("") + '</ul>' : '');
    const use = $("#jokerUse");
    if(use) use.onclick = () => {
      const d = $("#jokerDay").value, msg = $("#jokerMsg");
      if(!d){ msg.textContent = "Bitte zuerst einen Tag auswählen."; return; }
      if(d < minDay){ msg.textContent = "Joker gehen nur für Tage ab dem Montag dieser Woche."; return; }
      if(d > maxDay){ msg.textContent = "So weit im Voraus geht es noch nicht."; return; }
      if(cov.has(d)){ msg.textContent = "Dieser Tag zählt schon als geschafft."; return; }
      if(!confirm("Joker für " + fmtD(d) + " einsetzen?")) return;
      bank.bal--; (state.jokers = state.jokers || []).push({ date: d, used: today }); save();
      notify("🃏 " + childName() + " hat einen Joker für " + fmtShort(d) + (d > today ? " eingeplant." : " eingesetzt."));
      renderShop(); renderJoker(); renderStreak();
    };
    box.querySelectorAll("[data-unjoker]").forEach(b => b.onclick = () => {
      const d = b.dataset.unjoker; if(d <= today) return;
      state.jokers = (state.jokers || []).filter(j => j.date !== d); bank.bal = bank.bal + 1; save();
      renderShop(); renderJoker(); renderStreak();
    });
  }
  function renderPauseParent(){
    const list = (state.pauseDays || []).slice().sort();
    // group consecutive days into ranges for display
    const ranges = []; list.forEach(d => { const r = ranges[ranges.length - 1]; if(r && addDays(r[1], 1) === d) r[1] = d; else ranges.push([d, d]); });
    $("#pauseList").innerHTML = ranges.length ? ranges.map(([a, b]) => '<li><b>' + fmtShort(a) + (a !== b ? ' – ' + fmtShort(b) : '') + '</b><span>' + (state.pauseNotes && state.pauseNotes[a] ? esc(state.pauseNotes[a]) : '') + '</span><button type="button" class="btn-ghost" data-unpause="' + a + '|' + b + '">Entfernen</button></li>').join("") : '<li class="empty">Keine Pausentage eingetragen.</li>';
    document.querySelectorAll("[data-unpause]").forEach(btn => btn.onclick = () => { const [a, b] = btn.dataset.unpause.split("|"); state.pauseDays = (state.pauseDays || []).filter(d => d < a || d > b); save(); renderPauseParent(); });
    $("#cfgJokers").value = R().cfg.jokers ?? 1; $("#cfgJokerMax").value = R().cfg.jokerMax ?? 5;
    const jb = jokerBank(), planned = (state.jokers || []).filter(j => j.date > todayKey()).length;
    $("#jokerInfo").textContent = childName() + " hat gerade " + jb.bal + " Joker gespart" + (planned ? " und " + planned + " eingeplant" : "") + ".";
  }
  $("#pauseAdd").onclick = () => {
    const a = $("#pauseFrom").value, b = $("#pauseTo").value || a, note = $("#pauseNote").value.trim();
    if(!a || b < a){ $("#pauseMsg").textContent = "Bitte gültige Daten wählen."; return; }
    const s = new Set(state.pauseDays || []); for(let d = a; d <= b; d = addDays(d, 1)) s.add(d);
    state.pauseDays = [...s]; state.pauseNotes = state.pauseNotes || {}; if(note) state.pauseNotes[a] = note;
    save(); $("#pauseMsg").textContent = "Eingetragen."; $("#pauseNote").value = ""; renderPauseParent();
  };
  $("#cfgJokers").onchange = () => { R().cfg.jokers = Math.max(0, Math.min(5, Math.floor(Number($("#cfgJokers").value) || 0))); save(); renderPauseParent(); };
  $("#cfgJokerMax").onchange = () => { R().cfg.jokerMax = Math.max(0, Math.min(20, Math.floor(Number($("#cfgJokerMax").value) || 0))); save(); renderPauseParent(); };
  $("#giftJoker").onclick = () => { const b = jokerBank(); b.bal++; save(); notify("🎁 " + childName() + " hat einen Joker geschenkt bekommen."); renderPauseParent(); };

  // =====================================================================
  // 📬 WEEKLY REPORT for parents (Sunday evening or later)
  // =====================================================================
  function weeklyReport(){
    const r = R(); r.reported = r.reported || {};
    const now = new Date(), today = todayKey();
    let ws = weekStartKey(today); const sunday = addDays(ws, 6);
    if(!(today === sunday && now.getHours() >= 18)) ws = addDays(ws, -7);         // otherwise report last week
    const end = addDays(ws, 6);
    if(r.reported[ws] || today < end || !state.parent.topic) return;
    const es = state.entries.filter(e => e.date >= ws && e.date <= end);
    if(!es.length && !(state.practice && state.practice.log.some(l => l.date >= ws && l.date <= end))){ r.reported[ws] = 1; save(); return; }
    const cov = coveredDays(); const days = weekDays(ws).filter(d => cov.has(d)).length;
    const words = es.reduce((s, e) => s + (e.words || 0), 0);
    const readMin = Object.entries(state.readLog).filter(([d]) => d >= ws && d <= end).reduce((s, [, v]) => s + (v.sec || 0), 0) / 60;
    const tasks = (state.practice ? state.practice.log : []).filter(l => l.date >= ws && l.date <= end && l.done).length;
    const cats = {}; es.forEach(e => Object.entries(e.errCats || {}).forEach(([k, n]) => { cats[k] = (cats[k] || 0) + n; }));
    const top = Object.entries(cats).filter(([k]) => TRICK[k]).sort((a, b) => b[1] - a[1])[0];
    const coins = r.ledger.filter(l => l.type === "credit" && l.note && l.note.includes(fmtShort(ws))).reduce((s, l) => s + l.amount, 0);
    notify("📬 Wochenbericht " + fmtShort(ws) + "–" + fmtShort(end) + ": " + days + "/7 Tage, " + es.length + " Einträge, " + words + " Wörter, " + Math.round(readMin) + " Min. gelesen, " + tasks + " Zusatzaufgaben." + (top ? " Häufigste Fehlerart: " + TRICK[top[0]][0] + "." : "") + (coins ? " " + fmtC(coins) + " Coins gutgeschrieben." : ""));
    r.reported[ws] = 1; save();
  }

  // =====================================================================
  // 🖨️ PRINT AS BOOK (kid account only)
  // =====================================================================
  async function printBook(){
    const ds = [...new Set(state.entries.map(e => e.date))].sort();
    let a = $("#fromDate").value || ds[0], b = $("#toDate").value || ds[ds.length - 1]; if(a > b){ const x = a; a = b; b = x; }
    const days = ds.filter(d => d >= a && d <= b); if(!days.length) return;
    const book = $("#printBook");
    book.innerHTML = '<section class="pcover"><h1>' + esc(genitive(childName())) + ' Tagebuch</h1><p>' + esc(fmtLong(days[0])) + '<br>bis<br>' + esc(fmtLong(days[days.length - 1])) + '</p></section>' +
      days.map(d => '<section class="pday"><h2>' + esc(fmtLong(d)) + '</h2>' + state.entries.filter(e => e.date === d).reverse().map(e => '<div class="ptext">' + entryHtml(e) + '</div>' + (e.pic && e.id ? '<img data-pic="' + esc(e.id) + '" alt="">' : '')).join("") + '</section>').join("");
    await Promise.all([...book.querySelectorAll("img[data-pic]")].map(async img => { const u = await getPic(img.dataset.pic); if(u){ img.src = u; await img.decode().catch(() => {}); } else img.remove(); }));
    document.body.classList.add("printing"); window.print();
    setTimeout(() => { document.body.classList.remove("printing"); book.innerHTML = ""; }, 500);
  }

  // =====================================================================
  // 🔊 READ ALOUD + Aa reading comfort (kid)
  // =====================================================================
  function applyPrefs(){
    const p = state.kidPrefs || {};
    document.documentElement.style.setProperty("--fs-scale", p.size === 2 ? "1.3" : p.size === 1 ? "1.15" : "1");
    document.documentElement.style.setProperty("--lh-scale", p.wide ? "1.25" : "1");
    document.documentElement.style.setProperty("--ls", p.wide ? ".03em" : "0");
  }
  function renderPrefs(){
    const p = state.kidPrefs || (state.kidPrefs = {}), box = $("#prefsPanel");
    box.innerHTML = '<div class="ideahead"><b>Aa Lesen & Schreiben</b><button type="button" class="btn-ghost" id="prefsClose">✕</button></div>' +
      '<p>Schriftgröße</p><div class="below">' + ["normal","groß","sehr groß"].map((l, i) => '<button type="button" class="tool' + ((p.size || 0) === i ? ' on' : '') + '" data-size="' + i + '">' + l + '</button>').join("") + '</div>' +
      '<label class="check"><input type="checkbox" id="prefWide" ' + (p.wide ? 'checked' : '') + '> Mehr Abstand zwischen Zeilen und Buchstaben</label>';
    box.hidden = false;
    box.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { p.size = Number(b.dataset.size); save(); applyPrefs(); renderPrefs(); });
    $("#prefWide").onchange = () => { p.wide = $("#prefWide").checked; save(); applyPrefs(); };
    $("#prefsClose").onclick = () => { box.hidden = true; };
  }
  let reading = false;
  async function readAloud(){
    if(reading){ speechSynthesis.cancel(); reading = false; $("#readAloud").textContent = "🔊 Vorlesen"; return; }
    const texts = [...document.querySelectorAll("#readPage .read-entry")].map(el => el.innerText.replace(/\s+/g, " "));
    if(!texts.length) return;
    reading = true; $("#readAloud").textContent = "⏹ Stopp";
    for(const t of texts){ if(!reading) break; for(const part of t.match(/[^.!?]+[.!?]*/g) || [t]){ if(!reading) break; await speak(part); } }
    reading = false; $("#readAloud").textContent = "🔊 Vorlesen";
  }

  // ---------- start ----------
  if(window.TBUpdater) window.TBUpdater.configure({
    getDirectory: () => dirHandle,
    beforeReload: async () => {
      save();
      if(!folderReady()) return;
      const deadline = Date.now() + 10000;
      while(flushing2 && Date.now() < deadline) await new Promise(res => setTimeout(res, 100));
      if(flushing2) throw new Error("Speichern läuft noch.");
      clearTimeout(flushTimer);
      await flushFolder();
      if(STORE().lastError) throw new Error(STORE().lastError);
    }
  });
  load();
  pickVoice();
  $("#dateLabel").textContent = fmtDate(todayKey());
  if(state.draft) ta.value = state.draft;
  QUESTIONS.forEach(([k]) => { if(state.draftQ[k]) qa[k].value = state.draftQ[k]; });
  renderStreak(); renderWords(); renderEntries(); renderNames(); updateCount(); renderPinBox(); flushQueue();
  family.children.forEach(id => withChild(id, () => { settleWeeks(); weeklyReport(); }));
  initFolder();
  if(state.id && family.data[state.id]) enterChild(state.id);
  renderCoinBadge(); renderHome(); applyPrefs();
  if(window.top !== window.self || (!/^file:/.test(location.protocol) && /claude|anthropic|usercontent/i.test(location.hostname))) $("#previewWarn").hidden = false;
  setTimeout(initSpell, 30);
  window.__rt = { tick: n => { for(let i=0;i<n;i++){ RT.lastAct = Date.now(); readTick(); } }, idle: n => { RT.lastAct = 0; for(let i=0;i<n;i++) readTick(); }, state: () => ({ sec: RT.sec, read: [...RT.read], visible: [...RT.visible], active: RT.active }) }; window.__coins = { coinsFor: v => coinsFor(v), settle: () => settleWeeks(), balance: () => balance(), R: () => R() }; window.__test = { check: t => check(t), ready: () => !!hun };
})();
