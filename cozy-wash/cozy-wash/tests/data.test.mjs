import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkData } from '../tools/check-data.mjs';
import { setup } from './helpers.mjs';

test('every data file passes the checker', () => {
  assert.deepEqual(checkData(), []);
});

test('every named item rebuilds with art', () => {
  const { data } = setup('fall');
  for (const it of Object.values(data.items)) {
    assert.ok(data.art[it.art], `${it.id} art`);
    if (it.fold) assert.ok(data.folds[it.fold], `${it.id} fold`);
  }
});

test('every fact has a fallback note or a house note', () => {
  const { templates } = setup();
  for (const f of templates.factPriority) assert.ok(templates.houseNotes[f] && templates.houseNotes[f].length, f);
});
