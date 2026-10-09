import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.mjs';
import { computeOutcome, applyChanges, computeDry, scoreLoad, needsRewash, freshState, topFact } from '../src/engine/rules.js';
import { namedPiece, makePiece } from '../src/engine/generate.js';
import { buildReceipt, pickTitle, recapPayload, fallbackNote } from '../src/engine/receipt.js';

const { data, cfg, templates } = setup();
let n = 0;
const inst = (item) => ({ uid: `u${n++}`, item, state: freshState() });
const always = { next: () => 0 };
const never = { next: () => 0.9999 };
const S = (o = {}) => ({ cycle: 'normal', water: 'warm', detergent: 1, softener: 0, bleach: 0, rescue: 0, ...o });
const piece = (g, c, p = 'solid', f = 'cotton') => makePiece(data, g, c, p, f);

test('a clean load stays clean and scores 100', () => {
  const items = [inst(piece('tee', 'blue')), inst(piece('sweatpants', 'green'))];
  const out = computeOutcome({ bin: 'color', items }, S(), never, cfg);
  assert.deepEqual(out.facts, ['clean']);
  applyChanges(items, out.changes);
  assert.equal(scoreLoad({ items, ruinedCount: 0, events: out.events }, cfg), 100);
});

test('a red sock turns the whites pink', () => {
  const items = [inst(piece('tee', 'white')), inst(namedPiece(data, 'red-sock'))];
  const out = computeOutcome({ bin: 'white', items }, S({ water: 'hot' }), always, cfg);
  assert.ok(out.facts.includes('bleed'));
  applyChanges(items, out.changes);
  assert.equal(items[0].state.pink, true);
  assert.ok(needsRewash({ items, rewashes: 0 }, cfg));
});

test('no detergent leaves things grubby; too much makes suds', () => {
  const items = [inst(piece('tee', 'blue'))];
  assert.ok(computeOutcome({ bin: 'color', items }, S({ detergent: 0 }), never, cfg).facts.includes('grubby'));
  const suds = computeOutcome({ bin: 'color', items }, S({ detergent: cfg.rules.sudsDetergent }), never, cfg);
  assert.equal(suds.events.suds, true);
});

test('bleach ruins things that say no bleach', () => {
  const items = [inst(piece('tee', 'blue'))];
  items[0].item.care.bleach = false;
  const out = computeOutcome({ bin: 'color', items }, S({ bleach: 1 }), never, cfg);
  const ruined = applyChanges(items, out.changes);
  assert.equal(ruined, 1);
  assert.equal(items[0].state.removed, true);
});

test('hot water shrinks wool; normal cycle stretches delicates', () => {
  const wool = inst(piece('sweater', 'gray', 'solid', 'wool'));
  const out = computeOutcome({ bin: 'delicate', items: [wool] }, S({ water: 'hot' }), never, cfg);
  assert.ok(out.facts.includes('shrunk') || out.facts.includes('stretched'));
});

test('a phone in the wash is ruined; a pen stains its neighbors', () => {
  const tee = inst(piece('tee', 'blue'));
  const pen = inst(namedPiece(data, 'pen'));
  const tee2 = inst(piece('sweatpants', 'green'));
  const phone = inst(namedPiece(data, 'phone'));
  const items = [tee, pen, tee2, phone];
  const out = computeOutcome({ bin: 'color', items }, S(), never, cfg);
  applyChanges(items, out.changes);
  assert.ok(out.facts.includes('phone_ruined'));
  assert.ok(out.facts.includes('pen_ink'));
  assert.equal(tee.state.stained, true);
  assert.equal(tee2.state.stained, true);
  assert.equal(phone.state.removed, true);
});

test('a tissue leaves lint on darks', () => {
  const dark = inst(piece('tee', 'black'));
  const tissue = inst(namedPiece(data, 'tissue'));
  const out = computeOutcome({ bin: 'dark', items: [dark, tissue] }, S(), never, cfg);
  applyChanges([dark, tissue], out.changes);
  assert.equal(dark.state.linted, true);
});

test('rewash can fix pink', () => {
  const tee = inst(piece('tee', 'white'));
  tee.state.pink = true;
  const out = computeOutcome({ bin: 'white', items: [tee] }, S({ rewash: true, water: 'cold', bleach: 1 }), always, cfg);
  applyChanges([tee], out.changes);
  assert.ok(out.facts.includes('rewash_fixed'));
  assert.equal(tee.state.pink, false);
});

test('drying: hang-dry pieces shrink in the dryer, not on the rack', () => {
  const sweater = inst(piece('sweater', 'gray', 'solid', 'wool'));
  const tee = inst(piece('tee', 'blue'));
  const inDryer = computeDry([sweater, tee], { sheet: true, rackUids: [] });
  assert.ok(inDryer.facts.includes('dryer_shrunk'));
  const onRack = computeDry([sweater, tee], { sheet: false, rackUids: [sweater.uid] });
  assert.ok(onRack.facts.includes('rack_saved'));
  assert.ok(onRack.facts.includes('static'));
  const allRack = computeDry([sweater], { sheet: false, rackUids: [sweater.uid] });
  assert.equal(allRack.sheet, null, 'no sheet question when nothing went in the dryer');
});

test('topFact follows the priority list', () => {
  assert.equal(topFact(['fresh', 'bleed', 'suds'], templates.factPriority), 'bleed');
  assert.equal(topFact([], templates.factPriority), 'clean');
});

const day = (over = {}) => ({
  loads: [{ bin: 'white', score: 95, facts: ['clean'], rewashes: 0, settings: S(), itemIds: ['gen:tee:white:solid:cotton'] }],
  counts: { washed: 5, dried: 4, hung: 1, folded: 5 },
  trapsCaught: [], pocketsChecked: 0, pocketsTotal: 2, socksPaired: 0, pairsTotal: 1, sheets: 1, paid: { coin: 1, tap: 0 }, rewashes: 0, newCloset: null,
  ...over,
});

test('receipt titles go in priority order', () => {
  assert.equal(pickTitle(day(), templates), 'Fresh Start');
  assert.equal(pickTitle(day({ loads: [{ ...day().loads[0], facts: ['bleed'] }] }), templates), 'Pink Load Pro');
  assert.equal(pickTitle(day({ trapsCaught: [{ id: 'sleepy-cat', name: 'Sleepy cat' }] }), templates), 'Cat Rescuer');
  assert.equal(pickTitle(day({ loads: [{ ...day().loads[0], score: 70 }] }), templates), 'Laundry Star');
});

test('receipt text has the note and lines up', () => {
  const r = buildReceipt(day({ newCloset: 'Mustard' }), templates, { note: 'Nice and fresh.', when: new Date('2026-10-09T15:00:00Z') });
  assert.match(r.text, /COZY WASH/);
  assert.match(r.text, /"Nice and fresh\."/);
  assert.match(r.text, /New in your closet\s+Mustard/);
  for (const line of r.text.split('\n')) if (/\s{2,}\S/.test(line.trim())) assert.ok(line.length <= 40, line);
});

test('recap payload stays small and the fallback note is never empty', () => {
  const p = recapPayload(day());
  assert.ok(JSON.stringify(p).length < 8192);
  assert.ok(fallbackNote(day(), templates).length > 3);
  assert.ok(fallbackNote(day({ loads: [{ ...day().loads[0], facts: ['bleed'] }] }), templates).length > 3);
});

test('a sock without its partner in the load is a lost sock', () => {
  const sock = (id) => inst({ ...piece('socks', 'white'), pairId: id });
  const lone = [inst(piece('tee', 'white')), sock('p1')];
  assert.ok(computeOutcome({ bin: 'white', items: lone }, S(), never, cfg).facts.includes('lost_sock'));
  const pair = [sock('p1'), sock('p1')];
  assert.ok(!computeOutcome({ bin: 'white', items: pair }, S(), never, cfg).facts.includes('lost_sock'));
});
