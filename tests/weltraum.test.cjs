const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function game() {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../app/spiele/weltraum-angriff.html'), 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const noop = () => {};
  const elements = new Map();
  const ctx = new Proxy({}, { get: () => noop, set: () => true });
  const sandbox = vm.createContext({
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, { width: 480, height: 520, getContext: () => ctx, addEventListener: noop });
      return elements.get(id);
    }, addEventListener: noop },
    SFX: { startBgMusic: () => noop, BG_PATTERNS: {}, invaders: new Proxy({}, { get: () => noop }) },
    requestAnimationFrame: () => 1, cancelAnimationFrame: noop, setTimeout: noop
  });
  vm.runInContext(script, sandbox);
  return code => vm.runInContext(code, sandbox);
}

test('first wave starts with 21 centered enemies, four lives and time to react', () => {
  const run = game();
  run('startGame()');
  assert.equal(run('aliens.length'), 21);
  assert.equal(run('lives'), 4);
  assert.equal(run('Math.min(...aliens.map(a=>a.x))'), 96);
  run('for(let n=0;n<179;n++)tick(n*STEP)');
  assert.equal(run('enemyBullets.length'), 0);
  run('tick(180*STEP)');
  assert.equal(run('enemyBullets.length'), 1);
  assert.equal(run('enemyBullets[0].vy'), 2);
  run('for(let n=0;n<180;n++)tick(n*STEP)');
  assert.equal(run('enemyBullets.length'), 1, 'only one enemy bullet at a time in wave one');
});

test('last enemy stays slow enough and holding fire shoots repeatedly', () => {
  const run = game();
  run('startGame(); aliens.slice(1).forEach(a=>a.alive=false); keys[" "]=true; for(let n=0;n<120;n++)tick(n*STEP)');
  assert.equal(run('alienMoveInterval'), 45);
  assert(run('bullets.length') >= 2);
});

test('a hit removes only one life, clears bullets and gives 1.5 seconds protection', () => {
  const run = game();
  run('startGame(); enemyBullets=Array.from({length:3},()=>({x:player.x+10,y:player.y+5,vy:0})); tick(0)');
  assert.equal(run('lives'), 3);
  assert.equal(run('enemyBullets.length'), 0);
  assert.equal(run('protection'), 90);
  run('enemyBullets=[{x:player.x+10,y:player.y+5,vy:0}]; tick(STEP)');
  assert.equal(run('lives'), 3);
  run('for(let n=0;n<89;n++)tick(n*STEP)');
  assert.equal(run('lives'), 2);
});

test('new waves grow gradually, reset timers, and restart restores the easy first wave', () => {
  const run = game();
  run('startGame(); aliens.forEach(a=>a.alive=false); enemyShotTimer=179; alienMoveTimer=99; tick(0)');
  assert.equal(run('wave'), 2);
  assert.equal(run('aliens.length'), 24);
  assert.equal(run('enemyShotTimer'), 0);
  assert.equal(run('alienMoveTimer'), 0);
  assert.equal(run('enemyBullets.length'), 0);
  assert.equal(run('settings.bulletSpeed'), 2.3);
  run('wave=20; initAliens()');
  assert(run('Math.max(...aliens.map(a=>a.x+ALIEN_W))') <= 480);
  assert(run('settings.minMove') >= 20);
  run('startGame()');
  assert.equal(run('wave'), 1);
  assert.equal(run('score'), 0);
  assert.equal(run('lives'), 4);
  assert.equal(run('aliens.length'), 21);
});

test('movement and shooting use the same pace at 60 and 120 Hz', () => {
  const states = [60,120].map(hz => {
    const run = game();
    run('Math.random=()=>.5; startGame(); keys.ArrowRight=true; keys[" "]=true; loop(0)');
    for(let n=1;n<=hz*4;n++)run(`loop(${n*1000/hz})`);
    return JSON.parse(run('JSON.stringify({x:player.x,shot:lastShot,enemy:enemyBullets.map(b=>b.y),aliens:aliens.map(a=>[a.x,a.y]),ticks:gameTime})'));
  });
  // Floating point accumulation can differ by one simulation tick.
  assert(Math.abs(states[0].ticks-states[1].ticks) <= 1000/60+.001);
  assert.equal(states[0].x,states[1].x);
  assert.deepEqual(states[0].aliens,states[1].aliens);
  assert(Math.abs(states[0].enemy[0]-states[1].enemy[0]) <= 2);
});
