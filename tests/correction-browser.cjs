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
  await enterChild(page, true);
  return { page, async close() { assert.deepEqual(errors, []); await context.close(); } };
}

async function enterChild(page, first = false) {
  await page.locator('[data-kid="test"]').click();
  await page.waitForFunction(() => document.activeElement === document.querySelector('#kidPinBox .p1'));
  await page.locator('#kidPinBox .p1').fill('5678');
  if (first) await page.locator('#kidPinBox .p2').fill('5678');
  await page.locator('#kidPinBox .go').click();
  await page.locator('#kidView').waitFor({ state: 'visible' });
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
    assert.equal(await p.locator('#result h3').innerText(), 'Dieses Wort kenne ich nicht');
    assert.match(await p.locator('.dictionary-unknown').innerText(), /kann trotzdem richtig sein.*Wörterbuch kennt diese Schreibweise nicht/s);
    assert.equal(await p.locator('#reviewText .review-mark.uncertain').count(), 1);
    assert.equal(await p.locator('#wordHint').count(),0);
    assert.equal(await p.locator('#correctionActions button:visible').count(),3);
    await p.locator('#wordHelp').click();
    assert.equal(await p.locator('#result button:visible').count(), 3);
    await p.locator('#wordBelief').click();
    // One click on the belief is enough for yellow dictionary marks.
    await p.locator('#doneArea').waitFor({ state: 'visible' });
    const saved = await stored(p);
    assert.equal(saved.entries[0].text, 'Ich sehe Rotze und Popel.');
    assert.deepEqual(saved.learning.cases.map(c => c.category), ['unknown']);
    assert(saved.learning.cases.every(c => c.expected === null));
    assert(saved.learning.cases.every(c => !c.shared));
    assert.equal(saved.learning.cases[0].status, 'contested');
    assert.equal(saved.entries[0].errCats.gross, undefined);
    assert.equal(saved.entries[0].errCats.klein, undefined);
    assert.deepEqual(await p.evaluate(c => TBLearning.recommendations(c), saved), []);
    await unknown.close();
    console.log('PASS: Rotze stays accepted; Popel and guessed targets stay unknown without a false rule or recommendation; known spelling and casing remain valid');

    const immediate = await openChild(browser), i = immediate.page;
    const repeatedUnknown = 'Ich sehe Popel. Dort liegt Popel. Ich sehe eine blume.';
    await check(i, repeatedUnknown);
    assert.equal(await i.locator('#reviewText .uncertain').count(), 2);
    await i.locator('#wordHelp').click();
    await i.locator('#wordBelief').click();
    await i.waitForFunction(() => document.querySelectorAll('#reviewText .uncertain').length === 1);
    let immediateSaved = await stored(i);
    assert.equal(immediateSaved.draft, repeatedUnknown);
    assert.equal(immediateSaved.entries.length, 0);
    assert.equal(immediateSaved.learning.cases[0].status, 'contested');
    assert.equal(immediateSaved.learning.cases[0].pendingReview.value, 'Popel');
    assert(immediateSaved.learning.cases[0].events.some(e => e.type === 'deferred' && e.reason === 'disagree'));
    assert.equal(immediateSaved.learning.cases[1].status, 'active');
    assert(immediateSaved.learning.cases.every(c => !c.shared));
    await i.reload();
    await i.waitForFunction(() => window.__test?.ready());
    await enterChild(i);
    await i.locator('#checkBtn').click();
    await i.locator('#wordEdit').waitFor();
    assert.equal(await i.locator('#reviewText .uncertain').count(), 1);
    await i.locator('#wordHelp').click();
    await i.locator('#wordBelief').click();
    await i.waitForFunction(() => document.querySelector('#wordEdit')?.value === 'blume');
    await i.locator('#wordEdit').fill('Blume');
    await i.locator('#wordApply').click();
    await i.locator('#doneArea').waitFor({state:'visible'});
    immediateSaved = await stored(i);
    assert.equal(immediateSaved.entries[0].text, repeatedUnknown.replace('blume', 'Blume'));
    assert.equal(immediateSaved.entries[0].learningSummary.contested, 2);
    assert.equal(immediateSaved.entries[0].learningSummary.pendingReviews, 2);
    await immediate.close();
    console.log('PASS: yellow words stop blocking immediately, occurrence by occurrence; feedback stays private, survives reload and is counted at completion');

    const mixed = await openChild(browser), q = mixed.page;
    await check(q, 'Meine Muter spielt im Garten');
    assert.equal(await q.locator('#wordEdit').evaluate(el => el.tagName), 'INPUT');
    await q.locator('#wordEdit').fill('Mutter');
    await q.locator('#wordApply').click();
    await q.waitForFunction(() => document.querySelector('#wordEdit')?.tagName === 'TEXTAREA');
    assert.equal(await q.locator('#wordEdit').inputValue(), 'Meine Mutter spielt im Garten');
    assert.equal(await q.locator('#editOriginal').count(), 0);
    assert.match(await q.locator('#reviewText [data-i]').getAttribute('aria-label'), /Satzende: Garten/);
    assert(await q.locator('#wordEdit').evaluate(el => el === document.activeElement));
    const box = await q.locator('#wordEdit').boundingBox();
    assert(box.y >= 0 && box.y + box.height <= 800);
    await q.setViewportSize({ width: 900, height: 768 });
    await q.locator('#reviewText [data-i]').click();
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
    assert.equal(await r.locator('#optionalQuestions summary').innerText(), 'Schreibideen anzeigen');
    await r.locator('#ta').fill('Ich male.');
    await r.locator('#optionalQuestions summary').click();
    await r.locator('[data-q="best"]').fill('  Ich spiele heute  ');
    await r.getByText('Schreibideen ausblenden', { exact: true }).waitFor();
    assert.equal(await r.locator('#optionalQuestions summary').innerText(), 'Schreibideen ausblenden');
    await r.locator('#optionalQuestions summary').click();
    await r.locator('#checkBtn').click();
    await r.locator('textarea#wordEdit').waitFor();
    assert.equal(await r.locator('#wordEdit').inputValue(), '  Ich spiele heute  ');
    assert.equal(await r.locator('#optionalQuestions').getAttribute('open'), null);
    assert.match(await r.locator('#reviewText').innerText(), /Ich male\.[\s\S]*Ich spiele heute/);
    assert.equal(await r.locator('#ta').isVisible(), false);
    assert.equal(await r.locator('#ta').evaluate(el => el.readOnly), true);
    assert.equal(await r.locator('#reviewText').evaluate(el => el.isContentEditable), false);
    assert.equal(await r.locator('#reviewText input,#reviewText textarea').count(), 0);
    await r.locator('#wordEdit').fill('  Ich spiele heute.  ');
    await r.locator('#wordApply').click();
    await r.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(r)).entries[0].answers.best, 'Ich spiele heute.');
    assert.equal((await stored(r)).entries[0].text, 'Ich male.');
    await optional.close();
    console.log('PASS: punctuation in a collapsed optional answer edits only that answer, including whitespace offsets');

    const optionalExcerpt = await openChild(browser), oe = optionalExcerpt.page;
    await oe.locator('#ta').fill('Heute male ich. 😀');
    await oe.locator('#optionalQuestions summary').click();
    await oe.locator('[data-q="best"]').fill('  Ich spiele heute. Danach lese ich ein Buch .  ');
    await oe.locator('#optionalQuestions summary').click();
    await oe.locator('#checkBtn').click();
    await oe.locator('#wordEdit').waitFor();
    assert.equal(await oe.locator('#wordEdit').inputValue(), 'Buch .');
    await oe.locator('#wordEdit').press('Delete');
    await oe.locator('#returnToWriting').click();
    assert.equal(await oe.locator('#ta').inputValue(), 'Heute male ich. 😀');
    assert.equal(await oe.locator('[data-q="best"]').inputValue(), '  Ich spiele heute. Danach lese ich ein Buch.  ');
    assert.equal((await stored(oe)).draftQ.best, '  Ich spiele heute. Danach lese ich ein Buch.  ');
    await optionalExcerpt.close();

    const spacing = await openChild(browser), sp = spacing.page;
    const before = 'Heute spiele ich im Garten. '.repeat(8) + '\n\nDu ';
    const after = ' App hilft mir. Danach lese ich ein Buch.';
    await check(sp, before + 'schreibst.Die' + after);
    assert.equal(await sp.locator('#result h3').innerText(), 'Hier fehlt ein Leerzeichen');
    assert.match(await sp.locator('.spacing-explanation').innerText(), /Zwischen „schreibst\.“ und „Die“ fehlt ein Leerzeichen/);
    assert.equal(await sp.locator('#reviewText .review-mark').first().innerText(), 'schreibst.');
    assert.equal(await sp.locator('#wordEdit').inputValue(), 'schreibst.Die');
    assert.deepEqual(await sp.locator('#wordEdit').evaluate(el => [el.selectionStart,el.selectionEnd]), [10,10]);
    await sp.screenshot({path:'/tmp/tagebuch-spacing-1.3.4.png'});
    await sp.locator('#wordEdit').press('Space');
    assert.equal(await sp.locator('#wordEdit').inputValue(), 'schreibst. Die');
    await sp.locator('#wordApply').click();
    // The shipped dictionary does not know App; its independent yellow mark remains.
    await sp.waitForFunction(() => document.querySelector('#wordEdit')?.value === 'App');
    assert.equal(await sp.locator('.spacing-explanation').count(), 0);
    await sp.locator('#wordHelp').click();
    await sp.locator('#wordBelief').click();
    await sp.locator('#doneArea').waitFor({state:'visible'});
    assert.equal((await stored(sp)).entries[0].text, before + 'schreibst. Die' + after);
    await spacing.close();

    const extraSpace = await openChild(browser), es = extraSpace.page;
    await check(es, 'Ich sehe einen Baum . Danach spiele ich.');
    assert.equal(await es.locator('#result h3').innerText(), 'Hier ist ein Leerzeichen zu viel');
    assert.equal(await es.locator('#wordEdit').inputValue(), 'Baum .');
    assert.deepEqual(await es.locator('#wordEdit').evaluate(el=>[el.selectionStart,el.selectionEnd]), [4,4]);
    await es.locator('#wordEdit').press('Delete');
    await es.locator('#wordApply').click();
    await es.locator('#doneArea').waitFor({state:'visible'});
    assert.equal((await stored(es)).entries[0].text, 'Ich sehe einen Baum. Danach spiele ich.');
    await extraSpace.close();

    const tailSpace = await openChild(browser), ts = tailSpace.page;
    await check(ts, 'Heute male ich. Ich spiele heute .  ');
    assert.equal(await ts.locator('#wordEdit').inputValue(), 'heute .');
    await ts.locator('#wordEdit').press('Delete');
    await ts.locator('#wordApply').click();
    await ts.locator('#doneArea').waitFor({state:'visible'});
    assert.equal((await stored(ts)).entries[0].text, 'Heute male ich. Ich spiele heute.');
    await tailSpace.close();

    const sentence = await openChild(browser), sc = sentence.page;
    await check(sc, 'Heute male ich. Ich spiele heute');
    assert.equal(await sc.locator('#wordEdit').inputValue(), 'Ich spiele heute');
    await sc.locator('#wordEdit').press('.');
    await sc.locator('#returnToWriting').click();
    assert.equal(await sc.locator('#ta').inputValue(), 'Heute male ich. Ich spiele heute.');
    await sentence.close();
    console.log('PASS: spacing feedback explains the boundary, not a spelling error; only the relevant excerpt is edited and all surrounding text is preserved');

    const comma = await openChild(browser), v = comma.page;
    await check(v, 'Heute male ich. Ich spiele weil ich Zeit habe. Danach lese ich.');
    assert.equal(await v.locator('#wordEdit').inputValue(), 'Ich spiele weil ich Zeit habe.');
    await v.locator('#wordEdit').press(',');
    assert.equal(await v.locator('#wordEdit').inputValue(), 'Ich spiele, weil ich Zeit habe.');
    await v.locator('#wordApply').click();
    await v.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(v)).entries[0].text, 'Heute male ich. Ich spiele, weil ich Zeit habe. Danach lese ich.');
    await comma.close();
    console.log('PASS: inserting a period or comma does not replace the marked word');

    const grammar = await openChild(browser, { grammar: true, matches: text => text.includes('spiele spiele') ? [{
      offset: text.indexOf('spiele spiele'), length: 'spiele spiele'.length,
      rule: { id: 'GERMAN_WORD_REPEAT_RULE', category: { id: 'GRAMMAR' } }, replacements: [{ value: 'spiele' }]
    }] : [] }), g = grammar.page;
    await check(g, 'Heute male ich. Ich spiele spiele im Garten. Danach lese ich.');
    assert.equal(await g.locator('#wordEdit').inputValue(), 'Ich spiele spiele im Garten.');
    assert.equal(await g.locator('#wordEdit').evaluate(el => el.tagName), 'TEXTAREA');
    await g.locator('#wordEdit').fill('Ich spiele im Garten.');
    await g.locator('#wordApply').click();
    await g.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(g)).entries[0].text, 'Heute male ich. Ich spiele im Garten. Danach lese ich.');
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
    await t.locator('#ta').evaluate(el=>{el.value='Mein neuer Text steht hier.';el.dispatchEvent(new Event('input'));});
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

    const repeated = await openChild(browser), a = repeated.page;
    await check(a, 'Ich sehe eine blume. Dort steht auch eine blume.');
    assert.equal(await a.locator('#reviewText .review-mark').count(), 2);
    assert.equal(await a.locator('#result button:visible').count(), 3);
    await a.locator('#wordHint').click();
    assert.equal(await a.locator('#wordHint').innerText(), 'Weiterer Tipp');
    await a.locator('#wordHint').click();
    assert.equal(await a.locator('#wordHint').innerText(), 'Tipp wiederholen');
    assert.equal(await a.locator('#result button:visible').count(), 3);
    await a.locator('#wordHelp').click();
    assert.equal(await a.locator('#wordUnknown').innerText(), 'Der Tipp hilft mir nicht');
    await a.locator('#wordUnknown').click();
    await a.waitForFunction(() => document.querySelectorAll('#reviewText .review-mark').length === 1);
    const partial = await stored(a);
    assert.equal(partial.entries.length, 0);
    assert.deepEqual(partial.learning.cases.map(c => c.status), ['deferred', 'active']);
    assert(partial.learning.cases.every(c => !c.shared));
    assert(partial.learning.cases[0].events.some(e => e.type === 'hint_unclear'));
    await a.locator('#wordEdit').fill('Blume');
    await a.locator('#wordApply').click();
    await a.locator('#doneArea').waitFor({ state: 'visible' });
    assert.equal((await stored(a)).entries[0].text, 'Ich sehe eine blume. Dort steht auch eine Blume.');
    await repeated.close();
    console.log('PASS: three actions per step; two hint levels and unclear feedback; deferring one occurrence leaves the next occurrence to work on and stays private');

    const pending = await openChild(browser), b = pending.page;
    await check(b, 'Meine Muter sieht eine blume.');
    await b.locator('#wordEdit').fill('Mutter');
    await b.locator('#reviewText .review-mark').last().click();
    await b.waitForFunction(() => document.querySelector('#wordEdit')?.value === 'blume');
    assert.equal((await stored(b)).draft, 'Meine Mutter sieht eine blume.');
    assert.equal(await b.locator('#reviewText').innerText(), 'Meine Mutter sieht eine blume.');
    await b.locator('#wordEdit').fill('Blume');
    await b.locator('#returnToWriting').click();
    assert.equal(await b.locator('#ta').inputValue(), 'Meine Mutter sieht eine Blume.');
    assert.equal(await b.locator('#ta').evaluate(el => el.readOnly), false);
    assert.equal(await b.locator('#reviewPane').isVisible(), false);
    await b.locator('#ta').fill('Meine Mutter sieht eine Bluume.');
    await b.locator('#checkBtn').click();
    await b.locator('#wordEdit').waitFor();
    await b.locator('#wordEdit').fill('Blume');
    await b.locator('#kidView [data-home]').click();
    assert.equal((await stored(b)).draft, 'Meine Mutter sieht eine Blume.');
    await enterChild(b);
    assert.equal(await b.locator('#ta').inputValue(), 'Meine Mutter sieht eine Blume.');
    await b.locator('#ta').fill('Meine Muter spielt im Garten.');
    await b.locator('#checkBtn').click();
    await b.locator('#wordEdit').waitFor();
    await b.locator('#wordEdit').fill('Mutter');
    await b.reload();
    await b.waitForFunction(() => window.__test?.ready());
    await enterChild(b);
    assert.equal(await b.locator('#ta').inputValue(), 'Meine Mutter spielt im Garten.');
    await pending.close();
    console.log('PASS: pending corrections survive selecting another mark, returning to writing, leaving the child view and reloading');

    const name = await openChild(browser), n = name.page;
    await check(n, 'Ich sehe Zorplix heute.');
    assert.equal(await n.locator('#result button:visible').count(), 3);
    await n.locator('#nameBtn').click();
    await n.locator('#doneArea').waitFor({ state: 'visible' });
    assert((await stored(n)).names.includes('Zorplix'));
    assert((await stored(n)).learning.cases.every(c => !c.shared));
    await name.close();

    const layout = await openChild(browser), l = layout.page;
    const normalText = ('Heute spiele ich mit meiner Mutter im Garten. Wir sehen eine schöne Blume und einen Baum. ').repeat(3) + 'Ich sehe eine blume.';
    await check(l, normalText);
    for (const width of [1280, 1024, 900]) {
      await l.setViewportSize({ width, height: 768 });
      const left = await l.locator('#reviewPane').boundingBox(), right = await l.locator('#result').boundingBox();
      const actions = await l.locator('#correctionActions').boundingBox();
      assert(left.x + left.width <= right.x, 'text and editor must be side by side');
      const sheet = await l.locator('#reviewPane .sheet').boundingBox();
      assert(Math.abs(sheet.y - right.y) <= 1, 'sheet and correction window must start at the same height');
      assert(actions.y >= 0 && actions.y + actions.height <= 768, 'main actions must be visible');
      assert(await l.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await l.setViewportSize({ width: 1280, height: 800 });
    await l.screenshot({ path: '/tmp/tagebuch-review-layout.png' });
    await l.emulateMedia({ colorScheme: 'dark' });
    await l.screenshot({ path: '/tmp/tagebuch-review-dark.png' });
    await l.setViewportSize({ width: 600, height: 768 });
    const stackedLeft = await l.locator('#reviewPane').boundingBox(), stackedRight = await l.locator('#result').boundingBox();
    assert(stackedLeft.y + stackedLeft.height <= stackedRight.y);
    assert(await l.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await layout.close();
    console.log('PASS: names remain available without automatic sharing; read-only text and correction actions fit side by side at laptop widths, narrow view stacks without horizontal overflow');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
