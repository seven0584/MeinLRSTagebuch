(function () {
  "use strict";

  let nextId = 0;
  const overviewPeriods = new WeakMap();
  const periods = [
    ["day", "Heute"], ["week", "Letzte volle Woche"],
    ["month", "Letzter voller Monat"], ["all", "Durchschnitt · alle Tage"]
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function catalog() {
    const value = window.TB_MOOD?.catalog;
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === "string" && typeof item.label === "string") : [];
  }

  function normalize(ids) {
    const allowed = new Set(catalog().map(item => item.id));
    return [...new Set(Array.isArray(ids) ? ids : [])].filter(id => allowed.has(id)).slice(0, 3);
  }

  function createPicker({ container, onChange, selected = [] }) {
    if (!container) throw new TypeError("Ein Container für die Gefühlsauswahl fehlt.");
    const id = "mood-picker-" + (++nextId);
    let selection = normalize(selected);
    let disabled = false;
    let buttons = [];
    const root = element("section", "mood-picker");
    const heading = element("h3", "mood-heading", "Wie geht es dir heute?");
    heading.id = id + "-heading";
    const instruction = element("p", "note mood-instruction", "Wähle 1 bis 3 Gefühle aus. Diese Auswahl gehört zu deinem Eintrag. Auch mehrere unterschiedliche Gefühle passen zu einem Tag.");
    instruction.id = id + "-instruction";
    const privacy = element("p", "note mood-privacy", "Deine Auswahl und KI-Hinweise auf Gefühle im Freitext sehen deine Eltern. Dein Text wird ihnen nicht angezeigt.");
    const group = element("div", "mood-options");
    group.setAttribute("role", "group");
    group.setAttribute("aria-labelledby", heading.id);
    group.setAttribute("aria-describedby", instruction.id);
    const status = element("p", "mood-picker-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    root.append(heading, instruction, privacy, group, status);
    container.append(root);

    function update() {
      const full = selection.length === 3;
      for (const button of buttons) {
        const chosen = selection.includes(button.dataset.mood);
        button.setAttribute("aria-pressed", String(chosen));
        button.disabled = disabled || (full && !chosen);
      }
      status.textContent = !selection.length
        ? "Noch keine Auswahl. Wähle mindestens ein Gefühl aus."
        : selection.length === 3
          ? "3 Gefühle ausgewählt. Für ein anderes Gefühl wähle zuerst eines ab."
          : selection.length + (selection.length === 1 ? " Gefühl ausgewählt." : " Gefühle ausgewählt.") + " Du kannst bis zu 3 auswählen.";
    }

    function refresh() {
      selection = normalize(selection);
      group.replaceChildren();
      buttons = catalog().map(item => {
        const button = element("button", "mood-choice");
        button.type = "button";
        button.dataset.mood = item.id;
        const emoji = element("span", "mood-emoji", item.emoji || "");
        emoji.setAttribute("aria-hidden", "true");
        button.append(emoji, element("span", "mood-label", item.label));
        button.addEventListener("click", () => {
          if (disabled) return;
          if (selection.includes(item.id)) selection = selection.filter(value => value !== item.id);
          else if (selection.length < 3) selection.push(item.id);
          update();
          if (typeof onChange === "function") onChange([...selection]);
        });
        group.append(button);
        return button;
      });
      update();
    }

    refresh();
    return {
      get: () => [...selection],
      set(ids, { notify = false } = {}) {
        selection = normalize(ids);
        update();
        if (notify && typeof onChange === "function") onChange([...selection]);
      },
      refresh,
      setDisabled(value) { disabled = !!value; update(); },
      destroy() { root.remove(); }
    };
  }

  function countFor(counts, id) {
    if (Array.isArray(counts)) {
      const item = counts.find(value => value.id === id);
      return Number(item?.count ?? item?.days) || 0;
    }
    if (counts instanceof Map) return Number(counts.get(id)) || 0;
    return Number(counts?.[id]) || 0;
  }

  function dayCount(value) {
    const count = Math.max(0, Number(value) || 0);
    return count + (count === 1 ? " Tag" : " Tagen");
  }

  function displayDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join(".") : "";
  }

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  }

  function weekStart(value) {
    const date = validDate(value);
    if (!date) return null;
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return date.toISOString().slice(0, 10);
  }

  function weekLabel(monday) {
    const thursday = validDate(monday);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const year = thursday.getUTCFullYear();
    const first = new Date(Date.UTC(year, 0, 1));
    const number = Math.ceil((((thursday - first) / 86400000) + 1) / 7);
    return "KW " + number + " · " + year;
  }

  function renderCalendar(entries, today, aggregate) {
    const details = element("details", "mood-calendar");
    details.open = true;
    details.append(element("summary", "", "Gefühlskalender nach Kalenderwochen"));
    details.append(element("p", "note", "Tageswerte für die aktuelle und bis zu sieben frühere Kalenderwochen mit Einträgen. Auch in einer laufenden Woche seht ihr einzelne Tage. Es werden keine Tagebuchtexte angezeigt."));
    const currentWeek = weekStart(today);
    if (!currentWeek) return details;
    const safeEntries = (Array.isArray(entries) ? entries : []).filter(entry => validDate(entry?.date) && entry.date <= today);
    const weeks = [...new Set([currentWeek, ...safeEntries.map(entry => weekStart(entry.date))])].sort().reverse().slice(0, 8);
    const scroller = element("div", "mood-calendar-scroll");
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-label", "Gefühlskalender, horizontal scrollbar");
    const table = element("table", "mood-calendar-table");
    const caption = element("caption", "", "Gefühle pro Tag · Kind und KI getrennt");
    table.append(caption);
    const head = element("thead");
    const header = element("tr");
    for (const label of ["Kalenderwoche", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]) {
      const cell = element("th", "", label);
      cell.scope = "col";
      header.append(cell);
    }
    head.append(header);
    const body = element("tbody");
    for (const monday of weeks) {
      const row = element("tr");
      const week = element("th", "", weekLabel(monday));
      week.scope = "row";
      row.append(week);
      for (let offset = 0; offset < 7; offset++) {
        const date = validDate(monday);
        date.setUTCDate(date.getUTCDate() + offset);
        const key = date.toISOString().slice(0, 10);
        const cell = element("td", "mood-calendar-day");
        cell.dataset.moodDate = key;
        const label = element("time", "mood-calendar-date", displayDate(key).slice(0, 5));
        label.dateTime = key;
        if (key === today) {
          cell.classList.add("mood-calendar-today");
          label.setAttribute("aria-current", "date");
          label.append(" · heute");
        }
        cell.append(label);
        if (key > today) {
          cell.classList.add("mood-calendar-future");
          cell.append(element("span", "mood-calendar-empty", "zukünftig"));
        } else {
          const data = aggregate(safeEntries, { period: "day", today: key });
          for (const [kind, name] of [["self", "Kind"], ["ai", "KI"]]) {
            const source = data[kind] || {};
            const moods = catalog().filter(item => countFor(source.counts, item.id) > 0);
            const line = element("div", "mood-calendar-source");
            line.append(element("span", "mood-calendar-source-label", name));
            const value = element("span", "mood-calendar-value");
            if (moods.length) {
              value.textContent = moods.slice(0, 3).map(item => item.emoji).join(" ") + (moods.length > 3 ? " +" + (moods.length - 3) : "");
              value.setAttribute("aria-label", moods.map(item => item.label).join(", "));
              value.title = moods.map(item => item.label).join(", ");
            } else {
              value.classList.add("mood-calendar-empty");
              value.textContent = kind === "ai" && source.pendingDays ? "noch offen"
                : kind === "ai" && source.errorDays ? "nicht verfügbar"
                  : kind === "ai" && (source.unclearDays || source.days) ? "unklar"
                    : "– keine Angabe";
            }
            line.append(value);
            cell.append(line);
            if (kind === "ai" && moods.length && source.unclearDays) cell.append(element("span", "mood-calendar-empty", "KI unsicher"));
          }
        }
        row.append(cell);
      }
      body.append(row);
    }
    table.append(head, body);
    scroller.append(table);
    details.append(scroller);
    return details;
  }

  function renderOverview({ container, entries = [], today }) {
    if (!container) throw new TypeError("Ein Container für die Gefühlsübersicht fehlt.");
    const aggregate = window.TB_MOOD?.aggregate;
    if (typeof aggregate !== "function") return;
    const results = Object.fromEntries(periods.map(([period]) => [period, aggregate(entries, { period, today })]));
    let selectedPeriod = overviewPeriods.get(container) || "day";
    if ((selectedPeriod === "week" || selectedPeriod === "month") && results[selectedPeriod].available === false) selectedPeriod = "day";
    overviewPeriods.set(container, selectedPeriod);
    const data = results[selectedPeriod];
    const total = Math.max(0, Number(data.totalDaysWithEntries) || 0);
    const root = element("section", "mood-overview");
    const header = element("div", "mood-overview-head");
    const heading = element("h3", "mood-heading", "Gefühle im Überblick");
    const periodLabel = element("label", "field mood-period", "Zeitraum");
    const select = element("select");
    select.setAttribute("aria-label", "Zeitraum für Gefühle im Überblick");
    for (const [value, label] of periods) {
      const option = element("option", "", label);
      option.value = value;
      if ((value === "week" || value === "month") && results[value].available === false) {
        option.disabled = true;
        option.textContent += " · noch nicht verfügbar";
      }
      select.append(option);
    }
    select.value = selectedPeriod;
    select.addEventListener("change", () => {
      overviewPeriods.set(container, select.value);
      renderOverview({ container, entries, today });
      container.querySelector(".mood-period select")?.focus({ preventScroll: true });
    });
    periodLabel.append(select);
    header.append(heading, periodLabel);
    root.append(header);
    const waiting = periods.filter(([value]) => (value === "week" || value === "month") && results[value].available === false).map(([value]) => {
      const label = value === "week" ? "Wochenübersicht" : "Monatsübersicht";
      const date = displayDate(results[value].availableFrom);
      return date ? label + " ab " + date + "." : label + " nach dem ersten vollständig erfassten Kalenderzeitraum.";
    });
    if (waiting.length) root.append(element("p", "note mood-availability", waiting.join(" ") + " Einzelne Tage und der Durchschnitt sind schon jetzt verfügbar."));
    const range = data.range || {};
    if ((selectedPeriod === "week" || selectedPeriod === "month") && range.start && range.end) {
      root.append(element("p", "note mood-range", "Abgeschlossener Zeitraum: " + displayDate(range.start) + " bis " + displayDate(range.end) + "."));
    }
    root.append(element("p", "note mood-total", total
      ? "Im Zeitraum gibt es Einträge an " + dayCount(total) + ". Mehrere Einträge am selben Tag zählen als ein Tag."
      : "In diesem Zeitraum gibt es noch keine Einträge."));
    // A disabled or stale period must never reveal partial-week/month counts.
    if (data.available === false && (selectedPeriod === "week" || selectedPeriod === "month")) {
      container.replaceChildren(root);
      return;
    }

    const sources = element("div", "mood-sources");
    function sourceBox(kind, title) {
      const source = data[kind] || {};
      const box = element("section", "mood-source mood-source-" + kind);
      box.append(element("h4", "", title));
      const days = Math.max(0, Number(source.days) || 0);
      box.append(element("p", "note", kind === "self"
        ? days ? "Auswahl an " + days + " von " + total + (total === 1 ? " Tag mit Eintrag." : " Tagen mit Einträgen.") : "Keine Angaben des Kindes in diesem Zeitraum."
        : days ? "KI-Auswertung an " + days + " von " + total + (total === 1 ? " Tag mit Eintrag." : " Tagen mit Einträgen.") : "Keine KI-Auswertung in diesem Zeitraum."));
      const rows = days ? catalog().filter(item => countFor(source.counts, item.id) > 0) : [];
      if (rows.length) {
        const list = element("ul", "mood-counts");
        for (const item of rows) {
          const row = element("li");
          const emoji = element("span", "mood-count-emoji", item.emoji || "");
          emoji.setAttribute("aria-hidden", "true");
          const count = countFor(source.counts, item.id);
          const percentage = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(count / days * 100);
          row.append(emoji, element("span", "", item.label), element("span", "mood-count-value", percentage + "% (" + count + " von " + days + (days === 1 ? " Tag)" : " Tagen)")));
          list.append(row);
        }
        box.append(list);
      } else if (days) {
        box.append(element("p", "note", kind === "ai" ? "Keine eindeutigen Gefühle erkannt." : "Keine auswertbare Gefühlsauswahl vorhanden."));
      }
      if (kind === "ai") {
        const statuses = [];
        if (source.unclearDays) statuses.push("Keine eindeutigen Hinweise an " + dayCount(source.unclearDays) + ".");
        if (source.pendingDays) statuses.push("Auswertung noch offen an " + dayCount(source.pendingDays) + ".");
        if (source.errorDays) statuses.push("Auswertung nicht verfügbar an " + dayCount(source.errorDays) + ".");
        if (statuses.length) box.append(element("p", "note mood-ai-status", statuses.join(" ")));
      }
      return box;
    }
    sources.append(sourceBox("self", "Vom Kind ausgewählt"), sourceBox("ai", "KI-Hinweise aus dem Freitext"));
    root.append(sources, element("p", "note mood-overview-note", "Die Prozentwerte zeigen, an wie vielen Tagen das jeweilige Gefühl vorkam – je Quelle nur unter den Tagen mit einer Auswahl oder abgeschlossenen KI-Auswertung. Mehrfachwahl ist möglich; die Summe kann über 100% liegen. Fehlende Angaben werden nicht als neutral bewertet. KI-Hinweise können unsicher oder falsch sein und sind keine Diagnose. Die Übersicht zeigt keine Tagebuchtexte."), renderCalendar(entries, today, aggregate));
    container.replaceChildren(root);
  }

  function renderSummary({container,entries=[],today,onOpen}) {
    if(!container)throw new TypeError("Ein Container für die Gefühlszusammenfassung fehlt.");
    const root=element("section","mood-summary"),header=element("div","mood-overview-head");
    header.append(element("h3","mood-heading","Gefühle kurz zusammengefasst"));
    const open=element("button","btn-ghost","Zur Gefühlsübersicht");open.type="button";open.addEventListener("click",()=>onOpen?.());header.append(open);root.append(header);
    const columns=element("div","mood-summary-periods");
    for(const [period,title] of [["day","Heute"],["all","Gesamtdurchschnitt"]]){
      const data=window.TB_MOOD.aggregate(entries,{period,today}),panel=element("section","mood-summary-period");panel.dataset.period=period;
      panel.append(element("h4","",title));
      for(const [kind,label] of [["self","Vom Kind"],["ai","KI-Hinweise"]]){
        const source=data[kind],row=element("div","mood-summary-source");row.dataset.source=kind;
        row.append(element("span","mood-summary-label",label));
        const values=catalog().filter(item=>countFor(source.counts,item.id)>0).sort((a,b)=>countFor(source.counts,b.id)-countFor(source.counts,a.id));
        if(values.length){
          const chips=element("div","mood-summary-chips");
          for(const item of values.slice(0,3)){
            const percent=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1}).format(countFor(source.counts,item.id)/source.days*100);
            const chip=element("span","mood-summary-chip",item.emoji+" "+item.label+(period==="all"?" · "+percent+" %":""));
            chip.title=countFor(source.counts,item.id)+" von "+source.days+" erfassten Tagen";chips.append(chip);
          }
          if(values.length>3)chips.append(element("span","mood-summary-more","+"+(values.length-3)+" weitere"));
          row.append(chips);
        }else row.append(element("span","note",kind==="self"?"Keine Auswahl":source.pendingDays?"Auswertung noch offen":source.errorDays?"Auswertung nicht verfügbar":source.days?"Keine eindeutigen Hinweise":"Keine KI-Hinweise"));
        if(kind==="ai" && source.unclearDays && values.length)row.append(element("span","note","KI unsicher"));
        panel.append(row);
      }
      if(period==="all")panel.append(element("p","note","Häufigste Gefühle je Quelle; Anteile der jeweils erfassten Tage."));
      columns.append(panel);
    }
    root.append(columns);container.replaceChildren(root);
  }
  window.TB_MOOD_UI = { createPicker, renderOverview, renderSummary };
}());
