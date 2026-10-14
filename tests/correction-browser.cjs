const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const KEY = 'schreibheft-v1', base = 'http://127.0.0.1:8770';

function family(grammar = false, minWords = 3) {
  return {
    v: 2, parent: { grammar, storage: { mode: 'browser' } }, salt: '', children: ['test'], active: 'test',
    data: { test: { id: 'test', name: 'Testkind', entries: [], words: {}, names: [], draft: '', draftQ: {},
      reward: { cfg: { entryWords: minWords, entrySentences: 1, sentenceWords: 1, days: 7, perSentence: 10, perWord: 2 } },
      readLog: {}, kidPinHash: '' } }
  };
}

async function openChild(browser, { grammar = false, matches = () => [], minWords = 3 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route('https://raw.githubusercontent.com/**', r => r.abort());
  await context.route('https://api.languagetool.org/v2/check', r => {
    const text = new URLSearchParams(r.request().postData()).get('text');
    return r.fulfill({ json: { matches: matches(text) } });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/Tagebuch.html');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [KEY, family(grammar, minWords)]);
  await page.reload();
  await page.waitForFunction(() => window.__test?.ready());
  await page.locator('[data-kid="test"]').click();
  await page.waitForFunction(() => document.activeElement === document.querySelector('#kidPinBox .p1'));
  await page.locator('#kidPinBox .p1').fill('5678');
  await page.locator('#kidPinBox .p2').fill('5678');
  await page.locator('#kidPinBox .go').click();
  await page.locator('#kidView').waitFor({ state: 'visible' });
  return { page, async close() { assert.deepEqual(errors, []); await context.close(); } };
}

async function check(page, text) {
  await page.locator('#ta').fill(text);
  await page.locator('#checkBtn').click();
  await page.locator('#wordEdit').waitFor();
}
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).data.test, KEY);

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8770', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(base + '/Tagebuch.html')).ok) { ready = true; break; } } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    assert(ready, 'Test server did not start');
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });

    const unknown = await openChild(browser), p = unknown.page;
    assert.deepEqual(await p.evaluate(() => __test.check('Ich sehe Rotze.').filter(m => !m.punct)), []);
    for (const word of ['Popel', 'Sone', 'Muter', 'Zorplix']) {
      const marks = await p.evaluate(word => __test.check('Ich sehe ' + word + '.').filter(m => !m.punct), word);
      assert.equal(marks.length, 1, word);
      assert.equal(marks[0].cat, 'Nicht im Wörterbuch', word);
      assert.equal(marks[0].fix, null, word);
      assert.match(marks[0].tip, /kann trotzdem richtig sein/, word);
      assert.doesNotMatch(marks[0].tip + marks[0].tip2, /Nomen|Großschreibung|Kleinschreibung|Konsonant/, word);
    }
    const knownCase = await p.evaluate(() => __test.check('Ich spiele im garten.').find(m => m.w === 'garten'));
    assert.equal(knownCase.cat, 'Großschreibung');
    assert.equal(knownCase.fix, 'Garten');
    for (const text of ['Ich esse ein Eis.', 'Wir gehen zum Spielen in den Garten.', 'Ich sehe eine Fotografie.']) {
      assert.deepEqual(await p.evaluate(t => __test.check(t).filter(m => !m.punct), text), [], text);
    }
    await check(p, 'Ich sehe Rotze und Popel.');
    assert.match(await p.locator('.dictionary-unknown').innerText(), /Nicht im Wörterbuch.*kann trotzdem richtig sein/s);
    assert.equal(await p.locator('#result .err.uncertain').count(), 1);
    await p.locator('#wordHint').click();
    assert.doesNotMatch(await p.locator('#wordHintText').innerText(), /Nomen|Großschreibung|Kleinschreibung/);
    assert.equal(await p.locator('#wordEdit').inputValue(), 'Popel');
    await p.locator('#wordDisagree').click();
    await p.locator('#doneArea').waitFor({ state: 'visible' });
    const saved = await stored(p);
    assert.equal(saved.entries[0].text, 'Ich sehe Rotze und Popel.');
    assert.deepEqual(saved.learning.cases.map(c => c.category), ['unknown']);
    assert(saved.learning.cases.every(c => c.expected === null));
    assert.equal(saved.entries[0].errCats.gross, undefined);
    assert.equal(saved.entries[0].errCats.klein, undefined);
    assert.deepEqual(await p.evaluate(c => TBLearning.recommendations(c), saved), []);
    await unknown.close();
    console.log('PASS: Rotze stays accepted; Popel and guessed targets stay unknown without a false rule or recommendation; known spelling and casing remain valid');

    const mixed = await openChild(browser), q = mixed.page;
    await check(q, 'Meine Muter spielt im Garten');
    assert.equal(await q.locator('#wordEdit').evaluate(el => el.tagName), 'INPUT');
    await q.locator('#wordEdit').fill('Mutter');
    await q.locator('#wordApply').click();
    await q.waitForFunction(() => document.querySelector('#wordEdit')?.tagName === 'TEXTAREA');
    assert.equal(await q.locator('#wordEdit').inputValue(), 'Meine Mutter spielt im Garten');
    assert.equal(await q.locator('#editOriginal').count(), 0);
    assert.match(await q.locator('#result [data-i]').innerText(), /Satzende bei „Garten“/);
    assert(await q.locator('#wordEdit').evaluate(el => el === document.activeElement));
    const box = await q.locator('#wordEdit').boundingBox();
    assert(box.y >= 0 && box.y + box.height <= 800);
    await q.setViewportSize({ width: 900, height: 768 });
    await q.locator('#result [data-i]').click();
    const narrowBox = await q.locator('#wordEdit').boundingBox();
    assert(narrowBox.y >= 0 && narrowBox.y + narrowBox.height <= 768);
    assert(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await q.setViewportSize({ width: 1280, height: 800 });
    await q.screenshot({ path: '/tmp/tagebuch-unified-correction.png' });
    assert.deepEqual(await q.locator('#wordEdit').evaluate(el => [el.selectionStart, el.selectionEnd]), [29, 29]);
    await q.locator('#wordEdit').press('.');
    assert.equal(await q.locator('#wordEdit').inputValue(), 'Meine Mutter spielt im Garten.');
    await q.locator('#wordEdit').press('Control+Enter');
    await q.locator('#doneArea').waitFor({ state: 'visible' });
    const corrected = await stored(q);
    assert.equal(corrected.entries[0].text, 'Meine Mutter spielt im Garten.');
    assert.equal(corrected.learning.cases[0].category, 'dopp');
    assert.equal(corrected.learning.cases[0].status, 'resolved');
    await mixed.close();
    console.log('PASS: word and punctuation corrections use the same visible editor; an actual correction can establish its rule afterwards');

    const optional = await openChild(browser), r = optional.page;
    await r.locator('#ta').fill('Ich male.');
    await r.locator('#optionalQuestions summary').click();
    await r.locator('[data-q="best"]').fill('  Ich spiele heute  ');
    await r.locator('#optionalQuestions summary').click();
    await r.locator('#checkBtn').click();
    await r.locator('textarea#wordEdit').waitFor();
    assert.equal(await r.locator('#wordEdit').inputValue(), '  Ich spiele heute  ');
    assert.equal(await r.locator('#optionalQuestions').getAttribute('open'), null);
    await r.locator('#wordEdit').fill('  Ich spiele heute.  ');
    await r.locator('#wordApply').click();
    await r.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(r)).entries[0].answers.best, 'Ich spiele heute.');
    assert.equal((await stored(r)).entries[0].text, 'Ich male.');
    await optional.close();
    console.log('PASS: punctuation in a collapsed optional answer edits only that answer, including whitespace offsets');

    const comma = await openChild(browser), v = comma.page;
    await check(v, 'Ich spiele weil ich Zeit habe.');
    await v.locator('#wordEdit').press(',');
    assert.equal(await v.locator('#wordEdit').inputValue(), 'Ich spiele, weil ich Zeit habe.');
    await v.locator('#wordApply').click();
    await v.locator('#doneArea').waitFor({ state: 'visible' });
    await comma.close();
    console.log('PASS: inserting a period or comma does not replace the marked word');

    const grammar = await openChild(browser, { grammar: true, matches: text => text.includes('spiele spiele') ? [{
      offset: text.indexOf('spiele spiele'), length: 'spiele spiele'.length,
      rule: { id: 'GERMAN_WORD_REPEAT_RULE', category: { id: 'GRAMMAR' } }, replacements: [{ value: 'spiele' }]
    }] : [] }), g = grammar.page;
    await check(g, 'Ich spiele spiele im Garten.');
    assert.equal(await g.locator('#wordEdit').evaluate(el => el.tagName), 'TEXTAREA');
    await g.locator('#wordEdit').fill('Ich spiele im Garten.');
    await g.locator('#wordApply').click();
    await g.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(g)).entries[0].text, 'Ich spiele im Garten.');
    await grammar.close();

    const online = await openChild(browser, { grammar: true, matches: text => [{
      offset: text.indexOf('Test'), length: 4, rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } }, replacements: [{ value: 'Text' }]
    }] }), o = online.page;
    await o.locator('#ta').fill('Ich mache einen Test.');
    await o.locator('#checkBtn').click();
    await o.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(o)).entries[0].text, 'Ich mache einen Test.');
    assert.equal((await stored(o)).learning.cases.length, 0);
    await online.close();
    console.log('PASS: multiword grammar edits stay in the correction area; online spelling guesses cannot introduce a false rule');

    const stale = await openChild(browser), t = stale.page;
    await check(t, 'Ich spiele heute');
    await t.locator('#ta').fill('Mein neuer Text steht hier.');
    await t.locator('#wordEdit').fill('Ich spiele heute.');
    await t.locator('#wordApply').click();
    assert.match(await t.locator('#wordEditStatus').innerText(), /Text wurde geändert/);
    assert.equal(await t.locator('#ta').inputValue(), 'Mein neuer Text steht hier.');
    await stale.close();

    const goal = await openChild(browser, { minWords: 5 }), u = goal.page;
    await check(u, 'Ich spiele heute im Garten');
    await u.locator('#wordEdit').fill('Ich.');
    await u.locator('#wordApply').click();
    assert.match(await u.locator('#wordEditStatus').innerText(), /noch 4 Wörter/);
    await u.locator('#wordEdit').fill('Ich spiele heute im Garten.');
    await u.locator('#wordApply').click();
    await u.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(u)).entries[0].text, 'Ich spiele heute im Garten.');
    await goal.close();
    console.log('PASS: stale corrections cannot overwrite a newer draft; shortening below the goal allows further edits in the same area');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
