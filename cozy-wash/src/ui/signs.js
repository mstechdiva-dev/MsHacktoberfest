// Header status pill (PLAN section 12).
import { announce } from './a11y.js';
import { doorSign } from './props.js';

const PILL = {
  open: { text: 'Open', dot: 'ok' },
  closed: { text: 'Closed', dot: 'warn' },
  maintenance: { text: 'Closed', dot: 'warn' },
  busy: { text: 'Busy', dot: 'warn' },
  offline: { text: 'Offline', dot: 'muted' },
  practice: { text: 'Practice', dot: 'accent' },
  done: { text: 'See you tomorrow', dot: 'accent' },
};

let current = null;

/** Work out the sign state from the status and the player's day. */
export function signState(status, { done, busy = false }) {
  if (status.override && PILL[status.override]) return status.override;
  if (busy) return 'busy'; // only for the couple of minutes after a receipt fell back to a house note
  if (done) return 'done';
  if (status.mode === 'practice') return 'practice';
  if (status.mode === 'offline') return 'offline';
  if (!status.open) return status.reason === 'maintenance' ? 'maintenance' : 'closed';
  if (status.busy || busy) return 'busy';
  return 'open';
}

/** The words in the header pill. Busy says how long it lasts. */
export function pillText(state, busyMinutes = 2) {
  if (state === 'busy') return `Busy (${busyMinutes} minutes)`;
  return (PILL[state] || PILL.open).text;
}

/** True when the shop is closed to new games (a closed or tidy-up sign from the server). */
export const isClosed = (status) => status.mode === 'live' && !status.open;

/**
 * The Enter button on the cover. A game in progress can always be resumed; a closed shop shows its
 * short sign text and can't start a new one.
 * @returns {{label:string, disabled:boolean}}
 */
export function startButton(status, { inProgress, done }, screens) {
  if (inProgress) return { label: screens.enterButton, disabled: false };
  if (done) return { label: screens.doneButton, disabled: false };
  if (isClosed(status)) return { label: status.reason === 'maintenance' ? screens.maintenanceButton : screens.closedButton, disabled: true };
  return { label: screens.enterButton, disabled: false };
}

/** The lines on the closed screen, from the templates. */
export function closedLines(status, counts, templates, time) {
  const maint = status.reason === 'maintenance';
  const [head, sub = ''] = (maint ? templates.signs.maintenance : templates.signs.closed).split('|');
  const lines = { head, sub: sub.replace('{time}', time || 'midnight'), today: null, you: null };
  if (!maint && status.gamesToday) lines.today = templates.screens.closedToday.replace('{gamesToday}', status.gamesToday);
  const c = counts || {};
  if ((c.washed || 0) + (c.dried || 0) + (c.folded || 0) > 0) {
    lines.you = templates.screens.closedYou.replace('{washed}', c.washed || 0).replace('{dried}', c.dried || 0).replace('{folded}', c.folded || 0);
  }
  return lines;
}

/** Swap the door sign to match the shop, with a flip when it changes. */
export function updateDoorSign(el, open, { audio, flip = true } = {}) {
  if (!el) return;
  const sign = el.querySelector('.door-sign');
  if (sign && sign.classList.contains('is-open') === open) return;
  el.innerHTML = doorSign(open);
  if (flip) {
    const fresh = el.querySelector('.door-sign');
    fresh.classList.add('flip');
    if (audio) audio.play('sign-flip');
    announce(`Door sign: ${open ? 'Open' : 'Closed'}`);
  }
}

export function setPill(state, busyMinutes = 2) {
  const pill = document.getElementById('status-pill');
  if (!pill) return;
  const p = PILL[state] || PILL.open;
  const text = pillText(state, busyMinutes);
  pill.querySelector('.pill-text').textContent = text;
  pill.dataset.dot = p.dot;
  if (current && current !== state) announce(`Cozy Wash status: ${text}`);
  current = state;
  const foot = document.getElementById('practice-note');
  if (foot) foot.hidden = state !== 'practice';
}

/** Local time string for a reopen ISO time. */
export function localTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
