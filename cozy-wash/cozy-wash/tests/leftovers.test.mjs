import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setup } from './helpers.mjs';
import { loadRaw } from '../api/_lib/data.js';
import { checkData, checkShape } from '../tools/check-data.mjs';
import { sanitizeSave, defaultSave, updateProgress } from '../src/state.js';
import { buildDay, itemKey } from '../src/engine/pile.js';
import { startDay, flipTile, placeCurrent, buildLoads, finishDay, inst } from '../src/game.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const broken = (mutate) => { const raw = clone(loadRaw()); mutate(raw); return checkData(raw); };
const has = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), `expected a problem mentioning "${text}", got:\n${errors.join('\n')}`);

test('the real data passes every check', () => assert.deepEqual(checkData(), []));

test('check-data wants two house notes and a fallback line for every fact', () => {
  has(broken((r) => { r.templates.houseNotes.bleed = ['Only one.']; }), 'fact "bleed" needs at least two house notes');
  has(broken((r) => { delete r.templates.noteFallback.byFact.static; }), 'fact "static" needs a fallback line');
  has(broken((r) => { r.templates.factPriority = r.templates.factPriority.filter((f) => f !== 'lost_sock'); }), 'fact "lost_sock" is missing from factPriority');
});

test('check-data catches a title that points at a rule that does not exist', () => {
  has(broken((r) => { r.templates.titles[0].rule = 'allSocksHappy'; }), 'allSocksHappy');
  has(broken((r) => { r.templates.titles.push({ ...r.templates.titles[0] }); }), 'duplicate title id');
  has(broken((r) => { delete r.templates.defaultTitle; }), 'defaultTitle');
  has(broken((r) => { delete r.templates.signs.offline; }), 'signs.offline');
  has(broken((r) => { delete r.templates.screens.stillThere; }), 'screens.stillThere');
});

test('check-data checks config/game.json against its shape', () => {
  has(broken((r) => { delete r.game.pay.tapHoldMs; }), 'pay.tapHoldMs: missing');
  has(broken((r) => { r.game.pay.tapHoldMs = 'a second'; }), 'pay.tapHoldMs: expected');
  has(broken((r) => { r.game.rules.bleedMax = 1.5; }), 'rules.bleedMax: expected a number from 0 to 1');
  has(broken((r) => { r.game.score.ruind = -20; }), 'score.ruind: not a setting the game knows');
  has(broken((r) => { r.game.tiles.bonus = [3, 1]; }), 'tiles.bonus');
  has(broken((r) => { r.game.tiles.count = 15; }), 'whole rows');
  has(broken((r) => { r.game.rarity.rare = 0; }), 'rarity.rare must be above 0');
  assert.deepEqual(checkShape({ a: 1, b: { c: true } }, { a: 'int', b: { c: 'bool' } }), []);
  assert.equal(checkShape('nope', { a: 'int' }).length, 1);
});

test('check-data checks each item\'s fields', () => {
  const item = (raw, id) => raw.items.find((i) => i.id === id);
  has(broken((r) => { item(r, 'red-sock').rarity = 'legendary'; }), 'rarity must be one of');
  has(broken((r) => { item(r, 'red-sock').bleeder = 3; }), 'bleeder must be a number from 0 to 1');
  has(broken((r) => { item(r, 'red-sock').care.dryer = 'yes'; }), 'care.dryer must be true or false');
  has(broken((r) => { item(r, 'phone').fold = 'shirt'; }), 'traps have "fold": null');
  has(broken((r) => { item(r, 'red-sock').onWrong.damage = 'explode'; }), 'onWrong.damage must be one of');
  has(broken((r) => { item(r, 'pillow').unlock = { type: 'sunny', count: 2 }; }), 'unlock must be null or');
  has(broken((r) => { item(r, 'pillow').unlock = { type: 'cleanStreak', count: 0 }; }), 'unlock must be null or');
  assert.deepEqual(broken((r) => { item(r, 'pillow').unlock = { type: 'cleanStreak', count: 3 }; }), [], 'a good unlock is fine');
  has(broken((r) => { r.garments[0].pocket = { chance: 0.3, contents: ['not-an-item'] }; }), 'pocket content "not-an-item" is not an item');
  has(broken((r) => { r.garments[0].patterns = []; }), 'needs at least one pattern');
});

test('check-data wants every season folder to be built or waiting with a README', () => {
  has(broken((r) => { r.seasons.push({ id: 'monsoon' }); }), 'seasons/monsoon: folder not found');
  const real = loadRaw();
  assert.ok(real.seasons.find((s) => s.id === 'fall').name, 'fall is built');
  for (const id of ['winter', 'spring', 'summer']) assert.match(readFileSync(`seasons/${id}/README.md`, 'utf8'), /good first issue/, `${id} waits with a README`);
});

test('a damaged or old save never breaks the game', () => {
  const { cfg } = setup();
  const base = defaultSave(cfg);
  for (const junk of [null, 5, 'text', [], {}, { closet: {} }, { closet: { colors: 'red' } }, { shelf: 'no' }, { receipts: {} }, { counts: { washed: 'lots' } }, { game: { date: 3 } }, { game: { date: '2026-10-09' } }, { progress: [] }, { bests: 3 }]) {
    const s = sanitizeSave(junk, base);
    assert.ok(Array.isArray(s.closet.colors) && s.closet.colors.length, 'a closet');
    assert.ok(Array.isArray(s.shelf) && Array.isArray(s.receipts) && Array.isArray(s.lastDayKeys));
    assert.equal(typeof s.progress.cleanStreak, 'number');
    assert.ok(Object.values(s.counts).every((n) => typeof n === 'number'));
    assert.equal(s.game, null, 'a half-saved game is dropped');
    assert.equal(typeof s.bests.bestDayScore, 'number');
  }
  const good = { ...base, playedOn: '2026-10-09', closet: { colors: ['red'], patterns: ['solid'] }, counts: { washed: 4, dried: 3, hung: 1, folded: 4 }, shelf: [{ id: 'teddy-bear', name: 'Teddy bear', type: 'shelf' }, { nope: 1 }], receipts: Array.from({ length: 9 }, (_, i) => ({ date: `d${i}` })) };
  const s = sanitizeSave(JSON.parse(JSON.stringify(good)), base);
  assert.equal(s.playedOn, '2026-10-09');
  assert.deepEqual(s.closet, { colors: ['red'], patterns: ['solid'] });
  assert.equal(s.counts.washed, 4);
  assert.equal(s.shelf.length, 1, 'a shelf entry without a name is dropped');
  assert.equal(s.receipts.length, 7, 'only the last 7 receipts');
});

test('the clean-load streak grows, resets and unlocks pieces', () => {
  const { cfg } = setup();
  const save = defaultSave(cfg);
  const pillow = { id: 'pillow', name: 'Pillow', unlock: { type: 'cleanStreak', count: 3 } };
  const plain = { id: 'sock', name: 'Sock', unlock: null };
  const day = (...scores) => scores.map((score) => ({ score }));
  assert.deepEqual(updateProgress(save, day(95, 90), cfg, [pillow, plain]), []);
  assert.equal(save.progress.cleanStreak, 2);
  assert.equal(save.progress.days, 1);
  assert.deepEqual(updateProgress(save, day(100), cfg, [pillow, plain]), ['Pillow'], 'the third clean load unlocks it');
  assert.deepEqual(save.shelf, [{ id: 'pillow', name: 'Pillow', type: 'unlocked' }]);
  assert.deepEqual(updateProgress(save, day(100), cfg, [pillow]), [], 'only once');
  assert.equal(save.shelf.length, 1);
  updateProgress(save, day(100, 60), cfg, []);
  assert.equal(save.progress.cleanStreak, 0, 'a messy load resets the streak');
  updateProgress(save, day(89), cfg, []);
  assert.equal(save.progress.cleanStreak, 0, '89 is not clean');
  assert.equal(save.progress.days, 5);
});

test('a piece that needs a streak stays out of the pile until it is unlocked', () => {
  const { data, cfg, closet } = setup();
  data.items['teddy-bear'].unlock = { type: 'cleanStreak', count: 3 };
  data.items['baby-blanket'].unlock = { type: 'cleanStreak', count: 3 };
  const seen = (unlocked) => {
    const ids = new Set();
    for (let d = 1; d <= 120; d++) {
      const date = new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10);
      for (const t of buildDay(data, cfg, { date, closet, unlocked }).tiles) ids.add(t.item.id);
    }
    return ids;
  };
  const locked = seen([]);
  assert.ok(!locked.has('teddy-bear') && !locked.has('baby-blanket'), 'locked pieces never appear');
  assert.ok(seen(['teddy-bear']).has('teddy-bear'), 'once unlocked it shows up');
});

test('finishing a day with a streak unlocks the piece, tells the player, and prints it', () => {
  const { data, cfg, closet, templates } = setup();
  data.items.pillow.unlock = { type: 'cleanStreak', count: 1 };
  const ctx = { save: { ...defaultSave(cfg), closet: { colors: [...closet.colors], patterns: [...closet.patterns] } }, data, cfg, templates };
  const game = startDay(ctx);
  for (const t of game.tiles) {
    if (game.placed[t.uid]) continue;
    flipTile(game, t.uid); placeCurrent(game, inst(game, t.uid).item.bin);
    while (game.current) placeCurrent(game, inst(game, game.current).item.bin);
  }
  buildLoads(game);
  game.loads.forEach((l) => { l.score = 100; });
  const r = finishDay(ctx, 'Nice.', 'fallback');
  assert.deepEqual(r.newShelf, ['Pillow']);
  assert.match(r.text, /New on your shelf\s+Pillow/);
  assert.ok(ctx.save.shelf.some((s) => s.id === 'pillow' && s.type === 'unlocked'));
  assert.equal(ctx.save.progress.cleanStreak, game.loads.length);
});

test('no more than 4 pieces repeat from yesterday, across a whole year', () => {
  for (const season of [null, 'fall']) {
    const { data, cfg, closet } = setup(season);
    let avoid = [];
    const d = new Date('2026-01-01T12:00:00Z');
    for (let i = 0; i < 365; i++) {
      const date = d.toISOString().slice(0, 10); d.setUTCDate(d.getUTCDate() + 1);
      const day = buildDay(data, cfg, { date, closet, avoid });
      const yesterday = new Set(avoid);
      const repeats = day.tiles.filter((t) => yesterday.has(itemKey(t.item))).length;
      assert.ok(repeats <= cfg.tiles.maxRepeatsFromYesterday, `${season || 'plain'} ${date}: ${repeats} repeats`);
      avoid = day.tiles.map((t) => t.item.id);
    }
  }
});

test('the sound hint says what the plan says', () => {
  assert.match(readFileSync('index.html', 'utf8'), /<span class="sound-text">Tap to turn sound on<\/span>/);
  assert.match(readFileSync('src/ui/settings.js', 'utf8'), /'Tap to turn sound on'/);
});
