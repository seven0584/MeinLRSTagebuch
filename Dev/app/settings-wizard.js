(function () {
  "use strict";

  // Move existing controls rather than replacing them: app.js keeps its handlers,
  // status messages and the single source of truth for saved family settings.
  const steps = [
    { id: "storage", title: "Speicher & Sicherung", intro: "Prüft zuerst, wo eure Tagebücher gespeichert werden. Eine zusätzliche Sicherung könnt ihr hier herunterladen oder wiederherstellen." },
    { id: "children", title: "Kinderprofile", intro: "Legt für jedes Kind ein eigenes Tagebuch an. Das Kind für die nächsten Schritte wählt ihr oben bei „Kind“ aus." },
    { id: "goals", title: "Tagesauftrag", intro: "Wählt einen gut erreichbaren Umfang für das oben ausgewählte Kind. Ihr könnt klein anfangen und den Auftrag später anpassen." },
    { id: "tutor", title: "Prüfung & Lernhilfe", intro: "Die Rechtschreibprüfung ist bereits enthalten. Entscheidet hier über zusätzliche Online-Grammatikprüfung und KI-Hilfe. Richtet Ollama lokal oder OpenAI mit API-Schlüssel, Beispieltest und Freigaben ein." },
    { id: "security", title: "PINs", intro: "Hier könnt ihr die PIN des ausgewählten Kindes zurücksetzen oder die Eltern-PIN ändern. Die jeweilige Aktion führt euch durch die Eingabe." },
    { id: "maintenance", title: "Wartung", intro: "Diesen optionalen Schritt braucht ihr nur zum Aufräumen oder für einen bewussten Neubeginn. Erstellt vorher eine Sicherung." }
  ];
  let active = 0;
  let panels = [];
  let navButtons = [];
  let heading;
  let position;
  let back;
  let next;
  let settingsButton, subnav, settingsRoot;
  function setExpanded(expanded){
    subnav.hidden=!expanded;
    settingsButton.setAttribute("aria-expanded",String(expanded));
    settingsButton.dataset.tooltip=expanded?"Öffnet die Einstellungen oder klappt ihre Unterpunkte ein.":"Öffnet die Einstellungen und klappt ihre Unterpunkte aus.";
    settingsButton.title=settingsButton.dataset.tooltip;
  }
  function syncCurrent(){
    navButtons.forEach((button,i)=>{
      if(!settingsRoot.hidden && i===active)button.setAttribute("aria-current","step");
      else button.removeAttribute("aria-current");
    });
  }
  const shortIntro={storage:"Speicher prüfen und Sicherung erstellen.",children:"Für jedes Kind ein eigenes Tagebuch anlegen.",goals:"Einen gut erreichbaren Tagesauftrag wählen.",tutor:"Grammatikprüfung, lokale KI oder OpenAI einrichten.",security:"Kinder-PIN zurücksetzen oder Eltern-PIN ändern.",maintenance:"Browserdaten verwalten. Vor dem Löschen sichern."};

  function goTo(id, options = {}) {
    const index = steps.findIndex(step => step.id === id);
    if (index < 0 || !panels.length) return false;
    active = index;
    panels.forEach((panel, i) => { panel.hidden = i !== active; });
    syncCurrent();
    if(options.expand!==false)setExpanded(true);
    heading.textContent = steps[active].title;
    position.textContent = "Schritt " + (active + 1) + " von " + steps.length + (steps[active].id === "maintenance" ? " · optional" : "");
    back.disabled = active === 0;
    next.textContent = active === steps.length - 1 ? "Zur Übersicht" : "Weiter: " + steps[active + 1].title;
    if (options.focus !== false) heading.focus({ preventScroll: true });
    return true;
  }

  function sectionFor(text) {
    if (/Speicherort|Datensicherung/.test(text)) return "storage";
    if (/Neu anfangen/.test(text)) return "maintenance";
    if (/Kinder/.test(text)) return "children";
    if (/Tagesauftrag/.test(text)) return "goals";
    if (/Grammatikprüfung|Zusätzliche Lernhilfe/.test(text)) return "tutor";
    if (/PIN/.test(text)) return "security";
    return null;
  }

  function init() {
    const root = document.querySelector('.psec[data-sec="settings"]');
    settingsButton=document.querySelector('.pm[data-go="settings"]');
    if (!root || !settingsButton || root.dataset.wizardReady) return;
    settingsRoot=root;
    const originalNodes = Array.from(root.childNodes);
    const buckets = new Map(steps.map(step => [step.id, document.createDocumentFragment()]));
    let current = null;
    for (const node of originalNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "H3") current = sectionFor(node.textContent);
      if (current) buckets.get(current).append(node);
    }

    const wizard = document.createElement("div");
    wizard.className = "settings-wizard";
    const introduction = document.createElement("p");
    introduction.className = "note settings-wizard-intro";
    introduction.textContent = "Schrittweise einrichten. „Weiter“ speichert keine Änderungen.";
    introduction.dataset.helpText="Ihr könnt jeden Schritt direkt auswählen. Änderungen speichert ihr mit der jeweils beschrifteten Aktion; Schalter wirken direkt. „Weiter“ wechselt nur den Schritt.";
    introduction.dataset.helpTopic="general";
    wizard.append(introduction);

    const nav = document.createElement("div");
    nav.className = "settings-stepnav";
    nav.id="settings-subnav";
    nav.setAttribute("role","group");
    nav.setAttribute("aria-label", "Unterpunkte der Einstellungen");
    subnav=nav;
    settingsButton.setAttribute("aria-controls",nav.id);
    const arrow=document.createElement("span");arrow.className="settings-expand-icon";arrow.setAttribute("aria-hidden","true");arrow.textContent="▸";settingsButton.append(arrow);
    const openSettings=settingsButton.onclick;
    settingsButton.onclick=event=>{
      const expanded=root.hidden || subnav.hidden;
      openSettings?.call(settingsButton,event);
      setExpanded(expanded);
      syncCurrent();
    };
    const list = document.createElement("ol");
    navButtons = steps.map((step, i) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.settingsStep = step.id;
      button.setAttribute("aria-controls", "settings-step-" + step.id);
      const number = document.createElement("span");
      number.className = "settings-step-number";
      number.textContent = String(i + 1);
      number.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = step.title;
      button.append(number, label);
      button.addEventListener("click", event => {
        openSettings?.call(settingsButton,event);
        goTo(step.id);
      });
      item.append(button);
      list.append(item);
      return button;
    });
    nav.append(list);
    settingsButton.insertAdjacentElement("afterend",nav);
    setExpanded(false);
    let wasHidden=root.hidden;
    new MutationObserver(()=>{if(root.hidden===wasHidden)return;wasHidden=root.hidden;setExpanded(!root.hidden);syncCurrent();}).observe(root,{attributes:true,attributeFilter:["hidden"]});

    position = document.createElement("p");
    position.className = "settings-step-position";
    heading = document.createElement("h3");
    heading.className = "settings-step-title";
    heading.id = "settings-step-title";
    heading.tabIndex = -1;
    wizard.append(position, heading);
    panels = steps.map(step => {
      const panel = document.createElement("section");
      panel.id = "settings-step-" + step.id;
      panel.className = "settings-step-panel";
      panel.setAttribute("aria-label", step.title);
      const intro = document.createElement("p");
      intro.className = "note settings-step-intro";
      intro.textContent = shortIntro[step.id];
      intro.dataset.helpText=step.intro;
      intro.dataset.helpTopic=step.id==="security"?"security":step.id==="maintenance"?"storage":step.id;
      panel.append(intro, buckets.get(step.id));
      wizard.append(panel);
      return panel;
    });
    const footer = document.createElement("div");
    footer.className = "settings-wizard-actions";
    back = document.createElement("button");
    back.type = "button";
    back.className = "btn-ghost";
    back.textContent = "Zurück";
    back.addEventListener("click", () => { if (active > 0) goTo(steps[active - 1].id); });
    next = document.createElement("button");
    next.type = "button";
    next.className = "btn";
    next.addEventListener("click", () => {
      if (active < steps.length - 1) goTo(steps[active + 1].id);
      else document.querySelector('.pm[data-go="overview"]')?.click();
    });
    footer.append(back, next);
    wizard.append(footer);
    root.append(wizard);
    root.dataset.wizardReady = "true";
    goTo("storage", { focus: false,expand:false });
  }

  window.TB_SETTINGS_WIZARD = { goTo };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}());
