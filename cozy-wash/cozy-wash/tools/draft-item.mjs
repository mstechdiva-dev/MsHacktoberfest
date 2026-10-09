// Starts a new item file for you to fill in: `npm run draft-item -- rain-boots "Rain boots" --kind bonus --bin color`
// It writes items/<id>.json and adds the id to items/index.json. Then run `npm run check`.
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../api/_lib/data.js';

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const [id, name] = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));

if (!id || !/^[a-z0-9-]+$/.test(id) || !name) {
  console.error('Usage: npm run draft-item -- <id> "<Name>" [--kind everyday|bonus|trap|pocket] [--bin white|dark|color|delicate|nowash] [--art tee] [--fold shirt]');
  process.exit(1);
}
const file = join(ROOT, 'items', `${id}.json`);
if (existsSync(file)) { console.error(`items/${id}.json already exists.`); process.exit(1); }

const kind = flag('kind', 'everyday');
const bin = flag('bin', kind === 'trap' ? 'nowash' : 'color');
const item = {
  id,
  name,
  kind,
  bin,
  fabric: 'cotton',
  color: '#9fc6dd',
  pattern: 'solid',
  art: flag('art', 'tee'),
  tags: ['Wash with colors'],
  care: { gentle: bin === 'delicate', maxTemp: bin === 'delicate' ? 'cold' : 'warm', bleach: false, dryer: bin !== 'delicate', shrinks: false },
  fold: kind === 'trap' ? null : flag('fold', 'shirt'),
  pair: false,
  pocket: null,
  rarity: 'common',
  season: null,
  unlock: null,
  onWrong: { damage: 'none', fact: null },
};
writeFileSync(file, `${JSON.stringify(item, null, 2)}\n`);
const indexFile = join(ROOT, 'items', 'index.json');
const index = JSON.parse(readFileSync(indexFile, 'utf8'));
if (!index.includes(id)) { index.push(id); writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`); }
console.log(`Made items/${id}.json. Fill in the color, tags and care, then run npm run check.`);
