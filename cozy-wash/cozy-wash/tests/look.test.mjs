import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { itemSVG, itemLabel } from '../src/ui/svg.js';

const css = readFileSync('styles/main.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Read the custom properties out of a CSS block. */
const vars = (block) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const lightBlock = css.slice(css.indexOf(':root {') + 7, css.indexOf('@media (prefers-color-scheme: dark)'));
const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const darkBlock = css.slice(css.indexOf(':root {', darkStart) + 7, css.indexOf('\n  }\n}', darkStart));
const light = vars(lightBlock);
const dark = { ...light, ...vars(darkBlock) };

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('every colour from the plan is a token, with the plan\'s value', () => {
  const plan = {
    bg: '#dceffc', ink: '#18394d', accent: '#398caf', button: '#224b60', 'button-hover': '#326780', 'machine-edge': '#c3d3df',
    display: '#19394b', 'display-text': '#9cf6e4', 'neon-pink': '#ff6ed7', 'neon-cyan': '#54f5ef', ok: '#61bd97', warn: '#e0a030',
    'plant-a': '#6b9d83', 'plant-b': '#477f69', 'plant-c': '#85ae91', paper: '#fffdf6',
  };
  for (const [k, v] of Object.entries(plan)) assert.equal(light[k], v, `--${k}`);
  for (const k of ['machine', 'glass', 'glass-dry', 'pot']) assert.ok(light[k] && /gradient/.test(light[k]), `--${k} is a gradient`);
  assert.match(light.glass, /#396177.*#0c2636/);
  assert.match(light['glass-dry'], /#705b45.*#282e35/);
  assert.match(light.pot, /#df9c7b.*#f4bb9b/);
  assert.match(light.machine, /#ffffff.*#c9d7e3/);
});

test('dark mode uses the plan\'s dark values', () => {
  const plan = { bg: '#10222e', ink: '#e6f3fb', muted: '#9bb7c7', accent: '#6cbbe0', button: '#3f7d9b', 'machine-edge': '#7e93a3', ok: '#7fd3ad', warn: '#f0b84a' };
  for (const [k, v] of Object.entries(plan)) assert.equal(dark[k], v, `--${k} in dark`);
  assert.match(dark.machine, /#dfe8ef.*#9fb2c1/);
  assert.equal(dark.paper, '#fffdf6', 'the receipt paper stays light');
  assert.equal(dark.glass, light.glass, 'the glass is the same in both');
});

test('text meets AA contrast, 4.5 to 1, in light and dark', () => {
  for (const [name, t] of [['light', light], ['dark', dark]]) {
    const pairs = [
      ['ink on bg', t.ink, t.bg], ['ink on card', t.ink, t.card],
      ['muted on bg', t.muted, t.bg], ['muted on card', t.muted, t.card],
      ['link on bg', t.link, t.bg], ['link on card', t.link, t.card],
      ['ok text on bg', t['ok-text'], t.bg], ['ok text on card', t['ok-text'], t.card],
      ['warn text on bg', t['warn-text'], t.bg], ['warn text on card', t['warn-text'], t.card],
      ['white on button', '#ffffff', t.button], ['white on button hover', '#ffffff', t['button-hover']],
      ['machine timer', t['display-text'], t.display],
      ['a greyed-out button', t['disabled-text'], t['disabled-bg']],
      ['machine label on the machine\'s darkest edge', t['on-machine'], t === dark ? '#9fb2c1' : '#c9d7e3'],
      ['machine status on the machine\'s darkest edge', t['on-machine-ok'], t === dark ? '#9fb2c1' : '#c9d7e3'],
    ];
    for (const [label, a, b] of pairs) assert.ok(contrast(a, b) >= 4.5, `${name}: ${label} is ${contrast(a, b).toFixed(2)}:1`);
  }
});

test('the breakpoints are the cover\'s: 760 and 520', () => {
  const widths = [...css.matchAll(/@media \(max-width: (\d+)px\)/g)].map((m) => Number(m[1]));
  assert.deepEqual([...new Set(widths)].sort((a, b) => b - a), [760, 520]);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('machines have 20px corners and colours come from tokens, not copies', () => {
  assert.match(css, /\.machine \{[^}]*border-radius: 20px;/);
  for (const stale of ['--machine-a', '--machine-b', '--ok-dot', '--warn-dot', 'var(--display)']) {
    if (stale === 'var(--display)') assert.ok(!/font-family: var\(--display\)/.test(css), 'the font token has its own name');
    else assert.ok(!css.includes(stale), `${stale} is gone`);
  }
  const count = (text) => css.split(text).length - 1;
  assert.equal(count('#47877b'), 0, 'the OK text colour is a token');
  assert.equal(count('#df9c7b'), 1, 'the pot gradient is defined once');
  assert.equal(count('#396177'), 1, 'the glass gradient is defined once');
  assert.equal(count('#705b45'), 1, 'the dryer glass is defined once');
  assert.equal(count('#6b9d83') + count('#477f69') + count('#85ae91'), 3, 'each leaf green is defined once');
});

test('pink pieces say (pink) in words as well as colour', () => {
  const item = { name: 'Cream tee', color: '#f3ead2', patternSvg: 'solid', art: 'tee' };
  assert.equal(itemLabel(item, {}), 'Cream tee');
  assert.equal(itemLabel(item, { pink: true }), 'Cream tee (pink)');
  const art = { id: 'tee', viewBox: [32, 30], outline: 'M2 2H30V28H2Z', details: [] };
  assert.match(itemSVG(item, art, { state: { pink: true } }), /aria-label="Cream tee \(pink\)"/);
  assert.match(itemSVG(item, art, {}), /aria-label="Cream tee"/);
});

test('all the machines are front loaders: no top loader is left anywhere in the game', () => {
  const { readdirSync, statSync } = readdirSyncModule();
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = `${dir}/${n}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = [...walk('src'), ...walk('api'), 'styles/main.css', 'index.html', 'sounds/default/manifest.json'];
  const hits = files.filter((f) => /top.?loader|lid-open|lid-close|COZY TOP|s\.machine|settings\.machine/i.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits, []);
});

function readdirSyncModule() { return { readdirSync: fs.readdirSync, statSync: fs.statSync }; }
