// Run the unmodified reference algorithm through the gold-free Java adapter.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '../tests/benchmark-artifacts/brillmoore');
const digest = async file => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
async function main() {
  const name = process.argv[2] || 'bm-results';
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid run name');
  const prepared = process.env.BM_PREPARED ? path.resolve(process.env.BM_PREPARED) : path.join(root, 'prepared');
  const inputs = process.argv[3] ? path.resolve(process.argv[3]) : path.join(prepared, 'inputs.tsv');
  const train = path.join(prepared, 'train.tsv');
  const dictionary = path.join(prepared, 'dictionary.tsv');
  const build = JSON.parse(await fs.readFile(path.join(root, 'build-manifest.json'), 'utf8'));
  const lines = (await fs.readFile(inputs, 'utf8')).trim().split(/\r?\n/).map(line => line.split('\t'));
  if (lines.some(fields => fields.length !== 2)) throw new Error('Inputs must be id TAB input, without gold');
  const expected = new Map(lines);
  if (expected.size !== lines.length) throw new Error('Duplicate input IDs');
  const outputPath = path.join(root, name + '.jsonl');
  const output = await fs.open(outputPath, 'wx');
  const errors = await fs.open(path.join(root, name + '.stderr.log'), 'wx');
  const pools = process.env.BM_CANDIDATE_POOLS ? path.resolve(process.env.BM_CANDIDATE_POOLS) : null;
  const inputScore = process.env.BM_INPUT_SCORE === '1';
  const args = ['-Dfile.encoding=UTF-8', '-Duser.language=de', '-Duser.country=DE', ...(inputScore ? ['-Dbenchmark.inputScore=true'] : []), '-Xmx2048m', '-cp', build.classpath, build.benchmarkMainClass, train, dictionary, inputs, ...(pools ? [pools] : [])];
  const metadata = {started: new Date().toISOString(), referenceRevision: build.revision, command: {executable: build.java, args}, parameters: {window: 3, minAtoA: 0.8, singleAugmentation: false, maxCandidates: 10}, inputCount: lines.length, files: {}};
  metadata.prefiltered = Boolean(pools);
  metadata.inputScore = inputScore;
  for (const file of [train, dictionary, inputs, ...(pools ? [pools] : [])]) metadata.files[path.relative(root, file)] = await digest(file);
  const child = spawn(build.java, args, {windowsHide: true, stdio: ['ignore', 'pipe', errors.fd]});
  const completion = new Promise((resolve, reject) => {child.once('error', reject); child.once('exit', code => resolve(code));});
  const seen = new Set();
  const started = performance.now();
  let last = started;
  try {
    for await (const line of readline.createInterface({input: child.stdout, crlfDelay: Infinity})) {
      const row = JSON.parse(line);
      if (seen.has(row.id) || expected.get(row.id) !== row.input) throw new Error('Unexpected/duplicate result ID or changed input: ' + row.id);
      seen.add(row.id);
      await output.writeFile(JSON.stringify(row) + '\n');
      if (seen.size === 1 || seen.size % 25 === 0 || performance.now() - last > 30000) {
        console.log(name + ': ' + seen.size + '/' + lines.length + ' (' + Math.round(performance.now() - started) + 'ms)');
        last = performance.now();
      }
    }
    const exit = await completion;
    metadata.exitCode = exit;
    if (exit !== 0 || seen.size !== expected.size) throw new Error('Incomplete run: exit=' + exit + ', results=' + seen.size);
    metadata.status = 'complete';
  } catch (error) {
    metadata.status = 'failed'; metadata.error = error.message; child.kill();
    await completion.catch(() => {});
    throw error;
  } finally {
    await output.close(); await errors.close();
    metadata.finished = new Date().toISOString(); metadata.elapsedMs = performance.now() - started; metadata.results = seen.size;
    await fs.writeFile(path.join(root, name + '-manifest.json'), JSON.stringify(metadata, null, 2) + '\n');
  }
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});
