// Sort: flip a tile, read the care tag, pick a bin (PLAN section 4).
import { esc } from '../util.js';
import { itemSVG } from '../ui/svg.js';
import { tileBack, arrowIcon, pocketIcon } from '../ui/props.js';
import { toast } from '../ui/toast.js';
import { announce } from '../ui/a11y.js';
import { BINS, BIN_LABEL, inst, flipTile, pocketOf, checkPocket, placeCurrent, allSorted, buildLoads, reach } from '../game.js';

const hasPocket = (game, uid) => Boolean(pocketOf(game, uid) || inst(game, uid).item.pocket);
const BIN_HINT = { white: 'White and cream', dark: 'Black, navy, gray', color: 'Bright and pastel', delicate: 'Gentle cycle', nowash: 'Not laundry' };

export function render(ctx) {
  const { app, save, data, audio, templates } = ctx;
  const game = save.game;

  app.innerHTML = `<section class="screen">
  <div>
    <p class="eyebrow">Step 1</p>
    <h1>Sort the basket</h1>
    <p class="lead">Flip a tile, read the care tag, then pick a bin. Check pockets before you sort.</p>
  </div>
  <div class="sort-layout">
    <div class="card"><div class="progress" aria-hidden="true"><span id="sort-progress"></span></div><p id="sort-count" class="eyebrow" style="margin:10px 0"></p><div class="grid" id="grid"></div></div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card" id="reveal" aria-live="polite"></div>
      <div class="bins" id="bins"></div>
      <div id="sort-done"></div>
    </div>
  </div>
</section>`;

  const grid = app.querySelector('#grid');
  const reveal = app.querySelector('#reveal');
  const bins = app.querySelector('#bins');
  const doneEl = app.querySelector('#sort-done');

  const art = (it, size) => itemSVG(it.item, data.art[it.item.art], { state: it.state, size });

  function drawGrid() {
    const placedTiles = game.tiles.filter((t) => game.placed[t.uid]).length;
    app.querySelector('#sort-progress').style.width = `${(placedTiles / game.tiles.length) * 100}%`;
    app.querySelector('#sort-count').textContent = `${placedTiles} of ${game.tiles.length} sorted`;
    grid.innerHTML = game.tiles.map((t, i) => {
      if (game.placed[t.uid]) return `<div class="tile gone" aria-hidden="true"></div>`;
      if (game.flipped[t.uid]) return `<div class="tile revealed">${art(inst(game, t.uid), 58)}${hasPocket(game, t.uid) && !game.pocketChecked[t.uid] ? `<span class="pocket-badge" title="Has a pocket">${pocketIcon(16)}</span>` : ''}</div>`;
      return `<button type="button" class="tile down" data-uid="${t.uid}" aria-label="Face-down tile ${i + 1}" tabindex="-1">${tileBack()}</button>`;
    }).join('');
    grid.querySelectorAll('button.tile').forEach((b) => b.addEventListener('click', () => flip(b.dataset.uid)));
    // Only one face-down tile is a tab stop; the arrow keys move between them.
    const stops = [...grid.querySelectorAll('button.tile')];
    const keep = stops.find((b) => b.dataset.uid === cursorUid) || stops[0];
    if (keep) { keep.tabIndex = 0; cursorUid = keep.dataset.uid; }
  }

  let cursorUid = null;
  /** Move the tile cursor with the arrow keys, skipping tiles that are already sorted or flipped. */
  function moveCursor(key) {
    const cols = (ctx.cfg.tiles && ctx.cfg.tiles.columns) || 4;
    const cells = [...grid.children];
    const here = cells.findIndex((c) => c.dataset && c.dataset.uid === cursorUid);
    if (here < 0) return;
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
    let col = here % cols, row = Math.floor(here / cols);
    for (;;) {
      col += step[0]; row += step[1];
      if (col < 0 || col >= cols || row < 0 || row * cols + col >= cells.length) return;
      const cell = cells[row * cols + col];
      if (cell.matches('button.tile')) {
        grid.querySelectorAll('button.tile').forEach((b) => { b.tabIndex = -1; });
        cell.tabIndex = 0;
        cursorUid = cell.dataset.uid;
        cell.focus();
        return;
      }
    }
  }

  function drawReveal() {
    const uid = game.current;
    if (!uid) {
      reveal.innerHTML = allSorted(game)
        ? '<p style="margin:0;font-weight:600">All sorted.</p>'
        : '<p style="margin:0;color:var(--muted)">Pick a face-down tile to see what\'s in the basket.</p>';
      return;
    }
    const it = inst(game, uid);
    const fromPocket = Boolean(it.hostUid);
    const hasPocketHere = hasPocket(game, uid);
    const checked = Boolean(game.pocketChecked[uid]);
    reveal.innerHTML = `<div class="reveal-card">
  <div class="reveal-art">${art(it, 120)}${hasPocketHere && !checked && !fromPocket ? `<button type="button" class="pocket-badge big" id="pocket-icon" aria-label="Check the pocket" title="Check the pocket">${pocketIcon(26)}</button>` : ''}${hasPocketHere && checked && !fromPocket ? `<span class="pocket-badge big done" title="Pocket checked">${pocketIcon(26)}</span>` : ''}</div>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${fromPocket ? '<p class="eyebrow" style="margin:0">Found in the pocket</p>' : ''}
    <h2 style="font-size:24px">${esc(it.item.name)}</h2>
    <div class="care-tag"><strong>CARE TAG</strong>${(it.item.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    ${hasPocketHere && !checked && !fromPocket ? `<button type="button" class="btn ghost" id="pocket-btn">${pocketIcon(18)} Check the pocket</button>` : ''}
    ${checked ? '<p style="margin:0;font-size:13px;color:var(--muted)">Pocket checked.</p>' : ''}
  </div>
</div>`;
    const checkIt = () => {
      audio.play('pocket-rustle');
      const found = checkPocket(game);
      if (found) {
        toast(`Found: ${found.item.name}`);
        announce(`Found in the pocket: ${found.item.name}. Sort this first, then the pocket item.`);
      } else {
        game.pocketChecked[uid] = true;
        toast('Empty pocket.');
      }
      ctx.persist();
      draw();
    };
    reveal.querySelectorAll('#pocket-btn, #pocket-icon').forEach((b) => b.addEventListener('click', checkIt));
  }

  function drawBins() {
    const ready = Boolean(game.current);
    bins.innerHTML = BINS.map((b, i) => `<button type="button" class="bin${ready ? ' ready' : ''}${b === 'nowash' ? ' nowash' : ''}" data-bin="${b}" ${ready ? '' : 'disabled'} aria-label="${BIN_LABEL[b]} (key ${i + 1})">
  <span class="bin-head"><strong>${BIN_LABEL[b]}</strong><span class="eyebrow" aria-hidden="true">${i + 1}</span></span>
  <span style="font-size:12px;color:var(--muted)">${BIN_HINT[b]}</span>
  <span class="chips">${game.bins[b].map((u) => { const x = inst(game, u); return `<span class="chip"><span class="dot" style="background:${x.item.color}"></span>${esc(x.item.name)}</span>`; }).join('')}</span>
</button>`).join('');
    bins.querySelectorAll('button.bin').forEach((b) => b.addEventListener('click', () => place(b.dataset.bin)));
  }

  function drawDone() {
    if (!allSorted(game)) { doneEl.innerHTML = ''; return; }
    const loads = buildLoads(game);
    reach(game, 'load');
    ctx.persist();
    if (!loads.length) {
      doneEl.innerHTML = '<div class="card"><p style="margin-top:0">Nothing to wash today. Off to the receipt.</p><button class="btn" id="to-receipt" type="button">Get my receipt</button></div>';
      doneEl.querySelector('#to-receipt').addEventListener('click', () => { reach(game, 'receipt'); ctx.persist(); ctx.go('receipt'); });
      return;
    }
    doneEl.innerHTML = `<div class="card"><h2 style="font-size:20px;margin-bottom:10px">Ready to wash</h2>
  <div style="display:flex;flex-direction:column;gap:10px">${loads.map((l, i) => `<div class="setting-row"><span><strong>${BIN_LABEL[l.bin]}</strong> · ${l.uids.length} ${l.uids.length === 1 ? 'piece' : 'pieces'}${l.status === 'done' ? ' · done' : ''}</span>${l.status === 'pending' && !l.settings ? `<button type="button" class="btn" data-load="${i}">Wash this load ${arrowIcon()}</button>` : ''}</div>`).join('')}</div></div>`;
    doneEl.querySelectorAll('button[data-load]').forEach((b) => b.addEventListener('click', () => {
      audio.play('ui-click');
      game.loadIndex = Number(b.dataset.load);
      ctx.persist();
      ctx.go('load');
    }));
  }

  function draw() { drawGrid(); drawReveal(); drawBins(); drawDone(); }

  function flip(uid) {
    if (game.current) { toast('Sort the one you\'re holding first.'); return; }
    if (!flipTile(game, uid)) return;
    audio.play('tile-flip');
    if (inst(game, uid).item.id === 'sleepy-cat') setTimeout(() => audio.play('cat-meow'), 260);
    ctx.persist();
    draw();
    announce(`${inst(game, uid).item.name}. Care tag: ${(inst(game, uid).item.tags || []).join(', ')}.`);
    const first = bins.querySelector('button.bin');
    if (first && document.activeElement && document.activeElement.classList.contains('tile')) first.focus();
  }

  function place(bin) {
    const res = placeCurrent(game, bin);
    if (!res) return;
    if (res.saved) {
      audio.play('saved-it');
      toast(res.item.id === 'sleepy-cat' ? templates.screens.catPurr : templates.screens.savedIt, { tone: 'good' });
    } else if (res.matched) {
      audio.play('sock-match');
      toast('Pair matched!', { tone: 'good' });
    } else audio.play('bin-drop');
    announce(`${res.item.name} in ${BIN_LABEL[bin]}.`);
    ctx.persist();
    draw();
    if (allSorted(game)) {
      const btn = doneEl.querySelector('button');
      if (btn) btn.focus();
    } else if (!game.current) {
      const next = grid.querySelector('button.tile');
      if (next) next.focus();
    }
  }

  const onKey = (e) => {
    if (e.target.closest && e.target.closest('input, textarea, dialog')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 5 && game.current) { e.preventDefault(); place(BINS[n - 1]); return; }
    if (e.key.startsWith('Arrow') && !game.current && grid.contains(e.target)) { e.preventDefault(); moveCursor(e.key); }
  };
  document.addEventListener('keydown', onKey);
  draw();
  return () => document.removeEventListener('keydown', onKey);
}
