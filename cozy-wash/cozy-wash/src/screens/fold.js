// Fold: tap the numbered points in order, then into the basket (PLAN section 8).
import { esc, reducedMotion, speed } from '../util.js';
import { foldSVG, foldedSVG, itemSVG, itemLabel } from '../ui/svg.js';
import { basket, arrowIcon } from '../ui/props.js';
import { tweenPolygon } from '../engine/fold.js';
import { toast } from '../ui/toast.js';
import { announce } from '../ui/a11y.js';
import { BIN_LABEL, currentLoad, foldQueue, finishLoad, reach } from '../game.js';

export function render(ctx) {
  const { app, save, data, audio } = ctx;
  const game = save.game;
  const load = currentLoad(game);
  if (!load) { ctx.go('sort'); return null; }
  if (load.status === 'pending') { ctx.go(load.settings ? 'wash' : 'load'); return null; }
  if (load.status === 'washed') { ctx.go('dry'); return null; }
  reach(game, 'fold');
  if (!game.fold) game.fold = { done: {}, basket: [] };
  ctx.persist();
  const reduced = reducedMotion(save.settings);
  const queue = foldQueue(game, load);
  let busy = false;
  let cardShown = false;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const k = () => Math.max(speed(), 0.3);

  app.innerHTML = `<section class="screen">
  <div>
    <p class="eyebrow">Step 5 · ${esc(BIN_LABEL[load.bin])} load</p>
    <h1>Fold it</h1>
    <p class="lead">Tap the glowing numbers in order to fold each piece. Then it drops into the basket.</p>
  </div>
  <div class="fold-layout">
    <div><p id="fold-name" style="text-align:center;font-weight:700;margin:0"></p><p id="fold-hint" aria-live="polite" style="text-align:center;margin:2px 0 8px;min-height:1.4em;color:var(--muted);font-size:14px"></p><div class="fold-table" id="table"></div><div class="table-top"></div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px"><p class="eyebrow" id="fold-count" style="margin:0"></p><div id="basket-slot"></div><div id="fold-next"></div></div>
  </div>
</section>`;

  const table = app.querySelector('#table');
  const nextEl = app.querySelector('#fold-next');

  function drawBasket() {
    const stack = game.fold.basket.slice(-9).map((u) => {
      const it = game.instances[u];
      return it ? foldedSVG(it.item, 64 + (u.length % 3) * 6, 18, it.state) : '';
    }).join('');
    app.querySelector('#basket-slot').innerHTML = basket(stack);
    const left = queue.filter((q) => !game.fold.done[q.uid]).length;
    app.querySelector('#fold-count').textContent = left ? `${left} left to fold` : 'All folded';
  }

  /** Slide an element (a finished piece) over to the basket, then call done when it lands. */
  function slideToBasket(el, aroundEl, done) {
    const target = app.querySelector('#basket-slot .basket');
    if (!el || !target || reduced) { done(); return; }
    const a = el.getBoundingClientRect();
    const c = (aroundEl || el).getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    const ms = 420 * k();
    el.style.transformOrigin = `${cx - a.left}px ${cy - a.top}px`;
    el.style.transition = `transform ${ms}ms ease-in, opacity ${ms}ms ease-in`;
    requestAnimationFrame(() => {
      el.style.transform = `translate(${b.left + b.width / 2 - cx}px, ${b.top + 24 - cy}px) scale(.28)`;
      el.style.opacity = '.9';
    });
    later(done, ms + 30);
  }

  function current() { return queue.find((q) => !game.fold.done[q.uid]) || null; }

  function finishPiece(q, toShelf) {
    const it = game.instances[q.uid];
    game.fold.done[q.uid] = true;
    game.counts.folded += q.count;
    if (toShelf) { toast(`${it.item.name} goes on your shelf.`, { tone: 'good' }); }
    else game.fold.basket.push(q.uid);
    audio.play('basket-drop');
    announce(`${it.item.name} ${toShelf ? 'on the shelf' : 'in the basket'}.`);
    ctx.persist();
    draw();
  }

  function drawTable() {
    const q = current();
    const hintEl = app.querySelector('#fold-hint');
    if (!q) { table.innerHTML = ''; app.querySelector('#fold-name').textContent = ''; hintEl.textContent = ''; return; }
    const it = game.instances[q.uid];
    const name = q.count === 2 ? `${itemLabel(it.item, it.state)} (pair)` : itemLabel(it.item, it.state);
    app.querySelector('#fold-name').textContent = name;
    const def = it.item.fold ? data.folds[it.item.fold] : null;
    if (!def) {
      // Sneakers have no fold. After drying they go straight into the basket.
      hintEl.textContent = `${it.item.name} goes straight into the basket.`;
      table.innerHTML = `<div class="no-fold" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${itemSVG(it.item, data.art[it.item.art], { state: it.state, size: 200 })}</div>`;
      announce(hintEl.textContent);
      const piece = table.querySelector('.no-fold');
      later(() => slideToBasket(piece, piece.firstElementChild, () => finishPiece(q, false)), 650 * k());
      return;
    }
    let step = 0;
    // A sock folded without its partner starts with a smoothing step instead of lining up the pair.
    const lone = q.count === 1 && Boolean(it.item.pairId);
    const hintFor = (i) => (i === 0 && lone && def.steps[0].loneHint) || def.steps[i].hint || '';
    const showHint = () => { hintEl.textContent = step < def.steps.length ? `${step + 1}. ${hintFor(step)}` : ''; };
    table.innerHTML = foldSVG(it.item, def.frames[0], { state: it.state }) + def.steps.map((s, i) => `<button type="button" class="fold-pt ${i === 0 ? 'now' : 'wait'}" data-i="${i}" style="left:${s.point[0]}%;top:${s.point[1]}%" aria-label="Fold ${i + 1} of 4: ${esc(hintFor(i))}" ${i === 0 ? '' : 'aria-disabled="true"'}>${esc(s.label || i + 1)}</button>`).join('');
    const poly = table.querySelector('.fold-poly');
    const line = table.querySelector('.fold-line');
    const pts = [...table.querySelectorAll('.fold-pt')];
    // A faint dashed line shows where the next fold happens.
    const guide = (i, opacity) => {
      const s = def.steps[i];
      if (!s || !s.line) { line.setAttribute('opacity', '0'); return; }
      line.setAttribute('x1', s.line[0][0]); line.setAttribute('y1', s.line[0][1]);
      line.setAttribute('x2', s.line[1][0]); line.setAttribute('y2', s.line[1][1]);
      line.setAttribute('opacity', String(opacity));
    };
    guide(0, 0.4);
    pts.forEach((b) => b.addEventListener('click', async () => {
      const i = Number(b.dataset.i);
      if (busy) return;
      if (i !== step) { toast(i > step ? `Tap ${step + 1} first.` : `That one's done. Tap ${step + 1} next.`); return; }
      busy = true;
      const s = def.steps[i];
      guide(i, 1);
      const last = i === def.steps.length - 1;
      let sound = i % 2 ? 'fold-flap-2' : 'fold-flap-1';
      if (def.id === 'socks' && i === 2) sound = 'sock-roll';
      if (def.id === 'smooth') sound = 'fur-smooth';
      audio.play(sound);
      await tweenPolygon(poly, def.frames[i], def.frames[i + 1], (s.ms || 380) * k(), reduced);
      line.setAttribute('opacity', '0');
      b.classList.remove('now'); b.classList.add('ok'); b.setAttribute('aria-disabled', 'true');
      step++;
      showHint();
      busy = false;
      if (step < def.steps.length) {
        const n = pts[step];
        n.classList.remove('wait'); n.classList.add('now'); n.removeAttribute('aria-disabled');
        guide(step, 0.4);
        n.focus();
      } else {
        // The last tap: it settles into its clean finished shape, then slides into the basket.
        const svg = table.querySelector('.fold-svg');
        pts.forEach((p) => { p.style.opacity = '0'; p.style.pointerEvents = 'none'; });
        svg.classList.add('snap');
        const toShelf = Boolean(it.item.shelf);
        later(() => (toShelf ? finishPiece(q, true) : slideToBasket(svg, poly, () => finishPiece(q, false))), 260 * k());
      }
    }));
    showHint();
    pts[0].focus();
  }

  function drawNext() {
    if (current()) { nextEl.innerHTML = ''; cardShown = false; return; }
    const pending = game.loads.findIndex((l) => l !== load && l.status !== 'done');
    const nextLoad = pending === -1 ? null : game.loads[pending];
    const pieces = queue.reduce((n, q) => n + q.count, 0);
    nextEl.innerHTML = `<div class="card load-done" role="status">
  <h2>${nextLoad ? 'Load done' : 'All loads done'}</h2>
  <p>${esc(BIN_LABEL[load.bin])}: ${pieces} ${pieces === 1 ? 'piece' : 'pieces'} in the basket.</p>
  <button type="button" class="btn" id="go-next">${nextLoad ? `Next load: ${esc(BIN_LABEL[nextLoad.bin])}` : 'Print my receipt'} ${arrowIcon()}</button>
</div>`;
    if (!cardShown) { cardShown = true; audio.play('result-good'); announce(nextLoad ? 'Load done.' : 'All loads done. Time for your receipt.'); }
    const btn = nextEl.querySelector('#go-next');
    btn.addEventListener('click', () => {
      audio.play('ui-click');
      const next = finishLoad(game, load);
      if (next === -1) { reach(game, 'receipt'); ctx.persist(); ctx.go('receipt'); }
      else { game.loadIndex = next; game.step = 'load'; ctx.persist(); ctx.go('load'); }
    });
    btn.focus();
  }

  function draw() { drawBasket(); drawTable(); drawNext(); }
  draw();
  if (!queue.length) toast('Nothing to fold from this load.');
  return () => timers.forEach(clearTimeout);
}
