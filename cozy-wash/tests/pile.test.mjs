import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.mjs';
import { buildDay, previousDate, itemKey } from '../src/engine/pile.js';

const dates = (start, n) => {
  const out = [];
  const d = new Date(`${start}T12:00:00Z`);
  for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
};

test('a day has 16 tiles, traps, a sock pair, a look-alike, a delicate and three wash bins', () => {
  const { data, cfg, closet } = setup('fall');
  for (const date of dates('2026-10-01', 30)) {
    const day = buildDay(data, cfg, { date, closet });
    assert.equal(day.tiles.length, cfg.tiles.count, date);
    const items = day.tiles.map((t) => t.item);
    assert.equal(items.filter((i) => i.kind === 'trap').length, cfg.tiles.traps, `${date} traps`);
    const pair = items.filter((i) => i.pairId);
    assert.equal(pair.length, 2, `${date} sock pair`);
    assert.ok(items.some((i) => i.lookAlike), `${date} look-alike`);
    assert.ok(items.some((i) => i.bin === 'delicate'), `${date} delicate`);
    const bins = new Set(items.filter((i) => i.kind !== 'trap').map((i) => i.bin));
    for (const b of ['white', 'dark', 'color']) assert.ok(bins.has(b), `${date} has ${b}`);
    const uids = new Set(day.tiles.map((t) => t.uid).concat(day.tiles.filter((t) => t.pocket).map((t) => t.pocket.uid)));
    assert.equal(uids.size, day.tiles.length + day.tiles.filter((t) => t.pocket).length, 'unique uids');
  }
});

test('the same date gives the same day', () => {
  const { data, cfg, closet } = setup();
  const a = buildDay(data, cfg, { date: '2026-10-09', closet });
  const b = buildDay(data, cfg, { date: '2026-10-09', closet });
  assert.deepEqual(a.tiles.map((t) => t.item.id), b.tiles.map((t) => t.item.id));
});

test('ten days in a row stay varied (few repeats from yesterday)', () => {
  const { data, cfg, closet } = setup('fall');
  let avoid = [];
  const seen = new Set();
  for (const date of dates('2026-10-01', 10)) {
    const day = buildDay(data, cfg, { date, closet, avoid });
    const keys = day.tiles.map((t) => itemKey(t.item));
    const repeats = keys.filter((k) => avoid.includes(k)).length;
    assert.ok(repeats <= cfg.tiles.maxRepeatsFromYesterday, `${date}: ${repeats} repeats`);
    keys.forEach((k) => seen.add(k));
    avoid = keys;
  }
  assert.ok(seen.size >= 60, `only ${seen.size} different pieces over 10 days`);
});

test('previousDate', () => {
  assert.equal(previousDate('2026-03-01'), '2026-02-28');
  assert.equal(previousDate('2026-01-01'), '2025-12-31');
});
