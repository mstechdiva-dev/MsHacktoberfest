// Dry: wet clothes come out of the open washer, go to the dryer or the rack, one sheet, then start (PLAN section 7a).
import { esc, speed, fmtTime } from '../util.js';
import { itemSVG, itemLabel } from '../ui/svg.js';
import { machine, drumItems, rackSVG, sheetBox, arrowIcon } from '../ui/props.js';
import { draggable } from '../ui/drag.js';
import { toast } from '../ui/toast.js';
import { announce } from '../ui/a11y.js';
import { BIN_LABEL, currentLoad, loadItems, applyDry, reach } from '../game.js';

export function render(ctx) {
  const { app, save, data, audio, cfg, templates } = ctx;
  const game = save.game;
  const load = currentLoad(game);
  if (!load) { ctx.go('sort'); return null; }
  if (load.status === 'pending') { ctx.go(load.settings ? 'wash' : 'load'); return null; }
  if (load.status !== 'washed') { ctx.go('fold'); return null; }
  reach(game, 'dry');
  ctx.persist();

  const live = loadItems(game, load).filter((i) => !i.state.removed);
  const where = Object.fromEntries(live.map((i) => [i.uid, null]));
  let sheet = false;
  let running = false;
  let done = false;
  let doorOpen = true;
  const timers = [];
  let stopTumble = null;
  let tick = null;

  app.innerHTML = `<section class="screen">
  <div>
    <p class="eyebrow">Step 4 · ${esc(BIN_LABEL[load.bin])} load</p>
    <h1>Dry it</h1>
    <p class="lead">Drag each piece out of the washer to the dryer or the rack, or use its buttons. Hang dry pieces go on the rack. Add a sheet if you like.</p>
  </div>
  <div class="dry-stage">
    <div id="washer-slot" class="washer-open" aria-label="Washer, open"></div>
    <div class="dryer-wrap">
      <div class="sheet-top"><button type="button" class="sheet-btn" id="sheet-btn" aria-label="Dryer sheets. Add one.">${sheetBox()}</button><span id="sheet-text" style="font-size:12px;font-weight:600;color:var(--muted)">No sheet yet</span></div>
      <div class="drop" id="dryer-drop" aria-label="Dryer"><div id="dryer-slot"></div><div class="mini-drop" id="dryer-mini"></div></div>
    </div>
    <div class="drop rack" id="rack-drop" aria-label="Drying rack">${rackSVG()}<div class="on-rack" id="rack-mini"></div></div>
  </div>
  <div class="wet-list" id="wet-list"></div>
  <div class="row-wrap" style="justify-content:center">
    <button type="button" class="btn ghost" id="all-btn">Move all</button>
    <button type="button" class="btn" id="start-btn" disabled>Close the door and start ${arrowIcon()}</button>
  </div>
</section>`;

  const dryerDrop = app.querySelector('#dryer-drop');
  const rackDrop = app.querySelector('#rack-drop');
  const targets = () => [dryerDrop, rackDrop];

  function drawWasher() {
    const wet = live.filter((i) => !where[i.uid]);
    app.querySelector('#washer-slot').innerHTML = machine({ kind: 'washer', size: 170, open: true, display: 'DONE', status: 'OPEN', inner: drumItems(wet, data, { size: 146, wet: true }) });
    app.querySelectorAll('#washer-slot .drum-item[data-uid]').forEach((el) => {
      const uid = el.dataset.uid;
      draggable(el, { targets, onDrop: (t) => put(uid, t === rackDrop ? 'rack' : 'dryer') });
    });
  }

  function drawDryer({ spinning = false, display = fmtTime(cfg.dryerSeconds), status } = {}) {
    const inDryer = live.filter((i) => where[i.uid] === 'dryer');
    app.querySelector('#dryer-slot').innerHTML = machine({
      kind: 'dryer', size: 170, display, displayId: 'dry-display', drumId: 'dry-drum', spinning, open: doorOpen,
      status: status || (running ? 'DRYING' : 'READY'),
      inner: drumItems(inDryer, data, { size: 146, wet: !done, fluffy: done }),
    });
  }

  function draw() {
    if (running) return;
    drawWasher();
    drawDryer();
    const small = (i) => itemSVG(i.item, data.art[i.item.art], { state: i.state, size: 38 });
    app.querySelector('#dryer-mini').innerHTML = live.filter((i) => where[i.uid] === 'dryer').map((i) => `<button type="button" class="sheet-btn" data-back="${i.uid}" title="Take ${esc(itemLabel(i.item, i.state))} back out" aria-label="Take ${esc(itemLabel(i.item, i.state))} back out of the dryer">${small(i)}</button>`).join('');
    app.querySelector('#rack-mini').innerHTML = live.filter((i) => where[i.uid] === 'rack').map((i) => `<button type="button" class="sheet-btn" data-back="${i.uid}" title="Take ${esc(itemLabel(i.item, i.state))} down" aria-label="Take ${esc(itemLabel(i.item, i.state))} down from the rack">${small(i)}</button>`).join('');
    app.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { where[b.dataset.back] = null; audio.play('drum-drop'); draw(); }));
    const wet = live.filter((i) => !where[i.uid]);
    const list = app.querySelector('#wet-list');
    list.innerHTML = wet.length ? wet.map((i) => `<div class="wet-item" data-uid="${i.uid}">
  ${itemSVG(i.item, data.art[i.item.art], { state: i.state, size: 56, wet: true })}
  <span>${esc(itemLabel(i.item, i.state))}</span>
  ${i.item.care.dryer ? '' : '<span class="badge mid">Hang dry</span>'}
  <span class="row-wrap" style="gap:4px;justify-content:center"><button type="button" class="chip" data-to="dryer">Dryer</button><button type="button" class="chip" data-to="rack">Rack</button></span>
</div>`).join('') : '<p style="margin:0;color:var(--muted)">Everything is out of the washer. Close the door and press Start.</p>';
    list.querySelectorAll('.wet-item').forEach((el) => {
      const uid = el.dataset.uid;
      el.querySelectorAll('button[data-to]').forEach((b) => {
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('click', () => put(uid, b.dataset.to));
      });
      draggable(el, { targets, onDrop: (t) => put(uid, t === rackDrop ? 'rack' : 'dryer') });
    });
    app.querySelector('#start-btn').disabled = Boolean(wet.length) || running;
    app.querySelector('#all-btn').disabled = !wet.length || running;
  }

  function put(uid, to) {
    where[uid] = to;
    audio.play(to === 'rack' ? 'rack-hang' : 'drum-drop');
    announce(`${itemLabel(game.instances[uid].item, game.instances[uid].state)} on the ${to === 'rack' ? 'rack' : 'dryer'}.`);
    draw();
    const next = app.querySelector('#wet-list .chip');
    if (next) next.focus(); else app.querySelector('#start-btn').focus();
  }

  // Move all: everything to the dryer, except Hang dry pieces, which go on the rack.
  app.querySelector('#all-btn').addEventListener('click', () => {
    let racked = false;
    live.forEach((i) => {
      if (where[i.uid]) return;
      where[i.uid] = i.item.care.dryer ? 'dryer' : 'rack';
      if (!i.item.care.dryer) racked = true;
    });
    audio.play('drum-drop');
    if (racked) audio.play('rack-hang');
    announce(racked ? 'Everything moved. Hang dry pieces are on the rack.' : 'Everything is in the dryer.');
    draw();
    app.querySelector('#start-btn').focus();
  });

  // One sheet is plenty. Drag it into the dryer, or tap the box.
  const sheetBtn = app.querySelector('#sheet-btn');
  function addSheet() {
    if (running || done) return;
    if (sheet) {
      sheetBtn.classList.remove('bounce');
      void sheetBtn.offsetWidth;
      sheetBtn.classList.add('bounce');
      toast(templates.screens.oneSheet);
      return;
    }
    sheet = true;
    audio.play('sheet-pull');
    app.querySelector('#sheet-text').textContent = '1 sheet in';
    announce('One dryer sheet in the dryer.');
  }
  sheetBtn.addEventListener('click', addSheet);
  draggable(sheetBtn, { targets: () => [dryerDrop], onDrop: addSheet });

  // Sparkles with a sheet; static cling and a zap without one.
  function decorateDone(inDryer) {
    if (!inDryer) return;
    const glass = app.querySelector('#dryer-slot .glass');
    if (!glass) return;
    if (sheet) {
      glass.insertAdjacentHTML('beforeend', `<div class="sparkles" aria-hidden="true">${'<i></i>'.repeat(6)}</div>`);
      announce('Fresh and fluffy.');
      return;
    }
    glass.insertAdjacentHTML('beforeend', '<div class="zap-flash" aria-hidden="true"></div>');
    const spans = [...glass.querySelectorAll('.drum-item')];
    const socks = spans.filter((s) => s.dataset.art === 'sock');
    const host = spans.find((s) => s.dataset.art !== 'sock');
    if (host) {
      const h = host.getBoundingClientRect();
      socks.forEach((s, n) => {
        const r = s.getBoundingClientRect();
        s.style.transition = 'translate .5s ease';
        s.style.translate = `${h.left - r.left + 8 + n * 6}px ${h.top - r.top + 10 + n * 4}px`;
        s.classList.add('cling');
      });
      if (socks.length) host.classList.add('cling');
    }
    announce('Static cling. A little zap.');
  }

  app.querySelector('#start-btn').addEventListener('click', () => {
    if (running) return;
    running = true;
    doorOpen = false;
    app.querySelector('#start-btn').disabled = true;
    app.querySelector('#all-btn').disabled = true;
    const rackUids = live.filter((i) => where[i.uid] === 'rack').map((i) => i.uid);
    const inDryer = live.length - rackUids.length;
    const total = inDryer ? cfg.dryerSeconds * 1000 * speed() : 300;
    const rack = app.querySelector('#rack-mini');
    const finish = () => {
      if (stopTumble) stopTumble();
      clearInterval(tick);
      rack.classList.remove('sway');
      applyDry(ctx, load, { sheet: sheet && inDryer > 0, rackUids });
      reach(game, 'fold');
      ctx.persist();
      if (inDryer) {
        audio.play('dryer-end');
        done = true;
        doorOpen = true;
        drawDryer({ display: 'DONE', status: 'DONE' });
        timers.push(setTimeout(() => audio.play('door-open'), 250));
        timers.push(setTimeout(() => {
          decorateDone(inDryer);
          if (!sheet) { audio.play('static-zap'); toast('Zap! A little static without a sheet.'); }
        }, 600));
      }
      if (load.facts.includes('dryer_shrunk')) toast('Something shrank in the dryer.');
      timers.push(setTimeout(() => ctx.go('fold'), (inDryer ? 2400 : 900) * Math.max(speed(), 0.5)));
    };
    audio.play('door-close');
    if (!inDryer) { finish(); return; }
    drawDryer({ spinning: true, display: fmtTime(cfg.dryerSeconds) });
    rack.classList.add('sway');
    timers.push(setTimeout(() => {
      audio.play('dryer-start');
      stopTumble = audio.loop('dryer-tumble', 2200);
    }, 350));
    const start = performance.now();
    tick = setInterval(() => {
      const el = app.querySelector('#dry-display');
      if (el) el.textContent = fmtTime(Math.max(0, total - (performance.now() - start)) / 1000 / speed());
    }, 250);
    timers.push(setTimeout(finish, total));
  });

  draw();
  // The washer door and the dryer door swing open.
  timers.push(setTimeout(() => audio.play('door-open'), 150));
  timers.push(setTimeout(() => audio.play('door-open'), 600));
  return () => {
    timers.forEach(clearTimeout);
    clearInterval(tick);
    if (stopTumble) stopTumble();
  };
}
