const crypto = require('node:crypto');
function parse(markdown) {
  const entries = []; let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      const title = line.slice(3).trim();
      current = { id: crypto.createHash('sha256').update(title).digest('hex').slice(0, 16), title, lines: [] };
      entries.push(current);
    } else if (current) current.lines.push(line);
  }
  if (!entries.length || new Set(entries.map(e => e.id)).size !== entries.length) throw Error('Missing or duplicate changelog headings');
  return entries;
}
function generate(markdown) {
  return '// Generated from CHANGELOG.md by scripts/prepare-update.cjs.\nwindow.TB_CHANGELOG = ' + JSON.stringify(parse(markdown), null, 2) + ';\n';
}
module.exports = { parse, generate };
