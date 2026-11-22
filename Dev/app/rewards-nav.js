(function(){
  "use strict";
  const sections = [
    {id:"orders",label:"Einkäufe"}, {id:"coins",label:"Coins"},
    {id:"shop",label:"Shop"}, {id:"games",label:"Spielzeit"},
    {id:"pauses",label:"Pausen"}, {id:"jokers",label:"Joker"}
  ];
  let root, parentButton, subnav, openRewards;
  let active = "orders", panels = new Map(), buttons = [];
  function setExpanded(expanded){
    subnav.hidden = !expanded;
    parentButton.setAttribute("aria-expanded",String(expanded));
    parentButton.dataset.tooltip = expanded ? "Öffnet die Belohnungen oder klappt ihre Unterpunkte ein." : "Öffnet die Belohnungen und klappt ihre Unterpunkte aus.";
    parentButton.title = parentButton.dataset.tooltip;
  }
  function syncCurrent(){
    for(const button of buttons){
      if(!root.hidden && button.dataset.rewardsSection === active) button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    }
  }
  function goTo(id, options = {}){
    if(!panels.has(id)) return false;
    active = id;
    if(options.open !== false) openRewards?.call(parentButton);
    for(const [key,panel] of panels) panel.hidden = key !== active;
    if(options.expand !== false) setExpanded(true);
    syncCurrent();
    if(options.focus !== false){
      const title = panels.get(active).querySelector("h3");
      title?.focus({preventScroll:true});
    }
    return true;
  }
  function init(){
    root = document.querySelector('.psec[data-sec="rewards"]');
    parentButton = document.querySelector('.pm[data-go="rewards"]');
    if(!root || !parentButton || root.dataset.rewardsNavReady) return;
    const buckets = new Map(sections.map(section => [section.id,document.createDocumentFragment()]));
    let current = null;
    for(const node of Array.from(root.childNodes)){
      if(node.nodeType === Node.ELEMENT_NODE){
        if(node.tagName === "H3"){
          const text = node.textContent;
          if(/Offene Einkäufe/.test(text)) current = "orders";
          else if(/Shop einrichten/.test(text)) current = "shop";
          else if(/Spielzeit/.test(text)) current = "games";
          else if(/Pausentage/.test(text)){ current = "pauses"; node.textContent = "🏖️ Pausentage"; }
          else if(/Coin-Regeln/.test(text)) current = "coins";
        }
        if(node.id === "parentCoinInfo"){
          current = "coins";
          const title = document.createElement("h3"); title.textContent = "Kontostand und Buchungen";
          buckets.get(current).append(title);
        }
        if(node.querySelector("#cfgJokers")){
          current = "jokers";
          const title = document.createElement("h3"); title.textContent = "🎟️ Joker";
          const note = document.createElement("p"); note.className = "note";
          note.textContent = "Monatliche Joker kann das Kind sparen und im Shop für einen Tag seiner Wahl einsetzen.";
          note.dataset.helpTopic = "rewards";
          note.dataset.helpText = "Joker werden jeden Monat gutgeschrieben. Das Kind kann sie bis zur eingestellten Grenze sparen und selbst im Shop für einen Tag seiner Wahl einsetzen, auch im Voraus. Änderungen an Monatsmenge und Spargrenze werden direkt gespeichert. Ein zusätzlicher Geschenk-Joker wird direkt gutgeschrieben.";
          buckets.get(current).append(title,note);
        }
        if(current === "pauses" && node.matches("p.note")){
          node.textContent = "Pausentage zählen für die Wochenwertung und die Serie als geschafft.";
          node.dataset.helpTopic = "rewards";
          node.dataset.helpText = "Tragt einen Zeitraum und einen Grund ein, etwa Urlaub, Krankheit oder Klassenfahrt. Pausentage zählen für die Wochenwertung und die Serie als geschafft. Joker verwaltet ihr im eigenen Unterpunkt.";
        }
      }
      if(current) buckets.get(current).append(node);
    }
    for(const section of sections){
      const panel = document.createElement("section");
      panel.className = "rewards-panel"; panel.id = "rewards-panel-" + section.id;
      panel.setAttribute("aria-label",section.label);
      panel.append(buckets.get(section.id));
      panel.querySelector("h3")?.setAttribute("tabindex","-1");
      root.append(panel); panels.set(section.id,panel);
    }
    subnav = document.createElement("div");
    subnav.className = "settings-stepnav rewards-subnav"; subnav.id = "rewards-subnav";
    subnav.setAttribute("role","group"); subnav.setAttribute("aria-label","Unterpunkte der Belohnungen");
    parentButton.setAttribute("aria-controls",subnav.id);
    const arrow = document.createElement("span"); arrow.className = "settings-expand-icon";
    arrow.setAttribute("aria-hidden","true"); arrow.textContent = "▸"; parentButton.append(arrow);
    openRewards = parentButton.onclick;
    parentButton.onclick = event => {
      const expanded = root.hidden || subnav.hidden;
      openRewards?.call(parentButton,event);
      setExpanded(expanded); syncCurrent();
    };
    const list = document.createElement("ol");
    buttons = sections.map(section => {
      const item = document.createElement("li"), button = document.createElement("button");
      button.type = "button"; button.dataset.rewardsSection = section.id; button.textContent = section.label;
      button.setAttribute("aria-controls","rewards-panel-" + section.id);
      button.dataset.tooltip = "Öffnet „" + section.label + "“; speichert keine Änderungen.";
      button.title = button.dataset.tooltip;
      button.addEventListener("click",() => goTo(section.id));
      item.append(button); list.append(item); return button;
    });
    subnav.append(list); parentButton.insertAdjacentElement("afterend",subnav);
    setExpanded(false);
    let wasHidden = root.hidden;
    new MutationObserver(() => {
      if(root.hidden === wasHidden) return;
      wasHidden = root.hidden;
      setExpanded(!root.hidden); syncCurrent();
    }).observe(root,{attributes:true,attributeFilter:["hidden"]});
    root.dataset.rewardsNavReady = "true";
    goTo("orders",{focus:false,open:false,expand:false});
  }
  window.TB_REWARDS_NAV = {goTo};
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
}());
