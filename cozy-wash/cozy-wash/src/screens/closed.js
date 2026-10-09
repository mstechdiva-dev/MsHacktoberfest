// Closed: the amber sign, a washer on an endless loop, Check again, and the way back in (PLAN section 12).
import { esc, speed, reducedMotion } from '../util.js';
import { neon, machine, doorSign, decorItems, drumItems } from '../ui/props.js';
import { closedLines, localTime, updateDoorSign, isClosed } from '../ui/signs.js';
import { wireGlass, bubbles } from '../ui/glass.js';
import { pieceFromId } from '../engine/generate.js';
import { toast } from '../ui/toast.js';
import { announce } from '../ui/a11y.js';

/** The player's last load from their saved receipts, as pieces to draw. Null if there isn't one. */
export function lastLoadPieces(save, data) {
  const ids = ((save.receipts || [])[0] || {}).lastLoad;
  if (!Array.isArray(ids)) return null;
  const pieces = ids.map((id) => pieceFromId(data, id)).filter(Boolean).map((item, i) => ({ uid: `last${i}`, item, state: {} }));
  return pieces.length ? pieces : null;
}

export function render(ctx) {
  const { app, save, data, templates, audio, cfg } = ctx;
  const t = templates.screens;
  const reduced = reducedMotion(save.settings);
  const time = ctx.status.reopensAt ? localTime(ctx.status.reopensAt) : '';
  const lines = closedLines(ctx.status, save.counts, templates, time);
  const maint = ctx.status.reason === 'maintenance';
  const mine = lastLoadPieces(save, data);
  let reopened = false;

  app.innerHTML = `<section class="screen">
  <div class="closed-layout">
    <div style="display:flex;flex-direction:column;gap:18px;align-items:flex-start">
      <div id="closed-neon">${neon('closed', maint ? 'BACK SOON' : 'SEE YOU LATER', 'amber')}</div>
      <div class="closed-lines" id="closed-sign" role="status" aria-live="polite" style="display:flex;flex-direction:column;gap:10px;align-items:flex-start">
        <h1 id="closed-head">${esc(lines.head)}</h1>
        <p class="lead" id="closed-sub">${esc(lines.sub)}</p>
        <p id="closed-today" style="color:var(--muted)" ${lines.today ? '' : 'hidden'}>${esc(lines.today || '')}</p>
        <p id="closed-you" style="color:var(--muted)" ${lines.you ? '' : 'hidden'}>${esc(lines.you || '')}</p>
      </div>
      <div class="row-wrap" id="closed-actions"><button type="button" class="btn" id="check-btn">${esc(t.checkAgain)}</button><span id="door-slot">${doorSign(false)}</span></div>
      <div id="still" role="status" aria-live="polite" hidden style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><strong>${esc(t.stillThere)}</strong><button type="button" class="btn ghost" id="keep-btn">${esc(t.keepListening)}</button></div>
    </div>
    <div id="loop-slot"></div>
  </div>
</section>`;

  // The machine is drawn once and keeps running, so the pieces don't reset every cycle.
  const inner = mine ? drumItems(mine, data, { size: 132, wet: true }) : decorItems('washer', data, { size: 132 });
  app.querySelector('#loop-slot').innerHTML = machine({
    kind: 'washer', display: 'IDLE', status: 'LOOP', spinning: false, water: true, id: 'loop-machine',
    waterId: 'loop-water', glassId: 'loop-glass', drumId: 'loop-drum', displayId: 'loop-display', inner,
  });
  const water = app.querySelector('#loop-water');
  const drum = app.querySelector('#loop-drum');
  const display = app.querySelector('#loop-display');
  const glass = app.querySelector('#loop-glass');
  wireGlass(glass, { audio, reduced });

  // Fill, tumble about three times, drain, spin, and start over. The water moves with the sounds.
  const ph = cfg.washPhases;
  const timers = [];
  let sleepTimer = null;
  let stopLoop = null;
  let asleep = false;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const turn = (mode) => {
    drum.classList.remove('spinning', 'reverse', 'fast');
    if (mode === 'fwd') drum.classList.add('spinning');
    if (mode === 'back') drum.classList.add('spinning', 'reverse');
    if (mode === 'fast') drum.classList.add('spinning', 'fast');
  };
  const level = (pct, ms) => { water.style.transition = `height ${ms}ms ease-in-out`; water.style.height = pct; };
  const stopSound = () => { if (stopLoop) { stopLoop(); stopLoop = null; } };
  const steady = (id, every) => { stopSound(); stopLoop = audio.loop(id, every); };

  function cycle() {
    if (asleep) return;
    const k = speed();
    const ms = (s) => s * 1000 * k;
    let at = 0;
    // Fill
    display.textContent = 'FILL';
    turn(null);
    level('55%', ms(ph.fill));
    steady('wash-fill', 3400);
    at += ms(ph.fill);
    // Tumble: three rounds, turning one way and then the other
    const round = ms(ph.tumble) / 3;
    later(() => steady('wash-tumble', 1900), at);
    for (let n = 0; n < 3; n++) {
      later(() => { display.textContent = 'TUMBLE'; turn(n % 2 ? 'back' : 'fwd'); if (n) bubbles(glass, 3, reduced); }, at + round * n);
    }
    at += ms(ph.tumble);
    // Drain
    later(() => { steady('wash-drain', 3000); display.textContent = 'DRAIN'; turn(null); level('0%', ms(ph.drain)); }, at);
    at += ms(ph.drain);
    // Spin
    later(() => { display.textContent = 'SPIN'; turn('fast'); steady('wash-spin', 3000); }, at);
    at += ms(ph.spin);
    later(() => { stopSound(); audio.play('wash-end'); turn(null); display.textContent = 'IDLE'; }, at);
    later(cycle, at + ms(2));
  }

  // After a while the loop rests so an idle tab doesn't run forever.
  function armSleep() {
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => {
      asleep = true;
      timers.splice(0).forEach(clearTimeout);
      stopSound();
      turn(null);
      level('0%', 400);
      display.textContent = 'IDLE';
      const still = app.querySelector('#still');
      still.hidden = false;
      still.style.display = 'flex';
      announce(t.stillThere);
      app.querySelector('#keep-btn').focus();
    }, cfg.closedLoop.sleepMinutes * 60000 * speed());
  }
  app.querySelector('#keep-btn').addEventListener('click', () => {
    audio.play('ui-click');
    asleep = false;
    app.querySelector('#still').hidden = true;
    cycle();
    armSleep();
  });

  // Check again: ask the server. If it's open the status listener below shows the way in.
  app.querySelector('#check-btn').addEventListener('click', async () => {
    audio.play('ui-click');
    const btn = app.querySelector('#check-btn');
    btn.disabled = true;
    const now = await ctx.refreshStatus();
    const b = app.querySelector('#check-btn');
    if (b) b.disabled = false;
    if (isClosed(now)) { toast(t.stillClosed); announce(t.stillClosed); }
  });

  // When a check finds it open, say so and offer today's wash. Never start a game for them.
  function showReopened() {
    if (reopened) return;
    reopened = true;
    app.querySelector('#closed-neon').innerHTML = neon('open', 'WELCOME BACK', 'pink');
    app.querySelector('#closed-head').textContent = templates.signs.reopened;
    for (const id of ['#closed-sub', '#closed-today', '#closed-you']) app.querySelector(id).hidden = true;
    const doneToday = save.playedOn === ctx.today();
    const actions = app.querySelector('#closed-actions');
    actions.innerHTML = `<button type="button" class="btn" id="start-btn">${esc(doneToday ? t.doneButton : t.startToday)}</button><span id="door-slot">${doorSign(false)}</span>`;
    updateDoorSign(actions.querySelector('#door-slot'), true, { audio });
    const start = actions.querySelector('#start-btn');
    start.addEventListener('click', () => { audio.play('ui-click'); ctx.enter(); });
    start.focus();
  }
  const off = ctx.onStatus((now) => { if (!isClosed(now)) showReopened(); });
  if (!isClosed(ctx.status)) showReopened();

  cycle();
  armSleep();
  return () => {
    off();
    timers.forEach(clearTimeout);
    clearTimeout(sleepTimer);
    stopSound();
  };
}
