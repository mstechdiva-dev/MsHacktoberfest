import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.mjs';
import { defaultSave } from '../src/state.js';
import { startDay, flipTile, placeCurrent, buildLoads, setAside, daySummary, finishDay, inst, loadItems } from '../src/game.js';

const { data, cfg, closet, templates } = setup();

/** A new day, sorted. `binFor(instance, n)` says where each piece goes (n counts the socks). */
function play(binFor, cfgOverride) {
  const c = cfgOverride || cfg;
  const ctx = { save: { ...defaultSave(c), closet: { colors: [...closet.colors], patterns: [...closet.patterns] } }, data, cfg: c, templates };
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
const right = (i) => i.item.bin;
const traps = (game) => game.trapsCaught.length;

test('each matched pair and each saved trap is worth one tidy point', () => {
  const { ctx, game } = play((i) => (i.item.pairId ? 'white' : right(i)));
  assert.equal(traps(game), 3, 'all three traps were put in Don\'t wash');
  assert.equal(game.tidy, 3 + 1, 'three traps and one pair');
  assert.equal(daySummary(ctx).tidy, 4);
});

test('a split pair and a trap that goes in the wash earn nothing', () => {
  const { ctx, game } = play((i, n) => (i.item.pairId ? (n === 0 ? 'white' : 'dark') : i.item.kind === 'trap' ? 'color' : right(i)));
  assert.equal(game.tidy, 0);
  assert.equal(daySummary(ctx).tidy, 0);
});

test('a trap pulled out of the drum counts as saved, once', () => {
  const { game } = play((i) => (i.item.kind === 'trap' ? 'color' : right(i)));
  const before = game.tidy; // the sock pair, which went in its right bin, but no trap
  assert.equal(game.trapsCaught.length, 0);
  const load = game.loads.find((l) => loadItems(game, l).some((x) => x.item.kind === 'trap'));
  const trap = loadItems(game, load).find((x) => x.item.kind === 'trap');
  assert.equal(setAside(game, load, trap.uid), true);
  assert.equal(game.tidy, before + 1, 'the point comes with the rescue');
  assert.equal(game.trapsCaught.length, 1);
  assert.equal(setAside(game, { uids: [], ...load }, trap.uid), false, 'taking it out a second time does nothing');
  assert.equal(game.tidy, before + 1);
});

test('the bonus is printed on the receipt and added to the best-day score', () => {
  const { ctx, game } = play((i) => (i.item.pairId ? 'white' : right(i)));
  game.loads.forEach((l) => { l.score = 80; });
  const r = finishDay(ctx, 'Nice.', 'fallback');
  assert.match(r.text, /^Tidy bonus\s+\+4$/m);
  assert.equal(ctx.save.bests.bestDayScore, 80 + 4, 'an average of 80 with 4 tidy points');
  // a load's own score is untouched
  assert.ok(game.loads.every((l) => l.score === 80));
});

test('a day with nothing tidy prints no bonus line', () => {
  const { ctx, game } = play((i, n) => (i.item.pairId ? (n === 0 ? 'white' : 'dark') : i.item.kind === 'trap' ? 'color' : right(i)));
  game.loads.forEach((l) => { l.score = 90; });
  const r = finishDay(ctx, 'Nice.', 'fallback');
  assert.doesNotMatch(r.text, /Tidy bonus/);
  assert.equal(ctx.save.bests.bestDayScore, 90);
});

test('what a tidy point is worth is a setting', () => {
  const rich = JSON.parse(JSON.stringify(cfg));
  rich.score.tidy = 5;
  const { ctx } = play((i) => (i.item.pairId ? 'white' : right(i)), rich);
  assert.equal(daySummary(ctx).tidy, 4 * 5);
});

test('a game saved before the bonus existed still finishes', () => {
  const { ctx, game } = play((i) => right(i));
  delete game.tidy;
  assert.equal(daySummary(ctx).tidy, 0);
  game.loads.forEach((l) => { l.score = 70; });
  assert.doesNotThrow(() => finishDay(ctx, 'Nice.', 'fallback'));
});
