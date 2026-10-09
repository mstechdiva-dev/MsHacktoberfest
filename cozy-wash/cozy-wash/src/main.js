// Boot, routing and the step tabs.
import { loadAll } from './data/loader.js';
import { loadSave, writeSave, localDate, clearPlayedOn } from './state.js';
import { createAudio } from './audio/audio.js';
import { initSettings } from './ui/settings.js';
import { caption, toast } from './ui/toast.js';
import { getStatus } from './net/client.js';
import { setPill, signState, isClosed } from './ui/signs.js';
import { focusHeading } from './ui/a11y.js';
import { STEPS, demoAdvance, startDay, currentLoad } from './game.js';
import { esc } from './util.js';
import * as cover from './screens/cover.js';
import * as sort from './screens/sort.js';
import * as load from './screens/load.js';
import * as wash from './screens/wash.js';
import * as result from './screens/result.js';
import * as dry from './screens/dry.js';
import * as fold from './screens/fold.js';
import * as receipt from './screens/receipt.js';
import * as goodbye from './screens/goodbye.js';
import * as closed from './screens/closed.js';

const SCREENS = { cover, sort, load, wash, result, dry, fold, receipt, goodbye, closed };
const TAB_LABEL = { sort: 'Sort', load: 'Load', wash: 'Wash', dry: 'Dry', fold: 'Fold', receipt: 'Receipt' };
const params = new URLSearchParams(location.search);
const host = location.hostname;
const testHost = ['localhost', '127.0.0.1', ''].includes(host) || host.endsWith('.vercel.app');

async function boot() {
  const app = document.getElementById('app');
  let loaded;
  try {
    loaded = await loadAll({ seasonOverride: params.get('season') });
  } catch (err) {
    app.innerHTML = `<div class="screen center"><h1>Cozy Wash couldn't load.</h1><p>${esc(err.message)}</p><p>Serve the folder (for example <code>npx serve .</code>) instead of opening the file directly.</p></div>`;
    return;
  }
  const save = loadSave(loaded.cfg);
  if (params.get('newday') && testHost) clearPlayedOn(save);
  const audio = createAudio({ manifest: loaded.manifest, settings: save.settings, caption });
  save.settings.sound = false; // browsers need a tap first
  let cleanup = null;
  let currentName = null;

  const ctx = {
    app,
    ...loaded,
    save,
    audio,
    status: { mode: 'practice', open: true, reason: 'open', reopensAt: null, gamesToday: null },
    dev: Boolean(params.get('dev')),
    persist: () => writeSave(save),
    today: () => localDate(),
    get practice() { return ctx.status.mode === 'practice' || ctx.dev; },
    go,
    enter,
    refreshStatus,
    setStatus,
    onStatus,
    markBusy,
    updateSign,
    busyUntil: 0,
  };
  window.cozyWash = ctx; // handy for debugging in the console

  const listeners = new Set();
  /** Screens ask to hear about status changes. Returns a function that stops listening. */
  function onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  let lastCheck = Date.now();

  function updateSign() {
    const done = save.playedOn === localDate() && (!save.game || save.game.step === 'receipt' || save.game.date !== localDate());
    setPill(signState(ctx.status, { done, busy: Date.now() < ctx.busyUntil }), loaded.cfg.status.busyMinutes);
  }

  /** The attendant was busy, so the receipt got a house note. The pill says so for a couple of minutes. */
  function markBusy() {
    const ms = loaded.cfg.status.busyMinutes * 60000;
    ctx.busyUntil = Date.now() + ms;
    updateSign();
    setTimeout(updateSign, ms + 100);
  }

  function setStatus(next) {
    const before = ctx.status;
    ctx.status = next;
    if (isClosed(before) && next.open) {
      toast(loaded.templates.signs.reopened, { tone: 'good' });
      audio.play('unlock');
    }
    updateSign();
    listeners.forEach((fn) => fn(next, before));
  }

  async function refreshStatus() {
    const next = await getStatus(loaded.cfg.status.timeoutMs);
    lastCheck = Date.now();
    setStatus(next);
    return ctx.status;
  }

  function renderTabs() {
    const nav = document.getElementById('steps');
    const game = save.game;
    // In a live game the tabs show once you're playing. In Practice mode (or ?dev=1) they show from the cover on,
    // all open, and a demo load is made if there is no game yet.
    const show = (game && !['cover', 'goodbye', 'closed'].includes(currentName)) || (ctx.practice && !['goodbye', 'closed'].includes(currentName));
    nav.hidden = !show;
    if (!show) return;
    const active = currentName === 'result' ? 'wash' : currentName;
    nav.innerHTML = STEPS.map((s, i) => {
      const reached = Boolean(game) && game.reached.includes(s);
      const can = reached || ctx.practice;
      const cls = s === active ? 'tab on' : reached ? 'tab done' : 'tab';
      return can
        ? `<button type="button" class="${cls}" data-step="${s}" ${s === active ? 'aria-current="step"' : ''}>${i + 1} ${TAB_LABEL[s]}</button>`
        : `<span class="${cls}" aria-disabled="true">${i + 1} ${TAB_LABEL[s]}</span>`;
    }).join('');
    nav.querySelectorAll('button[data-step]').forEach((b) => b.addEventListener('click', () => {
      const step = b.dataset.step;
      audio.play('ui-click');
      if (!save.game || !save.game.reached.includes(step)) demoAdvance(ctx, step);
      ctx.persist();
      go(screenForStep(step));
    }));
  }

  function screenForStep(step) {
    const game = save.game;
    if (!game) return 'cover';
    if (step === 'wash') {
      const l = currentLoad(game);
      return l && l.status === 'pending' ? (l.settings ? 'wash' : 'load') : 'result';
    }
    if (step === 'load') return 'load';
    return step;
  }

  let navToken = 0;
  function go(name, opts = {}) {
    if (cleanup) { try { cleanup(); } catch { /* ignore */ } }
    cleanup = null;
    const token = ++navToken;
    audio.stopAll();
    audio.preload(name);
    currentName = name;
    document.body.dataset.screen = name;
    app.innerHTML = '';
    const screen = SCREENS[name];
    const done = screen.render(ctx, opts) || null;
    if (token !== navToken) { if (done) done(); return; } // the screen sent us somewhere else
    cleanup = done;
    renderTabs();
    updateSign();
    window.scrollTo(0, 0);
    if (!opts.noFocus) focusHeading(app);
    if (save.settings.sound && save.settings.roomTone) audio.loop('room-tone', 5800);
  }

  /** The Enter button on the cover. */
  async function enter() {
    const today = localDate();
    if (save.game && save.game.date === today && save.game.step !== 'receipt') {
      go(screenForStep(save.game.step === 'result' ? 'wash' : save.game.step));
      return;
    }
    if (save.playedOn === today) { go('goodbye'); return; }
    await refreshStatus();
    if (!ctx.status.open && ctx.status.mode === 'live') { go('closed'); return; }
    startDay(ctx);
    ctx.persist();
    go('sort');
  }

  initSettings({ save, persist: ctx.persist, audio });
  document.getElementById('brand').addEventListener('click', (e) => { e.preventDefault(); go('cover'); });

  await refreshStatus();
  // Where to start
  const today = localDate();
  const sign = params.get('sign');
  const inProgress = Boolean(save.game && save.game.date === today && save.game.step !== 'receipt');
  if (sign === 'closed' || sign === 'maintenance') go('closed');
  else if (sign === 'reopened') {
    // Show the closed screen, then let it reopen so the toast and the Start button can be seen.
    const closedNow = { ...ctx.status, open: false, reason: 'daily_cap', mode: 'live', override: null };
    ctx.status = closedNow;
    go('closed');
    setTimeout(() => setStatus({ ...closedNow, open: true, reason: 'open', override: 'reopened' }), 1500);
  } else if (sign === 'done') go('goodbye');
  else if (isClosed(ctx.status) && !inProgress && save.playedOn !== today) go('closed');
  else if (save.game && save.game.date === today && save.game.step === 'receipt') go('receipt');
  else if (save.game && save.game.date !== today && save.game.step !== 'receipt') { save.game = null; ctx.persist(); go('cover'); }
  else go('cover');

  // Keep the status fresh while the tab is visible: every few minutes, and again when you come back to the tab.
  const every = loaded.cfg.status.autoCheckMinutes * 60000;
  setInterval(() => { if (document.visibilityState === 'visible') refreshStatus(); }, every);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck >= every) refreshStatus();
  });
}

boot();
