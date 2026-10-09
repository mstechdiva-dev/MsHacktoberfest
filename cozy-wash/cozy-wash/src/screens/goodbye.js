// Goodbye: see you tomorrow, countdown, last receipt, closet and shelf (PLAN sections 3 and 14).
import { esc } from '../util.js';
import { neon, arrowIcon } from '../ui/props.js';
import { patternDef } from '../ui/svg.js';
import { localDate } from '../state.js';
import { paperHTML, fillNotes } from './receipt.js';

const untilMidnight = () => {
  const now = new Date();
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  return Math.max(0, mid - now);
};
const hms = (ms) => {
  const s = Math.ceil(ms / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
};

export function render(ctx) {
  const { app, save, data, templates, audio } = ctx;
  const playedToday = save.playedOn === localDate();
  const last = save.receipts && save.receipts[0];
  const lastNew = last && last.rows ? (last.rows.find((r) => Array.isArray(r) && r[0] === 'New in your closet') || [])[1] : null;

  const colorSwatches = save.closet.colors.map((id) => {
    const c = data.colors[id];
    if (!c) return '';
    return `<div class="swatch${lastNew === c.name ? ' new' : ''}"><i style="background:${c.hex || c.color}"></i>${esc(c.name)}</div>`;
  }).join('');
  const patternSwatches = save.closet.patterns.map((id, n) => {
    const p = data.patterns[id];
    if (!p) return '';
    const name = (p.name || id).replace(/^./, (x) => x.toUpperCase());
    const def = patternDef(`gp${n}`, p.svg || id, '#9fc6dd', 1);
    return `<div class="swatch${lastNew === name ? ' new' : ''}"><svg width="40" height="40" aria-hidden="true" style="border-radius:10px;border:1px solid #18394d33"><defs>${def}</defs><rect width="40" height="40" fill="${def ? `url(#gp${n})` : '#9fc6dd'}"/></svg>${esc(name)}</div>`;
  }).join('');

  app.innerHTML = `<section class="screen center">
  ${neon('see you', 'TOMORROW')}
  <h1 style="margin-top:8px">${playedToday ? 'All done for today' : 'Welcome back'}</h1>
  <p class="lead">${esc(playedToday ? templates.screens.goodbye : 'A fresh basket is waiting.')}</p>
  <div id="cd-slot">${playedToday ? `<div class="countdown"><span>Next basket in</span><strong id="cd">${hms(untilMidnight())}</strong></div>` : ''}</div>
  <div class="receipt-wrap" style="width:100%">
    ${last && last.rows ? `<div><p class="eyebrow">Last receipt</p><div class="paper" style="animation:none">${paperHTML(last.rows)}</div></div>` : ''}
    <div style="display:flex;flex-direction:column;gap:18px;max-width:440px;flex:1;text-align:left">
      <div class="card"><h2 style="font-size:20px;margin-bottom:12px">Your closet</h2><div class="swatches">${colorSwatches}${patternSwatches}</div></div>
      <div class="card"><h2 style="font-size:20px;margin-bottom:8px">Your shelf</h2>${save.shelf.length ? `<div class="chips">${save.shelf.map((s) => `<span class="chip">${esc(s.name)}${s.type === 'rescued' ? ' · rescued' : ''}</span>`).join('')}</div>` : '<p style="margin:0;color:var(--muted)">Rescue a trap or fold a teddy to start your shelf.</p>'}</div>
      <div class="card"><h2 style="font-size:20px;margin-bottom:8px">All-time</h2><p style="margin:0">Washed ${save.counts.washed} · Dried ${save.counts.dried} · Folded ${save.counts.folded}${save.bests.bestDayScore ? ` · Best day ${save.bests.bestDayScore}` : ''}</p></div>
    </div>
  </div>
  <div id="start-slot">${playedToday ? '' : `<button type="button" class="btn" id="start-btn">${esc(templates.screens.startToday)} ${arrowIcon()}</button>`}</div>
</section>`;

  if (last && last.rows) fillNotes(app, last.rows);

  const startBtn = () => {
    const b = app.querySelector('#start-btn');
    if (b) b.addEventListener('click', () => { audio.play('ui-click'); ctx.enter(); });
  };
  startBtn();
  let timer = null;
  if (playedToday) {
    timer = setInterval(() => {
      if (localDate() !== save.playedOn) {
        clearInterval(timer);
        app.querySelector('#cd-slot').innerHTML = '<p style="font-weight:700">It\'s a new day.</p>';
        app.querySelector('#start-slot').innerHTML = `<button type="button" class="btn" id="start-btn">${esc(templates.screens.startToday)} ${arrowIcon()}</button>`;
        audio.play('unlock');
        startBtn();
        return;
      }
      const el = app.querySelector('#cd');
      if (el) el.textContent = hms(untilMidnight());
    }, 1000);
  }
  return () => clearInterval(timer);
}
