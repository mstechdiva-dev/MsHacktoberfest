import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('sounds/default/manifest.json', 'utf8'));

test('all the machines are front loaders: there are no lid sounds', () => {
  assert.equal(manifest.sounds['lid-open'], undefined);
  assert.equal(manifest.sounds['lid-close'], undefined);
  assert.equal(Object.keys(manifest.sounds).length, 50);
  assert.equal(Object.values(manifest.sounds).filter((x) => x.core !== false).length, 42, '42 core sounds');
  assert.equal(Object.values(manifest.sounds).filter((x) => x.core === false).length, 8, 'and 8 extras');
});
