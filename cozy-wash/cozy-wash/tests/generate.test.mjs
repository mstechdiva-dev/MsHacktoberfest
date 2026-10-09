import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.mjs';
import { randomPiece, pieceFromId, parseGenId } from '../src/engine/generate.js';
import { makeRng } from '../src/engine/rng.js';

test('10,000 random pieces are all valid and rebuild from their ids', () => {
  const { data } = setup('fall');
  const rng = makeRng('generate-test');
  const colors = Object.keys(data.colors);
  const patterns = Object.keys(data.patterns);
  const bins = new Set();
  for (let i = 0; i < 10000; i++) {
    const p = randomPiece(data, rng, { colors, patterns, gentle: i % 7 === 0, lookAlike: i % 11 === 0 });
    assert.ok(p, 'made a piece');
    assert.ok(p.name && p.name.length < 60, `name "${p.name}"`);
    assert.ok(['white', 'dark', 'color', 'delicate'].includes(p.bin), `bin ${p.bin}`);
    assert.ok(data.art[p.art], `art ${p.art}`);
    assert.ok(Array.isArray(p.tags) && p.tags.length, 'has care tags');
    if (i % 7 === 0) assert.equal(p.bin, 'delicate', 'gentle pieces are delicates');
    assert.ok(parseGenId(p.id), 'generated id');
    const again = pieceFromId(data, p.id);
    assert.equal(again.name, p.name);
    assert.equal(again.bin, p.bin);
    bins.add(p.bin);
  }
  assert.equal(bins.size, 4);
});

test('bad ids rebuild to null', () => {
  const { data } = setup();
  assert.equal(pieceFromId(data, 'gen:spaceship:white:solid:cotton'), null);
  assert.equal(pieceFromId(data, 'nope'), null);
  assert.equal(parseGenId('gen:tee'), null);
});
