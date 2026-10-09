// Wash: fill, tumble, drain, spin (PLAN section 7). The outcome is decided at the start and shown at the end.
import { esc, speed, fmtTime, reducedMotion } from '../util.js';
import { machine, drumItems } from '../ui/props.js';
import { announce } from '../ui/a11y.js';
import { bubbles, wireGlass } from '../ui/glass.js';
import { BIN_LABEL, currentLoad, loadItems, computeWash, applyWash, reach } from '../game.js';

const PHASES = [['fill', 'Fill'], ['tumble', 'Tumble'], ['drain', 'Drain'], ['spin', 'Spin']];

export function render(ctx) {
  const { app, save, data, audio, cfg } = ctx;
  const game = save.game;
  const load = currentLoad(game);
  if (!load || !load.settings) { ctx.go('load'); return null; }
  if (load.status !== 'pending') { ctx.go('result'); return null; }
  reach(game, 'wash');
  ctx.persist();

  const rewash = load.rewashing;
  const times = rewash ? cfg.rewashPhases : cfg.washPhases;
  const k = speed();
  const ms = Object.fromEntries(PHASES.map(([id]) => [id, times[id] * 1000 * k]));
  const total = Object.values(ms).reduce((a, b) => a + b, 0);
  const outcome = computeWash(ctx, load);
  const items = loadItems(game, load);
  const reduced = reducedMotion(save.settings);
  const timers = [];
  const later = (fn, t) => timers.push(setTimeout(fn, t));
  let stopSound = null; // the one steady wash sound playing now: fill, then tumble, then drain, then spin
  const steady = (id, every) => { if (stopSound) stopSound(); stopSound = id ? audio.loop(id, every) : null; };
  let cancelled = false;

  app.innerHTML = `<section class="screen center">
  <div>
    <p class="eyebrow">Step 3 · ${esc(BIN_LABEL[load.bin])} ${rewash ? 'rewash' : 'load'}</p>
    <h1>${rewash ? 'Rewashing' : 'Washing'}</h1>
    <p class="lead">${esc(load.settings.water)} water, ${esc(load.settings.cycle)} cycle. Tap the glass for bubbles. Poke a piece to make it tumble differently.</p>
  </div>
  <div class="phases" id="phases" aria-label="Wash phases">${PHASES.map(([id, l], i) => `${i ? '<span class="phase-line"></span>' : ''}<div class="phase" data-phase="${id}"><span class="pdot">${i + 1}</span>${l}</div>`).join('')}</div>
  <div id="big">${machine({
    kind: 'washer', size: 280, display: fmtTime(total / 1000 / k), status: 'RUNNING', spinning: true, water: true,
    waterId: 'wash-water', glassId: 'wash-glass', drumId: 'wash-drum', displayId: 'wash-display', id: 'wash-machine',
    inner: drumItems(items, data, { size: 256, wet: true }),
  })}</div>
</section>`;
  const mEl = app.querySelector('#wash-machine');
  mEl.classList.add('big');
  const water = app.querySelector('#wash-water');
  const drum = app.querySelector('#wash-drum');
  const glass = app.querySelector('#wash-glass');
  const display = app.querySelector('#wash-display');

  const bubble = (n = 1) => bubbles(glass, n, reduced);
  wireGlass(glass, { audio, reduced });

  function setPhase(id) {
    let reached = false;
    app.querySelectorAll('.phase').forEach((p) => {
      const now = p.dataset.phase === id;
      if (now) reached = true;
      p.classList.toggle('now', now);
      p.classList.toggle('done', !reached);
    });
    announce(`${PHASES.find((p) => p[0] === id)[1]}`);
  }

  const start = performance.now();
  const tick = setInterval(() => {
    const left = Math.max(0, total - (performance.now() - start));
    display.textContent = fmtTime(left / 1000 / k);
  }, 250);

  // Fill
  setPhase('fill');
  steady('wash-fill', 3400);
  requestAnimationFrame(() => { water.style.height = '58%'; });
  if (outcome.events.suds) later(() => { bubble(10); }, ms.fill * 0.6);

  // Tumble
  let t = ms.fill;
  later(() => {
    if (cancelled) return;
    setPhase('tumble');
    steady('wash-tumble', 1900);
    if (items.some((i) => i.item.id === 'sneakers' && !i.state.removed)) later(() => audio.play('sneaker-thump'), ms.tumble * 0.2);
    if (outcome.facts.includes('keys_clank') || outcome.facts.includes('coin_clank')) later(() => audio.play('trap-clank'), ms.tumble * 0.35);
    if (items.some((i) => i.item.lint)) later(() => audio.play('tissue-poof'), ms.tumble * 0.5);
    if (outcome.facts.includes('cat_woke')) later(() => audio.play('cat-meow'), ms.tumble * 0.15);
    if (outcome.events.suds) {
      later(() => { audio.play('suds-overflow'); bubble(18); }, ms.tumble * 0.4);
      for (let i = 1; i < 6; i++) later(() => bubble(6), ms.tumble * (0.1 + i * 0.15));
    }
  }, t);
  // Drain
  t += ms.tumble;
  later(() => {
    if (cancelled) return;
    setPhase('drain');
    steady('wash-drain', 3000);
    water.style.height = '0';
  }, t);
  // Spin
  t += ms.drain;
  later(() => {
    if (cancelled) return;
    setPhase('spin');
    steady('wash-spin', 3000);
    drum.classList.add('fast');
    if (!reduced) mEl.classList.add('shaking');
  }, t);
  // Done
  t += ms.spin;
  later(() => {
    if (cancelled) return;
    clearInterval(tick);
    drum.classList.remove('spinning', 'fast');
    mEl.classList.remove('shaking');
    display.textContent = 'DONE';
    app.querySelectorAll('.phase').forEach((p) => { p.classList.remove('now'); p.classList.add('done'); });
    steady(null);
    audio.play('wash-end');
    applyWash(ctx, load, outcome);
    ctx.persist();
    later(() => ctx.go('result'), 600 * Math.max(k, 0.5));
  }, t);

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    clearInterval(tick);
    steady(null);
  };
}
