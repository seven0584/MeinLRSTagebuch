// Builds the pinned, unmodified upstream reference; no system installation.
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'tests/benchmark-artifacts/brillmoore');
const reference = path.join(base, 'reference');
const revision = '59e7af3aba2a784f72e033fc281e52d5a61ffa2a';
const repository = 'https://github.com/adrianeboyd/BrillMooreSpellChecker.git';
const dependencies = [
  ['gnu/getopt/java-getopt/1.0.13/java-getopt-1.0.13.jar', 'f09dc6369ffc4fe4362cbd49b6ac6c4a7471375ac5d884c71b0a625a889c38c4', 'LGPL-2.0-or-later (embedded COPYING.LIB and Getopt.java)'],
  ['org/apache/commons/commons-lang3/3.3.2/commons-lang3-3.3.2.jar', '6b81d10754dadf184d386011486e6509c2cc0c3d33565ced4fb4402b9413d47d', 'Apache-2.0'],
  ['commons-cli/commons-cli/1.2/commons-cli-1.2.jar', 'e7cd8951956d349b568b7ccfd4f5b2529a8c113e67c32b028f52ffda371259d9', 'Apache-2.0'],
];
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error || result.stderr || result.stdout}`);
  return result.stdout;
}
async function filesBelow(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? filesBelow(path.join(dir, e.name)) : path.join(dir, e.name)))).flat().sort();
}
async function main() {
  await fs.mkdir(base, { recursive: true });
  try { await fs.access(path.join(reference, '.git')); }
  catch {
    run('git', ['clone', '--no-checkout', repository, reference]);
    run('git', ['-C', reference, 'checkout', '--detach', revision]);
  }
  const current = run('git', ['-C', reference, 'rev-parse', 'HEAD']).trim();
  if (current !== revision) {
    if (run('git', ['-C', reference, 'status', '--porcelain']).trim()) throw new Error('Reference has local changes; refusing checkout');
    run('git', ['-C', reference, 'checkout', '--detach', revision]);
  }
  if (run('git', ['-C', reference, 'status', '--porcelain']).trim()) throw new Error('Reference is modified');
  const libs = path.join(base, 'lib');
  await fs.mkdir(libs, { recursive: true });
  const assets = [];
  for (const [artifact, sha256, license] of dependencies) {
    const url = `https://repo.maven.apache.org/maven2/${artifact}`;
    const destination = path.join(libs, path.basename(artifact));
    let bytes;
    try { bytes = await fs.readFile(destination); } catch {}
    if (!bytes || digest(bytes) !== sha256) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download ${response.status}: ${url}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (digest(bytes) !== sha256) throw new Error(`Hash mismatch: ${artifact}`);
      await fs.writeFile(destination, bytes);
    }
    assets.push({ url, file: path.relative(base, destination), sha256, bytes: bytes.length, license });
    // Preserve Maven POM license metadata alongside each dependency.
    const pomUrl = url.replace(/\.jar$/, '.pom');
    const pomResponse = await fetch(pomUrl);
    if (!pomResponse.ok) throw new Error(`POM download ${pomResponse.status}: ${pomUrl}`);
    await fs.writeFile(destination.replace(/\.jar$/, '.pom'), await pomResponse.text());
  }
  const javac = process.env.BM_JAVAC || 'C:/Program Files/Microsoft/jdk-11.0.22.7-hotspot/bin/javac.exe';
  const java = process.env.BM_JAVA || path.join(path.dirname(javac), process.platform === 'win32' ? 'java.exe' : 'java');
  const sources = (await filesBelow(path.join(reference, 'src/main/java'))).filter(f => f.endsWith('.java'));
  const classes = path.join(base, 'classes');
  await fs.mkdir(classes, { recursive: true });
  const compilerClasspath = assets.map(a => path.join(base, a.file)).join(path.delimiter);
  const wrapper = path.join(root, 'scripts/brillmoore/BmBenchmark.java');
  const args = ['--release', '8', '-encoding', 'UTF-8', '-cp', compilerClasspath, '-d', classes, ...sources, wrapper];
  run(javac, args);
  const sourceFiles = [path.join(reference, 'LICENSE'), path.join(reference, 'pom.xml'), ...sources];
  const sourceManifest = [];
  for (const file of sourceFiles) sourceManifest.push({ file: path.relative(reference, file), sha256: digest(await fs.readFile(file)) });
  const manifest = {
    repository, revision, license: 'Apache-2.0', unmodified: true,
    sourceFiles: sourceManifest, dependencies: assets,
    build: { javac, version: run(javac, ['-version']).trim(), args },
    java, classpath: [classes, compilerClasspath].join(path.delimiter),
    mainClass: 'de.unituebingen.sfs.brillmoore.Main',
    benchmarkMainClass: 'BmBenchmark',
    wrapper: { file: path.relative(root, wrapper), sha256: digest(await fs.readFile(wrapper)), policy: 'No single-edit augmentation. Full-precision costs, lexical ties, finite candidates only, max 10. UTF-8. No gold in inference inputs.' },
    caveats: ['Original CLI rounds costs to two decimals.', 'Original -s flag is parsed but never assigned; single-character augmentation is not enabled by that flag.', 'getRankedCandidates rebuilds and exhaustively traverses the entire dictionary trie for each input.'],
  };
  await fs.writeFile(path.join(base, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ java, classpath: manifest.classpath, mainClass: manifest.mainClass, revision }, null, 2));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { main };
