(function () {
  "use strict";
  const KEY = "tagebuch-news-read-v1";
  const entries = window.TB_CHANGELOG || [];
  const bell = document.getElementById("newsBell");
  const badge = document.getElementById("newsBadge");
  const dialog = document.getElementById("newsDialog");
  const content = document.getElementById("newsEntries");
  let seen = new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(stored)) seen = new Set(stored.filter(id => typeof id === "string"));
  } catch (_) { /* The history remains usable without browser storage. */ }
  function refresh() {
    const unread = entries.filter(entry => !seen.has(entry.id)).length;
    badge.textContent = String(unread); badge.hidden = unread === 0;
    bell.setAttribute("aria-label", unread ? "Änderungsübersicht öffnen: " + unread + " neue " + (unread === 1 ? "Änderung" : "Änderungen") : "Änderungsübersicht öffnen");
    bell.title = unread ? unread + " neue Änderungen" : "Änderungsübersicht";
  }
  // Render text with DOM APIs, never as HTML from the changelog.
  function plain(text) { return text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1"); }
  function render() {
    content.replaceChildren();
    for (const entry of entries) {
      const section = document.createElement("section"); section.className = "newsentry";
      const title = document.createElement("h3"); title.textContent = entry.title;
      if (!seen.has(entry.id)) { const mark = document.createElement("span"); mark.className = "newsnew"; mark.textContent = "Neu"; title.append(mark); }
      section.append(title);
      let list = null;
      for (const line of entry.lines) {
        if (!line.trim()) { list = null; continue; }
        if (line.startsWith("- ")) {
          if (!list) { list = document.createElement("ul"); section.append(list); }
          const item = document.createElement("li"); item.textContent = plain(line.slice(2)); list.append(item);
        } else {
          list = null;
          const heading = line.startsWith("### ");
          const element = document.createElement(heading ? "h4" : "p"); element.textContent = plain(heading ? line.slice(4) : line); section.append(element);
        }
      }
      content.append(section);
    }
  }
  bell.onclick = () => {
    render(); dialog.showModal();
    entries.forEach(entry => seen.add(entry.id));
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(seen))); } catch (_) {}
    refresh();
  };
  document.getElementById("newsClose").onclick = () => dialog.close();
  dialog.addEventListener("click", event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener("close", () => bell.focus());
  window.addEventListener("storage", event => {
    if (event.key !== KEY && event.key !== null) return;
    try { const stored = JSON.parse(localStorage.getItem(KEY) || "[]"); seen = new Set(Array.isArray(stored) ? stored.filter(id => typeof id === "string") : []); } catch (_) { seen = new Set(); }
    refresh();
  });
  refresh();
})();
