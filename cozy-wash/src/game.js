// The day's game logic: sorting, loads, washing, drying, folding, receipt (PLAN sections 2–13).
// Screens call these functions; they change ctx.save.game and the caller persists.
import { buildDay } from './engine/pile.js';
import { makeRng } from './engine/rng.js';
import { computeOutcome, applyChanges, computeDry, scoreLoad, needsRewash, freshState, topFact } from './engine/rules.js';
import { buildReceipt, recapPayload, fallbackNote } from './engine/receipt.js';
import { nextUnlock, localDate, updateProgress } from './state.js';

export const BINS = ['white', 'dark', 'color', 'delicate', 'nowash'];
export const BIN_LABEL = { white: 'Whites', dark: 'Darks', color: 'Colors', delicate: 'Delicates', nowash: "Don't wash" };
export const STEPS = ['sort', 'load', 'wash', 'dry', 'fold', 'receipt'];

const isTrapLike = (inst) => inst.item.kind === 'trap' || inst.item.kind === 'pocket';

/** The player's closet plus whatever the active season adds for the day. Not saved. */
export function dayCloset(closet, season) {
  if (!season) return closet;
  const add = (have, extra) => [...have, ...(extra || []).map((x) => x.id).filter((id) => !have.includes(id))];
  return { colors: add(closet.colors, season.colors), patterns: add(closet.patterns, season.patterns) };
}

export function startDay(ctx) {
  const { save, data, cfg } = ctx;
  const date = localDate();
  const day = buildDay(data, cfg, {
    date,
    closet: dayCloset(save.closet, data.season),
    avoid: save.lastDayKeys || [],
    unlocked: save.shelf.filter((s) => s.type === 'unlocked').map((s) => s.id),
  });
  const instances = {};
  for (const t of day.tiles) {
    instances[t.uid] = { uid: t.uid, item: t.item, state: freshState() };
    if (t.pocket) instances[t.pocket.uid] = { uid: t.pocket.uid, item: t.pocket.item, state: freshState(), hostUid: t.uid };
  }
  save.game = {
    date,
    tiles: day.tiles.map((t) => ({ uid: t.uid, pocketUid: t.pocket ? t.pocket.uid : null })),
    instances,
    flipped: {},
    current: null,
    queue: [],
    placed: {},
    bins: Object.fromEntries(BINS.map((b) => [b, []])),
    pocketChecked: {},
    pocketsTotal: day.tiles.filter((t) => t.pocket).length,
    pairsTotal: 1,
    socksPaired: 0,
    trapsCaught: [],
    loads: [],
    loadIndex: null,
    step: 'sort',
    reached: ['sort'],
    sheets: 0,
    paid: { coin: 0, tap: 0 },
    counts: { washed: 0, dried: 0, hung: 0, folded: 0 },
    rewashes: 0,
    fold: null,
    receipt: null,
    tidy: 0,
  };
  return save.game;
}

export const inst = (game, uid) => game.instances[uid];

export function reach(game, step) {
  game.step = step;
  if (!game.reached.includes(step)) game.reached.push(step);
}

/* ---------------- Sorting ---------------- */

export function flipTile(game, uid) {
  if (game.current || game.queue.length || game.flipped[uid]) return false;
  game.flipped[uid] = true;
  game.current = uid;
  return true;
}

export function pocketOf(game, uid) {
  const t = game.tiles.find((x) => x.uid === uid);
  return t && t.pocketUid ? t.pocketUid : null;
}

export function checkPocket(game) {
  const uid = game.current;
  const p = pocketOf(game, uid);
  if (!p || game.pocketChecked[uid]) return null;
  game.pocketChecked[uid] = true;
  game.queue.push(p);
  return inst(game, p);
}

/** Put the revealed item in a bin. Returns what happened, for sounds and messages. */
export function placeCurrent(game, bin) {
  const uid = game.current;
  if (!uid) return null;
  const it = inst(game, uid);
  game.placed[uid] = bin;
  game.bins[bin].push(uid);
  const result = { uid, item: it.item, saved: false, matched: false };
  if (bin === 'nowash' && isTrapLike(it)) {
    game.trapsCaught.push({ id: it.item.id, name: it.item.name });
    game.tidy++;
    result.saved = true;
  }
  if (it.item.pairId) {
    const other = Object.values(game.instances).find((x) => x.uid !== uid && x.item.pairId === it.item.pairId);
    if (other && game.placed[other.uid] === bin && bin !== 'nowash') {
      game.socksPaired = 1;
      it.state.paired = true;
      other.state.paired = true;
      game.tidy++;
      result.matched = true;
    }
  }
  game.current = game.queue.shift() || null;
  return result;
}

export function allSorted(game) {
  return game.tiles.every((t) => game.placed[t.uid]) && !game.current && !game.queue.length;
}

/** Make the loads from the bins once sorting is done. Unchecked pocket contents ride along after their host. */
export function buildLoads(game) {
  if (game.loads.length) return game.loads;
  for (const bin of BINS) {
    if (bin === 'nowash') continue;
    const uids = [];
    for (const uid of game.bins[bin]) {
      uids.push(uid);
      const p = pocketOf(game, uid);
      if (p && !game.pocketChecked[uid]) uids.push(p);
    }
    if (uids.length) game.loads.push({ bin, uids, status: 'pending', settings: null, events: {}, ruinedCount: 0, facts: [], lastFacts: [], rewashes: 0, dry: null, washScore: null, score: null, rewashing: false });
  }
  return game.loads;
}

export const currentLoad = (game) => (game.loadIndex === null ? null : game.loads[game.loadIndex]);
export const loadItems = (game, load) => load.uids.map((u) => inst(game, u));

export function defaultSettings() {
  return { cycle: 'normal', water: 'warm', detergent: 0, softener: 0, bleach: 0, rescue: 0 };
}

/** Set an item aside from the drum (moves it to Don't wash). Catches a trap late. */
export function setAside(game, load, uid) {
  load.uids = load.uids.filter((u) => u !== uid);
  game.placed[uid] = 'nowash';
  game.bins.nowash.push(uid);
  const it = inst(game, uid);
  if (isTrapLike(it) && !game.trapsCaught.some((t) => t.id === it.item.id)) {
    game.trapsCaught.push({ id: it.item.id, name: it.item.name });
    game.tidy = (game.tidy || 0) + 1;
    return true;
  }
  return false;
}

/* ---------------- Washing ---------------- */

export function computeWash(ctx, load) {
  const game = ctx.save.game;
  const idx = game.loads.indexOf(load);
  const rng = makeRng(`${game.date}#L${idx}#R${load.rewashes}${load.rewashing ? 'r' : ''}`);
  return computeOutcome({ bin: load.bin, items: loadItems(game, load) }, { ...load.settings, rewash: load.rewashing }, rng, ctx.cfg);
}

export function applyWash(ctx, load, outcome) {
  const game = ctx.save.game;
  const items = loadItems(game, load);
  if (!load.rewashing) game.counts.washed += items.filter((i) => !isTrapLike(i)).length;
  load.ruinedCount += applyChanges(items, outcome.changes);
  load.events = outcome.events;
  load.lastFacts = outcome.facts;
  load.facts = [...new Set([...load.facts.filter((f) => f !== 'clean'), ...outcome.facts])];
  if (load.facts.length > 1) load.facts = load.facts.filter((f) => f !== 'clean');
  if (load.rewashing) { load.rewashes++; game.rewashes++; }
  load.rewashing = false;
  load.washScore = scoreLoad(load_(game, load), ctx.cfg);
  load.status = 'washed';
}

const load_ = (game, load) => ({ ...load, items: loadItems(game, load) });

export const canRewash = (ctx, load) => needsRewash(load_(ctx.save.game, load), ctx.cfg);

export function houseNote(ctx, facts) {
  const f = topFact(facts, ctx.templates.factPriority);
  const lines = ctx.templates.houseNotes[f] || ctx.templates.houseNotes.clean;
  return lines[Math.floor(Math.random() * lines.length)];
}

/* ---------------- Drying ---------------- */

export function applyDry(ctx, load, { sheet, rackUids }) {
  const game = ctx.save.game;
  const items = loadItems(game, load).filter((i) => !i.state.removed);
  const res = computeDry(items, { sheet, rackUids });
  applyChanges(items, res.changes);
  load.dry = { sheet: res.sheet, rackUids };
  load.facts = [...new Set([...load.facts, ...res.facts])];
  load.lastFacts = res.facts;
  game.counts.dried += items.length - rackUids.length;
  game.counts.hung += rackUids.length;
  if (res.sheet) game.sheets++;
  load.score = scoreLoad(load_(game, load), ctx.cfg);
  load.status = 'dried';
}

/* ---------------- Folding ---------------- */

/** The fold queue for a load: live clothes, with a matched sock pair folded as one. */
export function foldQueue(game, load) {
  const seenPairs = new Set();
  const q = [];
  for (const i of loadItems(game, load)) {
    if (i.state.removed || isTrapLike(i)) continue;
    if (i.item.pairId && i.state.paired) {
      if (seenPairs.has(i.item.pairId)) continue;
      seenPairs.add(i.item.pairId);
      q.push({ uid: i.uid, count: 2 });
    } else q.push({ uid: i.uid, count: 1 });
  }
  return q;
}

export function finishLoad(game, load) {
  load.status = 'done';
  const next = game.loads.findIndex((l) => l.status !== 'done');
  return next;
}

/* ---------------- Receipt ---------------- */

export function daySummary(ctx) {
  const game = ctx.save.game;
  return {
    loads: game.loads.map((l) => ({
      bin: l.bin,
      score: l.score ?? l.washScore ?? 0,
      facts: l.facts,
      rewashes: l.rewashes,
      settings: l.settings || defaultSettings(),
      itemIds: loadItems(game, l).filter((i) => !isTrapLike(i)).map((i) => i.item.id),
    })),
    counts: game.counts,
    trapsCaught: game.trapsCaught.map((t) => ({ ...t, short: t.name.replace(/^Sleepy /, '').toLowerCase() })),
    pocketsChecked: game.tiles.filter((t) => t.pocketUid && game.pocketChecked[t.uid]).length,
    pocketsTotal: game.pocketsTotal,
    socksPaired: game.socksPaired,
    pairsTotal: game.pairsTotal,
    tidy: (game.tidy || 0) * (ctx.cfg.score.tidy ?? 1),
    lostSocks: Object.values(game.instances)
      .filter((i) => i.item.pairId && !i.state.paired && game.placed[i.uid] && game.placed[i.uid] !== 'nowash')
      .map((i) => ({ name: i.item.name, bin: game.placed[i.uid] })),
    sheets: game.sheets,
    paid: game.paid,
    rewashes: game.rewashes,
    newCloset: null,
  };
}

/** Finish the day: unlock, save receipt and counts. Returns the receipt. */
export function finishDay(ctx, note, source, { busy = false } = {}) {
  const { save, cfg, data, templates } = ctx;
  const game = save.game;
  const day = daySummary(ctx);
  const unlock = nextUnlock(save, cfg);
  if (unlock) {
    if (data.colors[unlock]) { save.closet.colors.push(unlock); day.newCloset = data.colors[unlock].name; }
    else if (data.patterns[unlock]) { save.closet.patterns.push(unlock); day.newCloset = (data.patterns[unlock].name || unlock).replace(/^./, (c) => c.toUpperCase()); }
  }
  day.newShelf = updateProgress(save, day.loads, cfg, Object.values(data.items));
  const receipt = buildReceipt(day, templates, { note, when: new Date(), busy });
  game.receipt = { ...receipt, source, newCloset: day.newCloset, newShelf: day.newShelf };
  save.playedOn = game.date;
  const lastLoad = (day.loads[day.loads.length - 1] || { itemIds: [] }).itemIds.slice(0, 8);
  save.receipts = [{ date: game.date, text: receipt.text, title: receipt.title, rows: receipt.rows, lastLoad }, ...(save.receipts || [])].slice(0, 7);
  save.lastDayKeys = game.tiles.map((t) => inst(game, t.uid).item.id);
  for (const k of Object.keys(save.counts)) save.counts[k] += game.counts[k] || 0;
  const avg = day.loads.length ? Math.round(day.loads.reduce((s, l) => s + l.score, 0) / day.loads.length) : 0;
  save.bests.bestDayScore = Math.max(save.bests.bestDayScore || 0, avg + day.tidy);
  if (!save.bests.titles.includes(receipt.title)) save.bests.titles.push(receipt.title);
  for (const t of game.trapsCaught) if (!save.shelf.some((s) => s.id === t.id)) save.shelf.push({ id: t.id, name: t.name, type: 'rescued' });
  for (const l of game.loads) for (const i of loadItems(game, l)) {
    if (i.item.shelf && !i.state.removed && !save.shelf.some((s) => s.id === i.item.id)) save.shelf.push({ id: i.item.id, name: i.item.name, type: 'shelf' });
  }
  reach(game, 'receipt');
  return game.receipt;
}

export { recapPayload, fallbackNote };

/* ---------------- Demo (Practice mode tabs) ---------------- */

/** Fast-forward a fresh game to a step, so every tab can be viewed in Practice mode. */
export function demoAdvance(ctx, step) {
  const { save } = ctx;
  if (!save.game) startDay(ctx);
  const game = save.game;
  const order = STEPS.indexOf(step);
  if (order >= 1 && !allSorted(game)) {
    for (const t of game.tiles) {
      if (game.placed[t.uid]) continue;
      game.current = t.uid;
      if (t.pocketUid) checkPocket(game);
      placeCurrent(game, inst(game, t.uid).item.bin);
      while (game.current) placeCurrent(game, inst(game, game.current).item.bin);
    }
    buildLoads(game);
  }
  if (order >= 1 && game.loadIndex === null) game.loadIndex = 0;
  const load = currentLoad(game);
  if (load && !load.settings) load.settings = { ...defaultSettings(), detergent: 1, cycle: load.bin === 'delicate' ? 'gentle' : 'normal', water: load.bin === 'delicate' ? 'cold' : 'warm' };
  if (load && order >= 3 && load.status === 'pending') { applyWash(ctx, load, computeWash(ctx, load)); game.paid.coin++; }
  if (load && order >= 4 && load.status === 'washed') {
    const rack = loadItems(game, load).filter((i) => !i.state.removed && !i.item.care.dryer).map((i) => i.uid);
    applyDry(ctx, load, { sheet: true, rackUids: rack });
  }
  if (order >= 5) {
    for (const l of game.loads) {
      game.loadIndex = game.loads.indexOf(l);
      if (!l.settings) l.settings = { ...defaultSettings(), detergent: 1 };
      if (l.status === 'pending') { applyWash(ctx, l, computeWash(ctx, l)); game.paid.tap++; }
      if (l.status === 'washed') applyDry(ctx, l, { sheet: true, rackUids: loadItems(game, l).filter((i) => !i.state.removed && !i.item.care.dryer).map((i) => i.uid) });
      if (l.status === 'dried') { game.counts.folded += foldQueue(game, l).reduce((s, q) => s + q.count, 0); l.status = 'done'; }
    }
  }
  game.reached = STEPS.slice(0, order + 1);
  game.step = step;
}
