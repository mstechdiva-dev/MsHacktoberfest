// The cover, from the owner's design: the neon sign, two machines and the Enter button (PLAN section 18a).
import { machine, plant, decorItems, arrowUpRight, arrowDownRight, sparkIcon } from '../ui/props.js';
import { localDate } from '../state.js';
import { startButton, closedLines } from '../ui/signs.js';
import { esc } from '../util.js';

export function render(ctx) {
  const { app, save, status, data } = ctx;
  const today = localDate();
  const inProgress = Boolean(save.game && save.game.date === today && save.game.step !== 'receipt');
  const done = !inProgress && save.playedOn === today;
  const { label, disabled } = startButton(status, { inProgress, done }, ctx.templates.screens);
  const offline = status.mode === 'offline';
  const [offHead, offSub = ''] = ctx.templates.signs.offline.split('|');
  const note = offline
    ? `<div class="status-note" role="status" aria-live="polite"><strong>${esc(offHead)}</strong> <span>${esc(offSub)}</span> <button type="button" class="btn ghost" id="retry-btn">${esc(ctx.templates.screens.retry)}</button></div>`
    : disabled
      ? `<div class="status-note" role="status" aria-live="polite"><strong>${esc(closedLines(status, null, ctx.templates, '').head)}</strong> <button type="button" class="btn ghost" id="peek-btn">${esc(ctx.templates.screens.peek)}</button></div>`
      : '';

  app.innerHTML = `<section class="screen center cover">
  <p class="eyebrow">A little laundry. A lot of cozy.</p>
  <h1>Your clothes, refreshed.<br>Your day, <em>lighter.</em></h1>
  <p class="lead">A fresh spin on laundry day.<br>Settle in, slow down, and let the good cycles roll.</p>
  <div class="scene">
    <a class="neon neon-pink neon-link" href="./" aria-label="${esc(label)}"><strong>cozywash</strong><small>ENTER ${arrowDownRight(12)}</small></a>
    <div class="machines">
      ${machine({ kind: 'washer', size: 211, display: '0:45', status: 'WASHING', spinning: true, water: true, bubbles: true, inner: decorItems('washer', data, { size: 187 }) })}
      ${machine({ kind: 'dryer', size: 211, display: '0:15', status: 'DRYING', spinning: true, inner: decorItems('dryer', data, { size: 187 }) })}
    </div>
    ${plant()}
  </div>
  <div class="actions">
    <button class="btn" type="button" id="enter-btn" ${disabled ? 'disabled' : ''}>${esc(label)} ${arrowUpRight(16)}</button>
    ${note}
    <p class="detail">A cozy laundry game. One basket a day.</p>
  </div>
  <div class="features"><span>${sparkIcon(13)} A satisfying spin</span><span>${sparkIcon(13)} Warm, tumble-dried comfort</span><span>${sparkIcon(13)} Make yourself at home</span></div>
</section>`;
  const go = (e) => {
    if (e) e.preventDefault();
    ctx.audio.play('ui-click');
    ctx.enter();
  };
  app.querySelector('.neon-link').addEventListener('click', go);
  app.querySelector('#enter-btn').addEventListener('click', go);
  const retry = app.querySelector('#retry-btn');
  if (retry) retry.addEventListener('click', async () => {
    ctx.audio.play('ui-click');
    retry.disabled = true;
    await ctx.refreshStatus();
    ctx.go('cover');
  });
  const peek = app.querySelector('#peek-btn');
  if (peek) peek.addEventListener('click', () => { ctx.audio.play('ui-click'); ctx.go('closed'); });
}
