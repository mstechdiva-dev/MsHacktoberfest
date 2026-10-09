import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.mjs';
import { startDay, flipTile, placeCurrent, buildLoads, daySummary, foldQueue, dayCloset, inst } from '../src/game.js';
import { buildReceipt } from '../src/engine/receipt.js';
import { buildDay } from '../src/engine/pile.js';
import { randomPiece, pieceFromId } from '../src/engine/generate.js';
import { makeRng } from '../src/engine/rng.js';

const { data, cfg, closet, templates } = setup('fall');

/** Start a game and sort every tile. `binFor(instance, n)` says where each one goes; n counts socks. */
function sorted(binFor) {
  const ctx = { save: { closet: { colors: [...closet.colors], patterns: [...closet.patterns] }, shelf: [], lastDayKeys: [] }, data, cfg };
  const game = startDay(ctx);
  let socks = 0;
  const bin = (i) => binFor(i, i.item.pairId ? socks++ : 0);
  for (const t of game.tiles) {
    if (game.placed[t.uid]) continue;
    flipTile(game, t.uid);
    placeCurrent(game, bin(inst(game, t.uid)));
    while (game.current) placeCurrent(game, bin(inst(game, game.current)));
  }
  buildLoads(game);
  return { ctx, game };
}
const rightBin = (i) => i.item.bin;

test('the season adds its colors and patterns to the day\'s closet, without changing the saved one', () => {
  const day = dayCloset(closet, data.season);
  assert.ok(day.colors.includes('pumpkin') && day.patterns.includes('leaves'));
  assert.ok(!closet.colors.includes('pumpkin'), 'the saved closet is untouched');
  assert.deepEqual(dayCloset(closet, null), closet, 'no season, no change');
  assert.equal(day.colors.length, new Set(day.colors).size, 'no duplicates');
});

test('fall colors and patterns show up in generated clothes, and every one rebuilds', () => {
  const dayC = dayCloset(closet, data.season);
  const rng = makeRng('season-test');
  let pumpkin = 0, leaves = 0;
  for (let i = 0; i < 3000; i++) {
    const p = randomPiece(data, rng, dayC);
    if (p.id.includes(':pumpkin:')) pumpkin++;
    if (p.id.includes(':leaves:')) leaves++;
    assert.ok(pieceFromId(data, p.id), p.id);
  }
  assert.ok(pumpkin > 20, `pumpkin pieces: ${pumpkin}`);
  assert.ok(leaves > 20, `leafy pieces: ${leaves}`);
  const plain = makeRng('season-test');
  for (let i = 0; i < 500; i++) {
    const p = randomPiece(data, plain, closet);
    assert.ok(!p.id.includes(':pumpkin:') && !p.id.includes(':leaves:'), 'outside the season nothing seasonal sneaks in');
  }
});

test('over a month of fall days, seasonal clothes appear in the pile', () => {
  const dayC = dayCloset(closet, data.season);
  let seen = 0;
  for (let d = 1; d <= 30; d++) {
    const day = buildDay(data, cfg, { date: `2026-10-${String(d).padStart(2, '0')}`, closet: dayC });
    seen += day.tiles.filter((t) => /:pumpkin:|:leaves:/.test(t.item.id)).length;
  }
  assert.ok(seen > 0, 'no seasonal pieces in 30 days');
});

test('a split sock pair is two lost socks on the receipt, and each folds alone', () => {
  const { ctx, game } = sorted((i, n) => (i.item.pairId ? (n === 0 ? 'white' : 'dark') : rightBin(i)));
  const day = daySummary(ctx);
  assert.equal(day.lostSocks.length, 2);
  assert.equal(day.socksPaired, 0);
  const r = buildReceipt(day, templates, { note: 'ok', when: new Date('2026-10-09T15:00:00Z') });
  const rows = r.rows.filter((x) => Array.isArray(x) && x[0] === 'Lost sock?');
  assert.equal(rows.length, 2, 'one row per sock');
  assert.match(r.text, /Lost sock\?/);
  const socks = Object.values(game.instances).filter((i) => i.item.pairId);
  for (const load of game.loads) {
    const q = foldQueue(game, { ...load, uids: load.uids }).filter((x) => socks.some((s) => s.uid === x.uid));
    q.forEach((x) => assert.equal(x.count, 1, 'a lone sock folds on its own'));
  }
});

test('a matched pair is not lost, and folds as one', () => {
  const { ctx, game } = sorted((i) => (i.item.pairId ? 'white' : rightBin(i)));
  const day = daySummary(ctx);
  assert.equal(day.lostSocks.length, 0);
  assert.equal(day.socksPaired, 1);
  const load = game.loads.find((l) => l.bin === 'white');
  const q = foldQueue(game, load).filter((x) => inst(game, x.uid).item.pairId);
  assert.equal(q.length, 1);
  assert.equal(q[0].count, 2);
});

test('a sock left out of the wash is not a lost sock', () => {
  const { ctx } = sorted((i, n) => (i.item.pairId ? (n === 0 ? 'white' : 'nowash') : rightBin(i)));
  assert.equal(daySummary(ctx).lostSocks.length, 1, 'only the one that was washed alone');
});
