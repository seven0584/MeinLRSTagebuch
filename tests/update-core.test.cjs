const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../app/update-core.js');
const paths = ['Tagebuch.html', 'app/app.js', 'app/version.js', 'app/update-core.js', 'app/updater.js'];
const bytes = new Map(paths.map(p => [p, Buffer.from('new:' + p)]));
const manifest = { schema: 1, release: 2, version: '1.1.0', files: paths.map(path => ({ path, size: bytes.get(path).length, sha256: crypto.createHash('sha256').update(bytes.get(path)).digest('hex') })) };
const fetcher = async url => new Response(bytes.get(new URL(url).pathname.split('/main/')[1]) || '', { status: 200 });
test('offline history matches CHANGELOG.md and preserves identifiers for existing headings', () => {
  const root = path.resolve(__dirname, '..');
  const changelog = require('../scripts/changelog.cjs');
  const markdown = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(fs.readFileSync(path.join(root, 'app/changelog-data.js'), 'utf8'), changelog.generate(markdown));
  const old = changelog.parse('## First release\n- Previous wording\n');
  const revised = changelog.parse('## New release\n- New feature\n\n## First release\n- Corrected wording\n');
  assert.equal(old[0].id, revised[1].id);
  assert.notEqual(revised[0].id, revised[1].id);
  assert.throws(() => changelog.parse('## Same\n## Same\n'), /duplicate/);
});
test('published manifest matches every application file and the release marker', () => {
  const root = path.resolve(__dirname, '..');
  const published = core.validate(JSON.parse(fs.readFileSync(path.join(root, 'updates.json'))));
  const source = fs.readFileSync(path.join(root, 'app/version.js'), 'utf8');
  const version = /release:\s*(\d+),\s*version:\s*"(\d+\.\d+\.\d+)"/.exec(source);
  assert.equal(published.release, Number(version[1])); assert.equal(published.version, version[2]);
  for (const file of published.files) {
    const data = fs.readFileSync(path.join(root, file.path));
    assert.equal(data.length, file.size, file.path);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), file.sha256, file.path);
  }
  function checkDirectory(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const p = dir + '/' + entry.name;
      if (entry.isDirectory()) checkDirectory(p);
      else assert(published.files.some(f => f.path === p), 'File missing from manifest: ' + p);
    }
  }
  checkDirectory('app');
});
function disk() {
  const files = new Map(paths.map(p => [p, Buffer.from('old:' + p)]));
  files.set('config/familie.json', Buffer.from('family-secret'));
  files.set('kinder/Test/files/tagebuch.json', Buffer.from('diary-secret'));
  const dirs = new Set(['', 'app', 'config', 'kinder', 'kinder/Test', 'kinder/Test/files']);
  const missing = () => Object.assign(Error('Missing'), { name: 'NotFoundError' });
  let fail = null;
  function handle(prefix) {
    const full = name => prefix ? prefix + '/' + name : name;
    return {
      async getDirectoryHandle(name, opts = {}) { const p = full(name); if (!dirs.has(p)) { if (!opts.create) throw missing(); dirs.add(p); } return handle(p); },
      async getFileHandle(name, opts = {}) {
        const p = full(name); if (!files.has(p)) { if (!opts.create) throw missing(); files.set(p, Buffer.alloc(0)); }
        return {
          async getFile() { return new Blob([files.get(p)]); },
          async createWritable() { return { async write(data) { const b = data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : Buffer.from(data); files.set(p, b); if (fail === p) { fail = null; throw Error('Disk full'); } }, async close() {}, async abort() {} }; }
        };
      },
      async removeEntry(name) { if (!files.delete(full(name))) throw missing(); }
    };
  }
  return { files, dir: handle(''), failOnce(path) { fail = path; } };
}
test('manifest rejects traversal, personal data, duplicate files and missing program files', () => {
  for (const path of ['../config/familie.json', 'config/familie.json', 'kinder/Test/files/tagebuch.json', 'app/../config/familie.json', 'app//app.js', 'https://evil.example/app.js']) {
    assert.throws(() => core.validate({ ...manifest, files: [{ ...manifest.files[0], path }, ...manifest.files.slice(1)] }));
  }
  assert.throws(() => core.validate({ ...manifest, files: [...manifest.files, manifest.files[0]] }));
  assert.throws(() => core.validate({ ...manifest, files: manifest.files.slice(1) }));
});
test('install replaces application files and preserves personal files', async () => {
  const d = disk(); await core.install(d.dir, manifest, fetcher);
  for (const p of paths) assert.deepEqual(d.files.get(p), bytes.get(p));
  assert.equal(d.files.get('config/familie.json').toString(), 'family-secret');
  assert.equal(d.files.get('kinder/Test/files/tagebuch.json').toString(), 'diary-secret');
  assert(!d.files.has('.tagebuch-update-backup/pending.json'));
});
test('corrupted or inconsistent downloads never change application files', async () => {
  const d = disk(); const before = new Map(d.files);
  await assert.rejects(core.install(d.dir, manifest, async () => new Response('bad')), /Prüfsumme/);
  assert.deepEqual(d.files, before);
});
test('offline and permission errors keep the original installation', async () => {
  const d = disk(); const before = new Map(d.files);
  await assert.rejects(core.install(d.dir, manifest, async () => { throw Error('Offline'); }), /Offline/);
  assert.deepEqual(d.files, before);
  await assert.rejects(core.install({ async getFileHandle() { throw Object.assign(Error('Denied'), { name: 'NotAllowedError' }); } }, manifest, fetcher), /Denied/);
});
test('partial writes are rolled back including the failing file', async () => {
  const d = disk(); const before = new Map(d.files); d.failOnce('app/updater.js');
  await assert.rejects(core.install(d.dir, manifest, fetcher), /wiederhergestellt/);
  for (const [p, b] of before) assert.deepEqual(d.files.get(p), b);
  assert(!d.files.has('.tagebuch-update-backup/pending.json'));
});
test('rollback removes newly created application files', async () => {
  const d = disk(); d.files.delete('app/update-core.js'); d.failOnce('Tagebuch.html');
  await assert.rejects(core.install(d.dir, manifest, fetcher), /wiederhergestellt/);
  assert(!d.files.has('app/update-core.js'));
  assert.equal(d.files.get('Tagebuch.html').toString(), 'old:Tagebuch.html');
});
test('an interrupted update is recovered from its journal', async () => {
  const d = disk(); const b = await d.dir.getDirectoryHandle('.tagebuch-update-backup', { create: true });
  d.files.set('.tagebuch-update-backup/0.bak', Buffer.from('old:Tagebuch.html'));
  d.files.set('.tagebuch-update-backup/pending.json', Buffer.from(JSON.stringify([{ path: 'Tagebuch.html', existed: true }])));
  d.files.set('Tagebuch.html', Buffer.from('partial update'));
  assert.equal(await core.recover(d.dir), true);
  assert.equal(d.files.get('Tagebuch.html').toString(), 'old:Tagebuch.html');
  assert.equal(await core.recover(d.dir), false);
});
test('recovery refuses journals targeting private files', async () => {
  const d = disk(); await d.dir.getDirectoryHandle('.tagebuch-update-backup', { create: true });
  d.files.set('.tagebuch-update-backup/pending.json', Buffer.from(JSON.stringify([{ path: 'config/familie.json', existed: false }])));
  await assert.rejects(core.recover(d.dir), /Ungültige/);
  assert.equal(d.files.get('config/familie.json').toString(), 'family-secret');
});
test('missing backup prevents partial restoration', async () => {
  const d = disk(); await d.dir.getDirectoryHandle('.tagebuch-update-backup', { create: true });
  d.files.set('.tagebuch-update-backup/pending.json', Buffer.from(JSON.stringify([{ path: 'Tagebuch.html', existed: true }])));
  await assert.rejects(core.recover(d.dir), /unvollständig/);
  assert.equal(d.files.get('Tagebuch.html').toString(), 'old:Tagebuch.html');
});
test('bounded downloads reject oversized responses and non-success HTTP status', async () => {
  await assert.rejects(core.download(manifest, async () => new Response(Buffer.alloc(1000))), /zu groß/);
  await assert.rejects(core.latest(async () => new Response('', { status: 404 })), /HTTP 404/);
});
