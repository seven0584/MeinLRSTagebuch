// Run from the repository root: node scripts/prepare-update.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('../app/update-core.js');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/version.js'), 'utf8');
const version = /release:\s*(\d+),\s*version:\s*"(\d+\.\d+\.\d+)"/.exec(source);
if (!version) throw Error('Missing release/version in app/version.js');
const files = ['Tagebuch.html'];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const file = dir + '/' + entry.name;
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && core.allowed(file)) files.push(file);
    else throw Error('Unexpected application file: ' + file);
  }
}
walk('app');
const manifest = core.validate({ schema: 1, release: Number(version[1]), version: version[2], files: files.sort().map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  return { path: file, size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}) });
fs.writeFileSync(path.join(root, 'updates.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared version ' + manifest.version + ' (' + manifest.files.length + ' files).');
