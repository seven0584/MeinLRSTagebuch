(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TBUpdateCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BASE = "https://raw.githubusercontent.com/seven0584/MeinLRSTagebuch/main/";
  const BACKUP = ".tagebuch-update-backup";
  const allowed = path => path === "Tagebuch.html" || /^app\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:js|css|html|txt)$/.test(path);
  function validate(manifest) {
    if (!manifest || manifest.schema !== 1 || !Number.isSafeInteger(manifest.release) || manifest.release < 1 ||
        typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
        !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 64) throw Error("Ungültige Update-Informationen.");
    const seen = new Set(); let total = 0;
    for (const f of manifest.files) {
      if (!f || typeof f.path !== "string" || !allowed(f.path) || seen.has(f.path) ||
          !/^[a-f0-9]{64}$/.test(f.sha256) || !Number.isSafeInteger(f.size) || f.size < 1 || f.size > 8 * 1024 * 1024) throw Error("Ungültige Programmdatei im Update.");
      seen.add(f.path); total += f.size;
    }
    if (total > 32 * 1024 * 1024 || ["Tagebuch.html", "app/app.js", "app/version.js", "app/update-core.js", "app/updater.js"].some(p => !seen.has(p))) throw Error("Unvollständiges Update.");
    return manifest;
  }
  async function request(path, limit, fetcher = fetch) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetcher(BASE + path, { cache: "no-store", credentials: "omit", signal: ctl.signal });
      if (!r.ok) throw Error("GitHub ist nicht erreichbar (HTTP " + r.status + ").");
      // Bound the actual response, even if Content-Length is missing or misleading.
      const reader = r.body.getReader(); const chunks = []; let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          size += value.length; if (size > limit) throw Error("Die Update-Datei ist zu groß."); chunks.push(value);
        }
      } catch (e) { await reader.cancel().catch(() => {}); throw e; }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
      return bytes;
    } finally { clearTimeout(timer); }
  }
  async function latest(fetcher) {
    return validate(JSON.parse(new TextDecoder().decode(await request("updates.json", 128 * 1024, fetcher))));
  }
  async function download(manifest, fetcher) {
    validate(manifest); const files = [];
    for (const f of manifest.files) {
      const bytes = await request(f.path, f.size, fetcher);
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
      if (bytes.length !== f.size || hash !== f.sha256) throw Error("Die Prüfsumme stimmt nicht: " + f.path + ". Bitte später erneut versuchen.");
      files.push({ path: f.path, bytes });
    }
    return files;
  }
  async function parent(dir, path, create) {
    const parts = path.split("/"); const name = parts.pop();
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create });
    return { dir, name };
  }
  async function read(dir, path) {
    try { const p = await parent(dir, path, false); return await (await p.dir.getFileHandle(p.name)).getFile(); }
    catch (e) { if (e.name === "NotFoundError") return null; throw e; }
  }
  async function write(dir, path, data) {
    const p = await parent(dir, path, true); const h = await p.dir.getFileHandle(p.name, { create: true }); const stream = await h.createWritable();
    try { await stream.write(data); await stream.close(); }
    catch (e) { await stream.abort().catch(() => {}); throw e; }
  }
  async function restore(dir, backup, journal) {
    if (!Array.isArray(journal) || journal.length > 64 || journal.some(f => !f || !allowed(f.path) || typeof f.existed !== "boolean") || new Set(journal.map(f => f.path)).size !== journal.length) throw Error("Ungültige Update-Sicherung.");
    // Confirm every required backup exists before restoring any file.
    const originals = await Promise.all(journal.map((f, i) => f.existed ? read(backup, i + ".bak") : null));
    if (journal.some((f, i) => f.existed && !originals[i])) throw Error("Die Update-Sicherung ist unvollständig.");
    for (let i = journal.length - 1; i >= 0; i--) {
      const f = journal[i];
      if (f.existed) await write(dir, f.path, originals[i]);
      else { try { const p = await parent(dir, f.path, false); await p.dir.removeEntry(p.name); } catch (e) { if (e.name !== "NotFoundError") throw e; } }
    }
    await backup.removeEntry("pending.json");
  }
  async function recover(dir) {
    let backup;
    try { backup = await dir.getDirectoryHandle(BACKUP); } catch (e) { if (e.name === "NotFoundError") return false; throw e; }
    const pending = await read(backup, "pending.json");
    if (!pending) return false;
    await restore(dir, backup, JSON.parse(await pending.text())); return true;
  }
  async function install(dir, manifest, fetcher) {
    if (!await read(dir, "Tagebuch.html")) throw Error("Bitte den Programmordner mit Tagebuch.html auswählen.");
    await recover(dir);
    // Download and verify everything before changing the installation.
    const files = await download(manifest, fetcher);
    // Keep the entry point and version marker until the end.
    files.sort((a, b) => rank(a.path) - rank(b.path));
    const backup = await dir.getDirectoryHandle(BACKUP, { create: true }); const journal = [];
    for (let i = 0; i < files.length; i++) {
      const original = await read(dir, files[i].path);
      if (original) await write(backup, i + ".bak", original);
      journal.push({ path: files[i].path, existed: !!original });
    }
    await write(backup, "pending.json", JSON.stringify(journal));
    try {
      for (const f of files) await write(dir, f.path, f.bytes);
      await backup.removeEntry("pending.json");
    } catch (e) {
      try { await restore(dir, backup, journal); }
      catch (_) { throw Error("Update und Wiederherstellung fehlgeschlagen. Die Sicherung liegt in " + BACKUP + ". Bitte den Programmordner vorerst nicht neu laden und die Programmdateien erneut herunterladen."); }
      throw Error("Update fehlgeschlagen; die bisherigen Programmdateien wurden wiederhergestellt. " + e.message);
    }
  }
  function rank(path) { return path === "app/version.js" ? 2 : path === "Tagebuch.html" ? 1 : 0; }
  return { latest, validate, download, install, recover, allowed };
});
