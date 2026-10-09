import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.mjs';
import { signState, pillText, startButton, closedLines, isClosed } from '../src/ui/signs.js';
import { lastLoadPieces } from '../src/screens/closed.js';
import { buildReceipt } from '../src/engine/receipt.js';
import { mockStatus } from '../src/net/mock.js';
import { startDay, flipTile, placeCurrent, buildLoads, finishDay, inst } from '../src/game.js';

const { data, cfg, closet, templates } = setup('fall');
const live = (o = {}) => ({ mode: 'live', open: true, reason: 'open', reopensAt: '2026-10-10T00:00:00.000Z', gamesToday: 37, ...o });

test('every status shows the right pill, in the right order', () => {
  assert.equal(signState(live(), { done: false }), 'open');
  assert.equal(signState(live({ open: false, reason: 'daily_cap' }), { done: false }), 'closed');
  assert.equal(signState(live({ open: false, reason: 'maintenance' }), { done: false }), 'maintenance');
  assert.equal(signState(live({ mode: 'offline' }), { done: false }), 'offline');
  assert.equal(signState(live({ mode: 'practice' }), { done: false }), 'practice');
  assert.equal(signState(live(), { done: false, busy: true }), 'busy');
  assert.equal(signState(live(), { done: true }), 'done', 'finished today wins over open');
  assert.equal(signState(live(), { done: true, busy: true }), 'busy', 'but the busy minutes show first, right after the receipt');
  assert.equal(signState(live({ open: false, reason: 'daily_cap' }), { done: true }), 'done');
  // a failed check on the live site is Offline, never Closed
  assert.equal(signState({ mode: 'offline', open: true, reason: 'offline' }, { done: false }), 'offline');
});

test('every ?sign= override lands on its own pill', () => {
  for (const s of ['closed', 'maintenance', 'busy', 'offline', 'practice', 'done']) {
    assert.equal(signState(mockStatus(s), { done: false }), s, s);
  }
  assert.equal(signState(mockStatus('reopened'), { done: false }), 'open', 'reopened shows Open');
});

test('the busy pill says how long it lasts', () => {
  assert.equal(pillText('busy', cfg.status.busyMinutes), 'Busy (2 minutes)');
  assert.equal(pillText('closed'), 'Closed');
  assert.equal(pillText('maintenance'), 'Closed');
  assert.equal(pillText('done'), 'See you tomorrow');
});

test('the Enter button follows the shop', () => {
  const s = templates.screens;
  const closed = live({ open: false, reason: 'daily_cap' });
  assert.deepEqual(startButton(live(), { inProgress: false, done: false }, s), { label: 'Enter Cozy Wash', disabled: false });
  assert.deepEqual(startButton(closed, { inProgress: false, done: false }, s), { label: 'Closed for today', disabled: true });
  assert.deepEqual(startButton(live({ open: false, reason: 'maintenance' }), { inProgress: false, done: false }, s), { label: 'Closed for a tidy-up', disabled: true });
  assert.deepEqual(startButton(live(), { inProgress: false, done: true }, s), { label: 'See you tomorrow', disabled: false });
  assert.equal(startButton(closed, { inProgress: true, done: false }, s).disabled, false, 'a game in progress always finishes');
  assert.equal(startButton(live({ mode: 'offline' }), { inProgress: false, done: false }, s).disabled, false, 'offline can still start');
  assert.equal(startButton(live({ mode: 'offline' }), { inProgress: false, done: true }, s).label, 'See you tomorrow', 'but not twice in a day');
  assert.ok(isClosed(closed) && !isClosed(live()) && !isClosed(live({ mode: 'practice' })));
});

test('the closed screen says what the plan says', () => {
  const c = closedLines(live({ open: false, reason: 'daily_cap', gamesToday: 50 }), { washed: 9, dried: 7, folded: 6 }, templates, '4:00 PM');
  assert.equal(c.head, 'Cozy Wash is closed for the day.');
  assert.equal(c.sub, "We've washed enough bundles today. Back at 4:00 PM.");
  assert.equal(c.today, 'Today at Cozy Wash: 50 visits finished.');
  assert.equal(c.you, 'You: 9 washed · 7 dried · 6 folded (all-time)');
  const m = closedLines(live({ open: false, reason: 'maintenance', reopensAt: null, gamesToday: 50 }), { washed: 0, dried: 0, folded: 0 }, templates, '');
  assert.equal(m.head, 'Cozy Wash is closed for a quick tidy-up.');
  assert.ok(!/\{|midnight|\d:\d\d/.test(m.sub), `no reopen time while tidying: "${m.sub}"`);
  assert.equal(m.today, null);
  assert.equal(m.you, null, 'no all-time line before the first wash');
});

test('the closed screen washes your last load, or a default one', () => {
  assert.equal(lastLoadPieces({ receipts: [] }, data), null);
  assert.equal(lastLoadPieces({ receipts: [{ title: 'x' }] }, data), null, 'older receipts have no load saved');
  const pieces = lastLoadPieces({ receipts: [{ lastLoad: ['red-sock', 'gen:tee:white:solid:cotton', 'nope'] }] }, data);
  assert.deepEqual(pieces.map((p) => p.item.name), ['Red sock', 'White tee'], 'unknown ids are skipped');
});

test('a busy note shows on the receipt, and the last load is saved with it', () => {
  const day = { loads: [{ bin: 'white', score: 90, facts: [], rewashes: 0, settings: {}, itemIds: ['gen:tee:white:solid:cotton', 'red-sock'] }], counts: { washed: 2, dried: 2, hung: 0, folded: 2 }, trapsCaught: [], pocketsChecked: 0, pocketsTotal: 2, socksPaired: 0, pairsTotal: 1, sheets: 1, paid: { coin: 1, tap: 0 }, rewashes: 0, newCloset: null, lostSocks: [] };
  const plain = buildReceipt(day, templates, { note: 'Fresh.', when: new Date('2026-10-09T15:00:00Z') });
  const busy = buildReceipt(day, templates, { note: 'Fresh.', when: new Date('2026-10-09T15:00:00Z'), busy: true });
  assert.ok(!plain.text.includes(templates.signs.busy));
  assert.ok(busy.text.includes("The attendant is busy, so here's a note from the house."));

  const ctx = { save: { closet: { colors: [...closet.colors], patterns: [...closet.patterns] }, shelf: [], lastDayKeys: [], receipts: [], counts: { washed: 0, dried: 0, hung: 0, folded: 0 }, bests: { bestDayScore: 0, titles: [] }, progress: { cleanStreak: 0 } }, data, cfg, templates };
  const game = startDay(ctx);
  for (const t of game.tiles) {
    if (game.placed[t.uid]) continue;
    flipTile(game, t.uid);
    placeCurrent(game, inst(game, t.uid).item.bin);
    while (game.current) placeCurrent(game, inst(game, game.current).item.bin);
  }
  buildLoads(game);
  const r = finishDay(ctx, 'Nice.', 'fallback', { busy: true });
  assert.ok(r.text.includes('attendant is busy'));
  assert.ok(ctx.save.receipts[0].lastLoad.length > 0, 'the last load is kept for the closed screen');
  assert.ok(ctx.save.receipts[0].lastLoad.every((id) => typeof id === 'string'));
});

// ---- the receipt, word for word
import { receiptStamp, pickTitle } from '../src/engine/receipt.js';
import { paperHTML } from '../src/screens/receipt.js';

const sampleDay = (over = {}) => ({
  loads: [
    { bin: 'white', score: 60, facts: ['bleed', 'rewash_fixed'], rewashes: 1, settings: {}, itemIds: [] },
    { bin: 'color', score: 92, facts: ['clean'], rewashes: 0, settings: {}, itemIds: [] },
    { bin: 'delicate', score: 100, facts: ['fresh'], rewashes: 0, settings: {}, itemIds: [] },
    { bin: 'dark', score: 85, facts: [], rewashes: 0, settings: {}, itemIds: [] },
  ],
  counts: { washed: 14, dried: 12, hung: 2, folded: 14 },
  trapsCaught: [{ id: 'sleepy-cat', name: 'Sleepy cat', short: 'cat' }, { id: 'phone', name: 'Phone', short: 'phone' }, { id: 'crayon', name: 'Crayon', short: 'crayon' }],
  pocketsChecked: 2, pocketsTotal: 2, socksPaired: 1, pairsTotal: 1, sheets: 3, paid: { coin: 3, tap: 2 }, rewashes: 1, newCloset: 'Mustard', lostSocks: [],
  ...over,
});
const printed = (over) => buildReceipt(sampleDay(over), templates, { note: 'Nice job catching the cat before the wash.', when: new Date(2026, 9, 8, 16, 12) });

test('the receipt prints the way the plan shows it', () => {
  const r = printed();
  const lines = r.text.split('\n');
  assert.equal(lines[0], 'COZY WASH');
  assert.equal(lines[1], 'cozywash.app');
  assert.equal(lines[2], 'Thu Oct 08 2026  4:12 PM');
  assert.ok(lines.includes('LOADS' + ' '.repeat(26) + '4'), 'LOADS 4, 32 wide like the plan');
  assert.match(r.text, /^  Whites \.+ 60 \/ 100$/m, 'dotted leader on each load');
  assert.match(r.text, /^  Delicates \.+ 100 \/ 100$/m);
  assert.match(r.text, /^ {4}\(pink, fixed on rewash\)$/m);
  for (const [label, value] of [['Washed', '14'], ['Dried', '12'], ['Hung on rack', '2'], ['Folded', '14'], ['Pockets checked', '2'], ['Traps caught', '3 (cat, phone, crayon)'], ['Socks paired', '1'], ['Rewashes', '1'], ['Dryer sheets', '3'], ['Paid with', 'coin x3, tap x2'], ['New in your closet', 'Mustard']]) {
    assert.match(r.text, new RegExp(`^${label}\\s+${value.replace(/[()]/g, '\\$&')}$`, 'm'), label);
  }
  assert.match(r.text, /^TITLE: /m);
  assert.match(r.text, /Attendant's note:\n"Nice job catching the cat before the wash\."/);
  assert.match(r.text, /Have a nice day!\nThank you for visiting Cozy Wash\.$/);
  for (const line of lines.filter((l) => !l.startsWith('"'))) assert.ok(line.length <= 40, line); // the note is a sentence and wraps on paper
});

test('Hung on rack and Rewashes always print, even at zero', () => {
  const r = printed({ counts: { washed: 3, dried: 3, hung: 0, folded: 3 }, rewashes: 0, loads: [{ bin: 'white', score: 100, facts: ['clean'], rewashes: 0, settings: {}, itemIds: [] }] });
  assert.match(r.text, /^Hung on rack\s+0$/m);
  assert.match(r.text, /^Rewashes\s+0$/m);
  assert.doesNotMatch(r.text, /\(pink/, 'no pink note when nothing bled');
  assert.match(printed({ loads: [{ bin: 'white', score: 70, facts: ['bleed'], rewashes: 0, settings: {}, itemIds: [] }] }).text, /^ {4}\(pink\)$/m);
});

test('the date is written without commas, at any hour', () => {
  assert.equal(receiptStamp(new Date(2026, 9, 8, 16, 12)), 'Thu Oct 08 2026  4:12 PM');
  assert.equal(receiptStamp(new Date(2026, 0, 3, 0, 5)), 'Sat Jan 03 2026  12:05 AM');
  assert.equal(receiptStamp(new Date(2026, 11, 25, 12, 0)), 'Fri Dec 25 2026  12:00 PM');
  assert.doesNotMatch(receiptStamp(new Date()), /,/);
});

test('titles are checked in the plan\'s order, first match wins', () => {
  assert.deepEqual(templates.titles.map((t) => t.rule), ['allPairsMatched', 'bleedHappened', 'catCaught', 'allPocketsChecked', 'allLoadsAbove90', 'noDryerSheets']);
  assert.equal(templates.defaultTitle, 'Laundry Star');
  // everything true at once: the pair wins
  assert.equal(pickTitle(sampleDay({ loads: sampleDay().loads.map((l) => ({ ...l, score: 95 })) }), templates), 'Sock Whisperer');
  assert.equal(pickTitle(sampleDay({ socksPaired: 0 }), templates), 'Pink Load Pro', 'then pink');
  assert.equal(pickTitle(sampleDay({ socksPaired: 0, loads: [{ bin: 'white', score: 70, facts: [], rewashes: 0, settings: {}, itemIds: [] }] }), templates), 'Cat Rescuer');
  assert.equal(pickTitle(sampleDay({ socksPaired: 0, trapsCaught: [], loads: [{ bin: 'white', score: 70, facts: [], rewashes: 0, settings: {}, itemIds: [] }] }), templates), 'Pocket Detective');
  assert.equal(pickTitle(sampleDay({ socksPaired: 0, trapsCaught: [], pocketsChecked: 0, loads: [{ bin: 'white', score: 70, facts: [], rewashes: 0, settings: {}, itemIds: [] }] }), templates), 'Laundry Star');
});

test('the receipt on screen has dotted leaders, a pink note and the words Exit and Copy', () => {
  const html = paperHTML(printed().rows);
  assert.match(html, /<i class="leader"/);
  assert.match(html, /class="sub">\(pink, fixed on rewash\)/);
  assert.equal(templates.screens.exit, 'Exit');
  assert.equal(templates.screens.copy, 'Copy');
  assert.equal(templates.screens.startToday, "Start today's wash");
  const src = readFileSync('src/screens/receipt.js', 'utf8') + readFileSync('src/screens/goodbye.js', 'utf8');
  assert.doesNotMatch(src, /All done \$\{arrowIcon|Copy receipt|Start today's basket/);
});
