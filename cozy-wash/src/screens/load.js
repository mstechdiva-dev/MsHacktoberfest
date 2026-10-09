// Load: pick the cycle, water and caps, check the drum, then pay (PLAN sections 5 and 9).
import { esc, reducedMotion } from '../util.js';
import { machine, drumItems, coinCup, coin, phone, contactless, doorSign, arrowIcon } from '../ui/props.js';
import { setupTapToPay } from '../ui/phone-cursor.js';
import { updateDoorSign, isClosed } from '../ui/signs.js';
import { itemLabel } from '../ui/svg.js';
import { toast } from '../ui/toast.js';
import { announce } from '../ui/a11y.js';
import { BIN_LABEL, currentLoad, loadItems, defaultSettings, setAside, finishLoad, reach } from '../game.js';

const BOTTLES = [
  { id: 'detergent', name: 'Detergent', color: '#4aa3c9' },
  { id: 'softener', name: 'Softener', color: '#c99ad8' },
  { id: 'bleach', name: 'Bleach', color: '#e9eef2' },
  { id: 'rescue', name: 'Stain rescue', color: '#f0a96b' },
];

const bottleSVG = (color) => `<svg width="40" height="62" viewBox="0 0 40 62" aria-hidden="true"><rect x="13" y="2" width="14" height="10" rx="3" fill="#18394d"/><path d="M6 18 Q6 12 14 12 H26 Q34 12 34 18 V56 Q34 60 30 60 H10 Q6 60 6 56 Z" fill="${color}" stroke="#18394d" stroke-width="2"/><rect x="11" y="28" width="18" height="16" rx="3" fill="#ffffffcc"/></svg>`;

export function render(ctx) {
  const { app, save, data, audio, cfg } = ctx;
  const game = save.game;
  if (game.loadIndex === null || !game.loads[game.loadIndex] || game.loads[game.loadIndex].status === 'done') {
    const next = game.loads.findIndex((l) => l.status !== 'done');
    if (next === -1) { ctx.go(game.loads.length ? 'receipt' : 'sort'); return null; }
    game.loadIndex = next;
  }
  const load = currentLoad(game);
  reach(game, 'load');
  ctx.persist();
  const rewash = Boolean(load.rewashing);
  const s = rewash || !load.settings ? defaultSettings() : { ...load.settings };
  let paying = null;
  let holding = false;
  let coinEl = null;
  let loaded = false;
  let started = false;
  const inDrum = new Set();
  const timers = [];

  app.innerHTML = `<section class="screen">
  <div>
    <p class="eyebrow">Step 2 · ${esc(BIN_LABEL[load.bin])} load ${game.loadIndex + 1} of ${game.loads.length}</p>
    <h1>${rewash ? 'Rewash this load' : 'Load the washer'}</h1>
    <p class="lead">${rewash ? 'A second go can lift pink and stains. Bleach and stain rescue help; cold water is kinder.' : 'Set the cycle, water and caps, load the washer, then pay. Tap anything in the drum to take it back out.'}</p>
  </div>
  <div class="load-layout">
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
      <div class="card" style="width:100%">
        <div class="shelf" id="shelf"></div>
        <div class="setting-row" style="margin-top:12px"><span style="font-size:13px;color:var(--muted)">Tap a bottle to add a cap. Tap past the top to reset. The drawer shows what's in.</span><button type="button" class="drawer" id="drawer" aria-label="Detergent drawer. Tap to empty it and start over."></button></div>
      </div>
      <div id="washer-slot" role="button" tabindex="0" aria-label="Washer"></div>
      <div class="card" style="width:100%;display:flex;flex-direction:column;gap:10px;align-items:center">
        <strong id="tray-title"></strong>
        <div class="drum-list" id="drum-list"></div>
        <button type="button" class="btn" id="load-btn">Load the washer</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="setting-row"><strong>Cycle</strong>${seg('cycle', [['normal', 'Normal'], ['gentle', 'Gentle']])}</div>
        <div class="setting-row"><strong>Water</strong>${seg('water', [['cold', 'Cold'], ['warm', 'Warm'], ['hot', 'Hot']])}</div>
      </div>
      <div class="card">
        <div class="setting-row" style="margin-bottom:12px"><strong>Pay</strong><span id="door-slot">${doorSign(!isClosed(ctx.status))}</span></div>
        <p id="pay-hint" style="margin:0 0 10px;font-size:13px;color:var(--muted)"></p>
        <div class="pay-area locked" id="pay-area">
          <button type="button" class="coin-cup" id="coin-cup" aria-label="Coin cup. Pick up a coin.">${coinCup()}</button>
          <button type="button" class="coin-slot" id="coin-slot" aria-label="Coin slot. Press to drop the coin in."><span></span></button>
          <span style="color:var(--muted);font-weight:600">or</span>
          <button type="button" class="phone-btn" id="phone-btn" aria-label="Phone. Press Enter to pick it up.">${phone(false)}</button>
          <div class="reader" id="reader" tabindex="0" role="button" aria-label="Tap to pay reader">${contactless()}<span class="reader-label">TAP TO PAY</span></div>
        </div>
      </div>
    </div>
  </div>
</section>`;

  function seg(key, opts) {
    return `<div class="seg" role="group" aria-label="${key}">${opts.map(([v, l]) => `<button type="button" data-key="${key}" data-val="${v}" aria-pressed="${s[key] === v}">${l}</button>`).join('')}</div>`;
  }

  app.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    s[b.dataset.key] = b.dataset.val;
    audio.play('dial-click');
    app.querySelectorAll(`.seg button[data-key="${b.dataset.key}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    drawWasher();
  }));

  function drawWasher() {
    const items = loadItems(game, load);
    const live = items.filter((i) => !i.state.removed);
    const inside = live.filter((i) => inDrum.has(i.uid));
    app.querySelector('#washer-slot').innerHTML = machine({
      kind: 'washer', size: 210, open: true, display: s.water.toUpperCase(), status: s.cycle.toUpperCase(),
      inner: drumItems(inside, data, { size: 186 }),
    });
    app.querySelectorAll('#washer-slot .drum-item[data-uid]').forEach((el) => el.addEventListener('click', (e) => {
      if (holding) return; // with a coin in hand, a tap on the washer pays
      e.stopPropagation();
      takeOut(el.dataset.uid);
    }));

    const staged = live.filter((i) => !inDrum.has(i.uid));
    app.querySelector('#tray-title').textContent = loaded ? 'In the drum. Tap one to take it back out.' : 'Beside the washer';
    const list = app.querySelector('#drum-list');
    const chip = (i, label) => `<button type="button" data-uid="${i.uid}" title="${label}"><span class="dot swatch-dot" style="background:${i.item.color}"></span>${esc(itemLabel(i.item, i.state))} <span aria-hidden="true">✕</span><span class="sr-only">${label}</span></button>`;
    list.innerHTML = live.length
      ? [...inside.map((i) => chip(i, 'take back out of the drum')), ...staged.map((i) => chip(i, 'set aside'))].join('')
      : '<p style="margin:0;color:var(--muted)">The washer is empty.</p>';
    list.querySelectorAll('button[data-uid]').forEach((b) => b.addEventListener('click', () => takeOut(b.dataset.uid)));
    const btn = app.querySelector('#load-btn');
    btn.disabled = loaded || !staged.length || loading;
    btn.textContent = loaded ? 'Washer loaded' : 'Load the washer';
    app.querySelector('#washer-slot').setAttribute('aria-label', loaded ? 'Washer, loaded. Press Enter to pay with the coin in your hand.' : 'Washer. Load it first.');
  }

  // Take a piece back out. A trap goes to Don't wash and counts as saved; anything else goes back to its bin.
  function takeOut(uid) {
    if (started) return;
    const it = game.instances[uid];
    const caught = setAside(game, load, uid);
    inDrum.delete(uid);
    if (caught) { audio.play(it.item.id === 'sleepy-cat' ? 'cat-meow' : 'saved-it'); toast(ctx.templates.screens.savedIt, { tone: 'good' }); }
    else { audio.play('bin-drop'); toast(`${it.item.name} taken back out.`); }
    announce(`${it.item.name} taken back out.`);
    ctx.persist();
    if (!load.uids.length) emptyLoad(); else drawWasher();
  }

  // Load: the pieces drop into the drum one by one.
  let loading = false;
  function loadDrum() {
    if (loading || loaded) return;
    const live = loadItems(game, load).filter((i) => !i.state.removed && !inDrum.has(i.uid));
    if (!live.length) return;
    loading = true;
    audio.play('door-open');
    live.forEach((i, n) => timers.push(setTimeout(() => {
      inDrum.add(i.uid);
      audio.play('drum-drop');
      drawWasher();
      if (n === live.length - 1) {
        loading = false;
        loaded = true;
        unlockPay();
        drawWasher();
        announce('Washer loaded. Now pay with a coin or your phone.');
        app.querySelector('#coin-cup').focus();
      }
    }, 150 + n * 170)));
    drawWasher();
  }
  app.querySelector('#load-btn').addEventListener('click', loadDrum);

  function unlockPay() {
    app.querySelector('#pay-area').classList.remove('locked');
    app.querySelector('#pay-area').inert = false;
    app.querySelector('#pay-hint').textContent = 'Take a coin and tap the washer, or tap your phone on the reader.';
  }

  function drawShelf() {
    const shelf = app.querySelector('#shelf');
    shelf.innerHTML = BOTTLES.map((b) => `<button type="button" class="bottle" data-id="${b.id}" aria-label="${b.name}: ${s[b.id]} of ${cfg.dosing[b.id]} caps">${bottleSVG(b.color)}<span>${b.name}</span><span class="caps">${Array.from({ length: cfg.dosing[b.id] }, (_, i) => `<span class="cap${i < s[b.id] ? ' on' : ''}"></span>`).join('')}</span></button>`).join('');
    shelf.querySelectorAll('.bottle').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      s[id] = s[id] >= cfg.dosing[id] ? 0 : s[id] + 1;
      audio.play(s[id] ? (id === 'rescue' ? 'pour-powder' : 'pour-liquid') : 'ui-click');
      drawShelf();
      shelf.querySelector(`.bottle[data-id="${id}"]`).focus();
    }));
    const drawer = app.querySelector('#drawer');
    drawer.innerHTML = BOTTLES.flatMap((b) => Array.from({ length: s[b.id] }, () => `<span style="background:${b.color}"></span>`)).join('');
  }
  app.querySelector('#drawer').addEventListener('click', () => {
    BOTTLES.forEach((b) => { s[b.id] = 0; });
    audio.play('pour-liquid', { volume: 0.35 });
    drawShelf();
  });

  function emptyLoad() {
    const next = finishLoad(game, load);
    ctx.persist();
    toast('Nothing left to wash in this load.');
    if (next === -1) ctx.go('receipt');
    else { game.loadIndex = next; ctx.go('load'); }
  }

  function pay(method, { closeAt = 60, goAt = 310 } = {}) {
    if (started) return;
    if (!loaded) { toast('Load the washer first.'); return; }
    if (!loadItems(game, load).some((i) => !i.state.removed)) { emptyLoad(); return; }
    started = true;
    load.settings = { ...s };
    game.paid[method]++;
    reach(game, 'wash');
    ctx.persist();
    timers.push(setTimeout(() => audio.play('door-close'), closeAt));
    timers.push(setTimeout(() => ctx.go('wash'), goAt));
  }

  // Coins: take one from the cup, then tap the machine. Tapping anywhere else puts it back.
  const area = app.querySelector('#pay-area');
  area.inert = true;
  app.querySelector('#pay-hint').textContent = 'Load the washer first. Then pay.';
  const washerSlot = app.querySelector('#washer-slot');
  const follow = (e) => { if (coinEl) { coinEl.style.left = `${e.clientX}px`; coinEl.style.top = `${e.clientY}px`; } };
  const dropCoin = () => {
    if (coinEl) { coinEl.remove(); coinEl = null; }
    holding = false;
    area.classList.remove('holding-coin');
    washerSlot.classList.remove('accepts-coin');
  };
  app.querySelector('#coin-cup').addEventListener('click', (e) => {
    if (holding) return;
    holding = true;
    audio.play('coin-grab');
    area.classList.add('holding-coin');
    washerSlot.classList.add('accepts-coin');
    coinEl = document.createElement('div');
    coinEl.className = 'coin-hand';
    coinEl.innerHTML = coin(28);
    document.body.appendChild(coinEl);
    follow(e);
    announce('Coin in hand. Press the washer to drop it in.');
  });
  function dropCoinInMachine() {
    if (!holding) { toast('Grab a coin from the cup first.'); return; }
    dropCoin();
    audio.play('coin-drop');
    timers.push(setTimeout(() => audio.play(`coin-clink-${1 + Math.floor(Math.random() * 3)}`), 140));
    timers.push(setTimeout(() => audio.play('coin-start'), 520));
    pay('coin', { closeAt: 760, goAt: 1150 });
  }
  app.querySelector('#coin-slot').addEventListener('click', dropCoinInMachine);
  washerSlot.addEventListener('click', (e) => { if (holding) { e.stopPropagation(); dropCoinInMachine(); } });
  washerSlot.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target !== washerSlot) return;
    e.preventDefault();
    if (holding) dropCoinInMachine(); else toast(loaded ? 'Press Enter on the coin cup to take a coin first.' : 'Load the washer first.');
  });
  const putCoinBack = (e) => {
    if (!holding || e.target.closest('#coin-cup, #coin-slot, #washer-slot')) return;
    dropCoin();
    audio.play('coin-grab');
    announce('Coin put back in the cup.');
  };
  document.addEventListener('click', putCoinBack);
  window.addEventListener('pointermove', follow);

  // Phone: tap to pay.
  paying = setupTapToPay({
    area,
    reader: app.querySelector('#reader'),
    phoneEl: app.querySelector('#phone-btn'),
    holdMs: cfg.pay.tapHoldMs,
    glitchChance: cfg.pay.tapGlitchChance,
    play: (id) => audio.play(id),
    reduced: reducedMotion(save.settings),
    onPaid: () => { audio.play('coin-start'); pay('tap'); },
  });

  drawWasher();
  drawShelf();
  audio.play('door-open');
  // The door sign swings over when the shop opens or closes.
  const offStatus = ctx.onStatus((now) => updateDoorSign(app.querySelector('#door-slot'), !isClosed(now), { audio }));

  return () => {
    offStatus();
    timers.forEach(clearTimeout);
    document.removeEventListener('click', putCoinBack);
    window.removeEventListener('pointermove', follow);
    dropCoin();
    if (paying) paying.cleanup();
  };
}
