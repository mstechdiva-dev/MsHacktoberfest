// Wash result: score, house note, what happened to each piece (PLAN section 7).
import { esc } from '../util.js';
import { itemSVG, itemLabel } from '../ui/svg.js';
import { arrowIcon } from '../ui/props.js';
import { BIN_LABEL, currentLoad, loadItems, canRewash, houseNote, reach } from '../game.js';

/** Badge for an item after the wash. */
export function badgeFor(i) {
  const st = i.state;
  const trapLike = i.item.kind === 'trap' || i.item.kind === 'pocket';
  if (st.ruined) return ['Ruined', 'bad'];
  if (trapLike && st.removed) return ['Out of the drum', 'mid'];
  if (st.stained) return ['Stained', 'bad'];
  if (st.pink) return ['Pink now', 'mid'];
  if (st.shrunk) return ['Shrunk', 'mid'];
  if (st.stretched) return ['Stretched', 'mid'];
  if (st.teddyFlat) return ['A bit flat', 'mid'];
  if (st.grubby) return ['Still grubby', 'mid'];
  if (st.linted) return ['Linty', 'mid'];
  return ['Clean', ''];
}

export function render(ctx) {
  const { app, save, data, audio, cfg } = ctx;
  const game = save.game;
  const load = currentLoad(game);
  if (!load) { ctx.go('sort'); return null; }
  if (load.status === 'pending') { ctx.go(load.settings ? 'wash' : 'load'); return null; }
  const score = load.washScore ?? 0;
  const items = loadItems(game, load);
  const note = houseNote(ctx, load.lastFacts.length ? load.lastFacts : load.facts);
  const good = score >= cfg.score.goodResult;
  const rewashOk = load.status === 'washed' && canRewash(ctx, load);
  const ringColor = good ? 'var(--ok)' : score >= 50 ? 'var(--warn)' : '#e07a5f';

  app.innerHTML = `<section class="screen center">
  <div>
    <p class="eyebrow">Step 3 · ${esc(BIN_LABEL[load.bin])} load</p>
    <h1>Wash done</h1>
  </div>
  <div class="row-wrap" style="justify-content:center;gap:28px">
    <div class="score-ring" style="background:conic-gradient(${ringColor} ${score * 3.6}deg, var(--card-edge) 0)" role="img" aria-label="Score ${score} out of 100"><div><strong>${score}</strong><span style="font-size:12px;color:var(--muted)">of 100</span></div></div>
    <div class="card" style="max-width:420px;text-align:left"><p class="eyebrow" style="margin:0 0 6px">House note</p><p style="margin:0;font-size:17px">${esc(note)}</p>${load.rewashes ? `<p style="margin:8px 0 0;font-size:13px;color:var(--muted)">Rewashes: ${load.rewashes} of ${cfg.rules.rewashLimit}</p>` : ''}</div>
  </div>
  <div class="items-row">${items.map((i) => {
    const [label, tone] = badgeFor(i);
    return `<div class="result-item">${itemSVG(i.item, data.art[i.item.art], { state: i.state, size: 70 })}<span>${esc(itemLabel(i.item, i.state))}</span><span class="badge ${tone}">${label}</span></div>`;
  }).join('')}</div>
  <div class="row-wrap" style="justify-content:center">
    ${rewashOk ? '<button type="button" class="btn ghost" id="rewash-btn">Rewash</button>' : ''}
    <button type="button" class="btn" id="next-btn">${load.status === 'washed' ? 'Move to dryer' : 'Go to folding'} ${arrowIcon()}</button>
  </div>
</section>`;

  audio.play(good ? 'result-good' : 'result-bad');

  const rw = app.querySelector('#rewash-btn');
  if (rw) rw.addEventListener('click', () => {
    audio.play('ui-click');
    load.rewashing = true;
    load.status = 'pending';
    load.settings = null;
    reach(game, 'load');
    ctx.persist();
    ctx.go('load');
  });
  app.querySelector('#next-btn').addEventListener('click', () => {
    audio.play('ui-click');
    if (load.status === 'washed') { reach(game, 'dry'); ctx.persist(); ctx.go('dry'); }
    else { reach(game, 'fold'); ctx.persist(); ctx.go('fold'); }
  });
}
