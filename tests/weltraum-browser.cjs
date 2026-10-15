const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = 'http://127.0.0.1:8771';
(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8771', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(base + '/app/spiele/weltraum-angriff.html')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'Test server did not start');
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 800, height: 850 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/app/spiele/weltraum-angriff.html');
    await page.locator('#startBtn').click();
    assert.equal(await page.locator('#lives').innerText(), '4');
    assert.equal(await page.evaluate(() => aliens.length), 21);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => player.x > 260);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => player.x < 230);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down(' ');
    await page.waitForFunction(() => score > 0, { timeout: 10000 });
    await page.keyboard.up(' ');
    await page.screenshot({ path: '/tmp/tagebuch-weltraum-1.3.3.png' });
    await page.evaluate(() => aliens.forEach(a => a.alive = false));
    await page.waitForFunction(() => wave === 2);
    assert.equal(await page.evaluate(() => aliens.length), 24);
    await page.locator('#startBtn').click();
    assert.equal(await page.locator('#wave').innerText(), '1');
    assert.equal(await page.locator('#score').innerText(), '0');
    assert.equal(await page.locator('#lives').innerText(), '4');
    await page.waitForFunction(() => gameTime > 200);
    assert.deepEqual(errors, []);
    console.log('PASS: actual game starts with 21 enemies and four lives; arrow keys, held shooting, hits, next wave and restart work without browser errors');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
