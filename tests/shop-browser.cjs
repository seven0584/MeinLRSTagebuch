// Optional browser regression test. Requires Python 3, Playwright and Chromium.
// Run from the repository root: node tests/shop-browser.cjs
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..');
  const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch('http://127.0.0.1:8765/Tagebuch.html'); if (r.ok) break; } catch (_) {}
      if (server.exitCode !== null) throw Error('Test server failed to start');
      if (i === 49) throw Error('Test server timed out');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const ctx = await browser.newContext();
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await ctx.route('https://raw.githubusercontent.com/**', route => route.abort());
    await page.goto('http://127.0.0.1:8765/Tagebuch.html');
    await page.evaluate(() => {
      const child = (id, name) => ({ id, name, entries: [], words: {}, names: [], draft: '', draftQ: {}, reward: null, readLog: {}, kidPinHash: '' });
      localStorage.setItem('schreibheft-v1', JSON.stringify({ v: 2, parent: { grammar: false, storage: { mode: 'browser' } }, salt: '', children: ['c1', 'c2'], data: { c1: child('c1', 'Anna'), c2: child('c2', 'Ben') }, active: 'c1' }));
    });
    await page.reload(); await page.waitForFunction(() => window.__test?.ready());
    await page.locator('#tileParent').click();
    await page.locator('#pinBox .p1').first().fill('1234'); await page.locator('#pinBox .p2').first().fill('1234');
    await page.locator('#pinBox .go').first().click();
    await page.locator('.pm[data-go="rewards"]').click();
    await page.locator('#addItem').click();
    let row = page.locator('#itemEditor [data-row]').last();
    await row.locator('.nm').fill('Pizzaabend'); await row.locator('.pr').fill('25');
    await row.locator('[data-pick-icon]').click();
    await page.getByRole('button', { name: 'Symbol 🍕 wählen', exact: true }).click();
    assert.equal(await row.locator('.ic').inputValue(), '🍕');
    await page.locator('#addItem').click();
    let pizza = page.locator('#itemEditor [data-row]').filter({ has: page.locator('input.nm[value="Pizzaabend"]') });
    assert.equal(await pizza.count(), 1);
    row = page.locator('#itemEditor [data-row]').last();
    await row.locator('.nm').fill('Lesezeit'); await row.locator('[data-del]').click();
    pizza = page.locator('#itemEditor [data-row]').last();
    assert.equal(await pizza.locator('.nm').inputValue(), 'Pizzaabend');
    // Emoji sequences longer than the former four UTF-16 code unit limit.
    await pizza.locator('.ic').fill(''); await pizza.locator('.ic').pressSequentially('👨‍👩‍👧‍👦');
    assert.equal(await pizza.locator('.ic').inputValue(), '👨‍👩‍👧‍👦');
    await pizza.locator('.nm').fill(''); await page.locator('#saveItems').click();
    assert.match(await page.locator('#itemMsg').innerText(), /Bitte allen Artikeln/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('schreibheft-v1')).data.c1.reward.items);
    assert(saved.some(it => it.name === 'Pizzaabend' && it.icon === '👨‍👩‍👧‍👦'));
    await pizza.locator('.nm').fill('Pizzaabend'); await pizza.locator('.pr').fill('0');
    assert.match(await page.locator('#itemMsg').innerText(), /letzte gültige Stand/);
    await page.locator('#childSel').selectOption('c2');
    assert(!await page.locator('#itemEditor').innerText().then(text => text.includes('Pizzaabend')));
    assert.equal(await page.locator('#itemEditor [data-row]').count(), 2);
    await page.locator('#childSel').selectOption('c1');
    assert.equal(await page.locator('#itemEditor [data-row]').last().locator('.pr').inputValue(), '25');
    await page.locator('#lockParent').click(); await page.locator('[data-kid="c1"]').click();
    await page.locator('#kidPinBox .p1').fill('5678'); await page.locator('#kidPinBox .p2').fill('5678'); await page.locator('#kidPinBox .go').click();
    await page.locator('#tabShop').click();
    assert(await page.locator('#shopItems').innerText().then(text => text.includes('Pizzaabend') && text.includes('25 Coins')));
    assert(await page.locator('#shopItems .item-icon').allTextContents().then(icons => icons.includes('👨‍👩‍👧‍👦')));
    await page.reload(); await page.waitForFunction(() => window.__test?.ready());
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('schreibheft-v1')).data);
    assert(restored.c1.reward.items.some(it => it.name === 'Pizzaabend' && it.price === 25 && it.icon === '👨‍👩‍👧‍👦'));
    assert.equal(restored.c2.reward.items.length, 2);
    assert.deepEqual(errors, []);
    console.log('PASS: automatic persistence, adding/deleting rows, icon selection, long emojis, validation, child isolation, immediate child-shop display and reload');
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
