// Receipt: the day's numbers, a title and the attendant's note (PLAN sections 11 and 13).
import { esc } from '../util.js';
import { arrowIcon } from '../ui/props.js';
import { toast } from '../ui/toast.js';
import { recap } from '../net/client.js';
import { daySummary, finishDay, recapPayload, fallbackNote, reach } from '../game.js';

/** Paper markup for receipt rows. */
export function paperHTML(rows) {
  return rows.map((r, i) => {
    if (r === 'cut') return '<div class="cut" aria-hidden="true"></div>';
    if (Array.isArray(r) && r[2] === 'dots') return `<div class="r"><span>${esc(r[0])}</span><i class="leader" aria-hidden="true"></i><span>${esc(r[1])}</span></div>`;
    if (Array.isArray(r)) return `<div class="r"><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div>`;
    if (r.center) return `<div class="c${r.strong ? ' s' : ''}">${esc(r.center)}</div>`;
    if (r.note) return `<div class="note${r.strong ? ' s' : ''}" data-note="${i}"></div>`;
    return `<div class="${r.sub ? 'sub' : ''}${r.strong ? ' s' : ''}">${esc((r.left || '').trim())}</div>`;
  }).join('');
}

/** The attendant's note comes from the model, so it goes in as text, never as markup. */
export function fillNotes(root, rows) {
  root.querySelectorAll('[data-note]').forEach((el) => { el.textContent = rows[Number(el.dataset.note)].left || ''; });
}

export function render(ctx) {
  const { app, save, audio, templates } = ctx;
  const game = save.game;
  if (!game) { ctx.go('goodbye'); return null; }
  let alive = true;

  app.innerHTML = `<section class="screen center">
  <div>
    <p class="eyebrow">Step 6</p>
    <h1>Your receipt</h1>
  </div>
  <div class="receipt-wrap">
    <div><div class="printer"><span></span></div><div id="paper-slot"><p style="color:var(--muted)">Printing…</p></div></div>
  </div>
  <div class="row-wrap" style="justify-content:center" id="receipt-actions" hidden>
    <button type="button" class="btn ghost" id="copy-btn">${esc(templates.screens.copy)}</button>
    <button type="button" class="btn" id="exit-btn">${esc(templates.screens.exit)} ${arrowIcon()}</button>
  </div>
</section>`;

  function show(receipt, fresh) {
    const slot = app.querySelector('#paper-slot');
    slot.innerHTML = `<div class="paper" role="document" aria-label="Receipt">${paperHTML(receipt.rows)}</div>`;
    fillNotes(slot, receipt.rows);
    app.querySelector('#receipt-actions').hidden = false;
    if (fresh) {
      audio.play('receipt-print');
      if (receipt.newShelf && receipt.newShelf.length) {
        setTimeout(() => { audio.play('unlock'); toast(templates.screens.unlockShelf.replace('{name}', receipt.newShelf.join(', ')), { tone: 'good', ms: 3600 }); }, 3300);
      }
      if (receipt.newCloset) {
        setTimeout(() => { audio.play('unlock'); toast(templates.screens.unlock.replace('{name}', receipt.newCloset), { tone: 'good', ms: 3600 }); }, 1500);
      }
    }
    app.querySelector('#copy-btn').addEventListener('click', async () => {
      audio.play('ui-click');
      try { await navigator.clipboard.writeText(receipt.text); toast('Copied.'); } catch { toast('Copy did not work here.'); }
    });
    app.querySelector('#exit-btn').addEventListener('click', () => {
      audio.play('ui-click');
      save.game = null;
      ctx.persist();
      ctx.go('goodbye');
    });
  }

  if (game.receipt) { show(game.receipt, false); return () => { alive = false; }; }

  reach(game, 'receipt');
  const day = daySummary(ctx);
  const mode = ctx.dev ? 'practice' : ctx.status.mode === 'live' ? 'live' : 'practice';
  recap(recapPayload(day), mode).then((res) => {
    if (!alive) return;
    const fromModel = res && res.source === 'model' && res.headline;
    const note = fromModel ? res.headline : fallbackNote(day, templates);
    const busy = Boolean(res && res.busy && mode === 'live');
    if (busy) ctx.markBusy();
    // The shop closed while they played. Their game still finishes; the next one waits for tomorrow.
    if (res && res.status === 'closed' && mode === 'live') ctx.setStatus({ ...ctx.status, open: false, reason: res.reason === 'maintenance' ? 'maintenance' : 'daily_cap', reopensAt: res.reopensAt || ctx.status.reopensAt });
    const receipt = finishDay(ctx, note, fromModel ? 'model' : 'fallback', { busy });
    ctx.persist();
    ctx.updateSign();
    show(receipt, true);
  });
  return () => { alive = false; };
}
