(function () {
  "use strict";
  let hooks = {}, busy = false, available = null;
  window.TBUpdater = { configure(options) { hooks = options; } };
  const box = document.createElement("section");
  box.className = "updatebox"; box.setAttribute("aria-label", "Programmupdates");
  const status = document.createElement("p"); status.setAttribute("role", "status");
  const check = button("Nach Updates suchen", checkNow);
  const install = button("Jetzt aktualisieren", installNow); install.hidden = true;
  const later = button("Später", () => { install.hidden = later.hidden = true; status.textContent = "Update verschoben. Du kannst später erneut danach suchen."; }); later.hidden = true;
  const reload = button("Neu laden", async () => {
    reload.disabled = true;
    try { if (hooks.beforeReload) await hooks.beforeReload(); location.reload(); }
    catch (_) { status.textContent = "Deine Daten konnten noch nicht gespeichert werden. Bitte erneut versuchen."; reload.disabled = false; }
  }); reload.hidden = true;
  box.append(status, check, install, later, reload);
  document.querySelector("#homeView").append(box);
  function button(text, fn) { const b = document.createElement("button"); b.type = "button"; b.className = "btn-ghost"; b.textContent = text; b.onclick = fn; return b; }
  function lock(value) { busy = value; check.disabled = install.disabled = later.disabled = value; }
  async function checkNow() {
    if (busy) return;
    lock(true); install.hidden = later.hidden = true;
    status.textContent = "Suche nach Updates …";
    try {
      available = await TBUpdateCore.latest();
      if (available.release > TB_VERSION.release) {
        status.textContent = "Version " + available.version + " ist verfügbar. Jetzt installieren? Deine Tagebucheinträge und Einstellungen bleiben erhalten.";
        install.hidden = later.hidden = false;
      } else status.textContent = "Version " + TB_VERSION.version + " ist aktuell.";
    } catch (_) {
      status.textContent = "Updates sind gerade nicht erreichbar. Du kannst dein Tagebuch weiter verwenden und später erneut prüfen.";
    } finally { lock(false); }
  }
  async function installNow() {
    if (busy || !available) return;
    if (typeof window.showDirectoryPicker !== "function") { status.textContent = "Zum Aktualisieren bitte Chrome oder Edge verwenden und den Programmordner freigeben."; return; }
    lock(true);
    try {
      // Request access directly from the click, before any network requests.
      const options = { id: "tagebuch-update", mode: "readwrite" };
      const known = hooks.getDirectory && hooks.getDirectory();
      if (known) options.startIn = known;
      const dir = await window.showDirectoryPicker(options);
      if (await dir.requestPermission({ mode: "readwrite" }) !== "granted") throw Error("Kein Schreibzugriff auf den Programmordner.");
      // A data folder may differ from the folder containing the app.
      const html = await dir.getFileHandle("Tagebuch.html").catch(() => null);
      if (!html) throw Error("Bitte den Programmordner mit Tagebuch.html auswählen.");
      status.textContent = "Das Update wird heruntergeladen, geprüft und installiert. Bitte diese Seite geöffnet lassen …";
      await TBUpdateCore.install(dir, available);
      status.textContent = "Version " + available.version + " ist installiert. Lade die Seite neu, um sie zu verwenden.";
      install.hidden = later.hidden = check.hidden = true; reload.hidden = false;
    } catch (e) {
      status.textContent = e.name === "AbortError" ? "Update abgebrochen. Du kannst später erneut aktualisieren." : "Das Update konnte nicht installiert werden. " + e.message;
    } finally { lock(false); }
  }
  checkNow();
})();
