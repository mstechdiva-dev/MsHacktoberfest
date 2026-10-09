import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { setup } from './helpers.mjs';
import { checkFold, isRectangle, area } from '../src/engine/fold.js';
import { foldedSVG } from '../src/ui/svg.js';
import { machine, bubblesLayer, arrowUpRight, arrowDownRight, sparkIcon } from '../src/ui/props.js';

const { raw, data } = setup();

test('every fold really ends as a neat square or rectangle', () => {
  assert.equal(raw.folds.length, 6);
  for (const f of raw.folds) {
    assert.deepEqual(checkFold(f), [], f.id);
    assert.ok(isRectangle(f.frames[4]), `${f.id} last frame`);
    assert.equal(f.steps.length, 4, `${f.id} takes 4 taps`);
  }
});

test('the fold check turns away folds that are not tidy', () => {
  const shirt = raw.folds.find((f) => f.id === 'shirt');
  const copy = () => JSON.parse(JSON.stringify(shirt));
  const lean = copy(); lean.frames[4][0] = [20, 24]; // pull one corner out of line
  assert.ok(checkFold(lean).some((p) => /neat square or rectangle/.test(p)), 'not a rectangle');
  const short = copy(); short.frames[2].pop();
  assert.ok(checkFold(short).some((p) => /point count/.test(p)));
  const wrongFinish = copy(); wrongFinish.finish = 'square';
  assert.ok(checkFold(wrongFinish).some((p) => /"square"/.test(p)), 'a 28 x 32 shape is not a square');
  const noFinish = copy(); delete noFinish.finish;
  assert.ok(checkFold(noFinish).some((p) => /finish must be/.test(p)));
  const slow = copy(); slow.steps[1].ms = 99999;
  assert.ok(checkFold(slow).some((p) => /ms/.test(p)));
  const badLine = copy(); badLine.steps[0].line = [[0, 0]];
  assert.ok(checkFold(badLine).some((p) => /line/.test(p)));
  const off = copy(); off.frames[3][0] = [250, 10];
  assert.ok(checkFold(off).some((p) => /outside/.test(p)));
});

test('rectangle detection allows extra points along the edges only', () => {
  assert.ok(isRectangle([[10, 10], [50, 10], [90, 10], [90, 60], [10, 60]]));
  assert.ok(!isRectangle([[10, 10], [90, 10], [90, 60], [50, 80], [10, 60]]), 'a point poking out');
  assert.ok(!isRectangle([[10, 10], [90, 10], [50, 60]]), 'a triangle');
  assert.equal(area([[0, 0], [10, 0], [10, 5], [0, 5]]), 50);
});

test('a pink or stained piece keeps its look in the basket', () => {
  const item = data.items['pale-pink-tee'] ? { ...data.items['pale-pink-tee'], patternSvg: 'solid' } : { color: '#f8e3e6', patternSvg: 'solid' };
  const plain = foldedSVG(item, 64, 18, {});
  const pink = foldedSVG(item, 64, 18, { pink: true });
  const stained = foldedSVG(item, 64, 18, { stained: true });
  assert.notEqual(plain, pink, 'pink changes the colour');
  assert.ok(pink.includes('#f6b9cc'));
  assert.ok(!plain.includes('<ellipse') && stained.includes('<ellipse'), 'a stain shows');
});

test('the cover uses drawn icons and bubbles, not text characters', () => {
  assert.match(machine({ kind: 'washer', water: true, bubbles: true }), /class="bubbles"/);
  assert.doesNotMatch(machine({ kind: 'washer', water: true }), /class="bubbles"/, 'only where asked');
  const layer = bubblesLayer();
  assert.ok((layer.match(/<svg class="bubble"/g) || []).length >= 5);
  for (const icon of [arrowUpRight(), arrowDownRight(), sparkIcon()]) assert.match(icon, /^<svg/);
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = [...walk('src'), 'styles/main.css', 'index.html'];
  const offenders = files.filter((f) => /[✦↗↘◦○]/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, [], 'decorative text glyphs are still used');
});
