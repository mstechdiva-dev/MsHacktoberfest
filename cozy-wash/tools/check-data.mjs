// Checks every data file so a typo shows up here, not in the game: `npm run check`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRaw, ROOT, listDir } from '../api/_lib/data.js';
import { checkFold } from '../src/engine/fold.js';
import { RECIPES } from '../src/audio/synth.js';
import { TITLE_RULES } from '../src/engine/receipt.js';

/** Every fact code the plan lists (section 7). Each needs house notes and a fallback line. */
const PLAN_FACTS = ['clean', 'bleed', 'suds', 'bleach_ruined', 'colors_tired', 'shrunk', 'stretched', 'teddy_flat', 'phone_ruined', 'keys_clank', 'pen_ink', 'crayon_melt', 'cat_woke', 'tissue_lint', 'leather_ruined', 'silk_ruined', 'grubby', 'rewash_fixed', 'rewash_faded', 'static', 'fresh', 'lost_sock', 'rack_saved', 'dryer_shrunk'];
const SIGNS = ['open', 'closed', 'maintenance', 'busy', 'offline', 'practice', 'done', 'reopened'];
const SCREEN_TEXT = ['goodbye', 'unlock', 'lostSock', 'oneSheet', 'receiptThanks', 'stillThere'];
const DAMAGE = ['self', 'neighbors', 'stain', 'none'];
const RARITY_IDS = ['common', 'uncommon', 'rare'];

// The shape of config/game.json: a typo or a missing number is caught here, not in the browser.
const PHASES = { fill: 'int', tumble: 'int', drain: 'int', spin: 'int' };
const GAME_SHAPE = {
  tiles: { count: 'int', columns: 'int', traps: 'int', bonus: 'range', pockets: 'int', minLookAlikes: 'int', minDelicates: 'int', maxRepeatsFromYesterday: 'int', allowSameTrapInPocket: 'bool' },
  seasonItemChance: 'chance',
  rarity: { common: 'num', uncommon: 'num', rare: 'num' },
  closet: { startColors: 'strings', startPatterns: 'strings', unlockOrder: 'strings' },
  dosing: { detergent: 'int', softener: 'int', bleach: 'int', rescue: 'int' },
  washPhases: PHASES,
  rewashPhases: PHASES,
  dryerSeconds: 'int',
  rules: {
    bleedTemp: { cold: 'num', warm: 'num', hot: 'num' }, bleedPerBleach: 'num', bleedMax: 'chance',
    sudsDetergent: 'int', sudsComboDetergent: 'int', sudsComboSoftener: 'int', heavyBleach: 'int',
    rewashBase: 'chance', rewashPerBleach: 'num', rewashRescue: 'num', rewashNotCold: 'num', rewashMax: 'chance', rewashLimit: 'int',
  },
  score: { ruined: 'whole', bleed: 'whole', suds: 'whole', heavyBleach: 'whole', shrunk: 'whole', stretched: 'whole', stained: 'whole', lint: 'whole', grubby: 'whole', static: 'whole', fresh: 'whole', tidy: 'whole', goodResult: 'int' },
  progress: { cleanLoadScore: 'int' },
  pay: { tapHoldMs: 'int', tapGlitchChance: 'chance' },
  status: { timeoutMs: 'int', autoCheckMinutes: 'num', busyMinutes: 'num' },
  closedLoop: { sleepMinutes: 'num' },
};

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const TYPES = {
  int: (x) => Number.isInteger(x) && x >= 0,
  whole: (x) => Number.isInteger(x),
  num: isNum,
  chance: (x) => isNum(x) && x >= 0 && x <= 1,
  bool: (x) => typeof x === 'boolean',
  strings: (x) => Array.isArray(x) && x.length > 0 && x.every((v) => typeof v === 'string'),
  range: (x) => Array.isArray(x) && x.length === 2 && x.every((v) => Number.isInteger(v) && v >= 0) && x[0] <= x[1],
};

/** Check a value against a shape. Returns a list of problems with their path. */
export function checkShape(value, shape, path = '') {
  const problems = [];
  if (typeof shape === 'string') {
    if (!TYPES[shape](value)) problems.push(`${path}: expected ${shape === 'chance' ? 'a number from 0 to 1' : shape === 'int' ? 'a whole number, 0 or more' : shape === 'range' ? 'two whole numbers [low, high]' : shape === 'strings' ? 'a list of words' : shape}`);
    return problems;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${path || 'config'}: expected a group of settings`];
  for (const k of Object.keys(shape)) {
    if (!(k in value)) problems.push(`${path ? `${path}.` : ''}${k}: missing`);
    else problems.push(...checkShape(value[k], shape[k], path ? `${path}.${k}` : k));
  }
  for (const k of Object.keys(value)) if (!(k in shape)) problems.push(`${path ? `${path}.` : ''}${k}: not a setting the game knows`);
  return problems;
}

/** @param {object} [rawIn] the data to check; reads the real files when left out (the tests pass broken copies) */
export function checkData(rawIn) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  let raw = rawIn;
  if (!raw) { try { raw = loadRaw(); } catch (e) { return [`loading: ${e.message}`]; } }
  const { game, templates, manifest, colors, patterns, fabrics, items, garments, seasons, art, folds } = raw;

  const artIds = new Set(art.map((a) => a.id));
  const foldIds = new Set(folds.map((f) => f.id));
  const allColors = [...colors, ...seasons.flatMap((s) => s.colors || [])];
  const allPatterns = [...patterns, ...seasons.flatMap((s) => s.patterns || [])];
  const colorIds = new Set(allColors.map((c) => c.id));
  const patternIds = new Set(allPatterns.map((p) => p.id));
  const fabricIds = new Set(fabrics.map((f) => f.id));
  const BINS = ['white', 'dark', 'color', 'delicate', 'nowash'];
  const KINDS = ['everyday', 'bonus', 'trap', 'pocket'];
  const TEMPS = ['cold', 'warm', 'hot'];
  const facts = new Set(templates.factPriority);

  const dupes = (list, where) => {
    const seen = new Set();
    for (const x of list) { if (seen.has(x.id)) err(where, `duplicate id "${x.id}"`); seen.add(x.id); }
  };
  dupes(allColors, 'colors'); dupes(allPatterns, 'patterns'); dupes(fabrics, 'fabrics'); dupes(items, 'items'); dupes(garments, 'garments');

  for (const a of art) {
    if (!Array.isArray(a.viewBox) || a.viewBox.length !== 2) err(`art/${a.id}`, 'viewBox must be [w, h]');
    if (typeof a.outline !== 'string' || !a.outline.startsWith('M')) err(`art/${a.id}`, 'outline must be a path starting with M');
  }
  for (const f of folds) {
    for (const p of checkFold(f)) err(`folds/${f.id}`, p);
    (f.steps || []).forEach((s, i) => {
      if (!Array.isArray(s.point) || s.point.length !== 2) err(`folds/${f.id}`, `step ${i + 1} needs a point [x, y]`);
      if (typeof s.hint !== 'string' || !s.hint.trim()) err(`folds/${f.id}`, `step ${i + 1} needs a short hint, like "Fold the left side in"`);
      if (s.loneHint !== undefined && (typeof s.loneHint !== 'string' || !s.loneHint.trim())) err(`folds/${f.id}`, `step ${i + 1} loneHint must be text`);
    });
  }
  for (const c of allColors) {
    if (!/^#[0-9a-f]{6}$/i.test(c.hex || '')) err(`colors/${c.id}`, 'hex must look like #a1b2c3');
    if (!['white', 'dark', 'color'].includes(c.bin)) err(`colors/${c.id}`, 'bin must be white, dark or color');
    if (typeof c.bleed !== 'number' || c.bleed < 0 || c.bleed > 1) err(`colors/${c.id}`, 'bleed must be 0 to 1');
  }
  for (const p of allPatterns) if (!p.svg) err(`patterns/${p.id}`, 'needs an svg kind');
  for (const f of fabrics) {
    const c = f.care || {};
    if (!TEMPS.includes(c.maxTemp)) err(`fabrics/${f.id}`, 'care.maxTemp must be cold, warm or hot');
    for (const k of ['gentle', 'bleach', 'dryer', 'shrinks']) if (typeof c[k] !== 'boolean') err(`fabrics/${f.id}`, `care.${k} must be true or false`);
  }
  const itemKinds = new Map(items.map((i) => [i.id, i.kind]));
  const checkPocket = (p, w) => {
    if (!isNum(p.chance) || p.chance < 0 || p.chance > 1) err(w, 'pocket.chance must be a number from 0 to 1');
    if (!Array.isArray(p.contents) || !p.contents.length) err(w, 'pocket.contents needs at least one item id');
    for (const id of p.contents || []) if (!itemKinds.has(id)) err(w, `pocket content "${id}" is not an item`);
  };
  for (const g of garments) {
    const w = `wardrobe/garments/${g.id}`;
    if (!(g.patterns || []).length) err(w, 'needs at least one pattern');
    if (g.pocket) checkPocket(g.pocket, w);
    if (!artIds.has(g.art)) err(w, `art "${g.art}" not found`);
    if (g.fold !== null && !foldIds.has(g.fold)) err(w, `fold "${g.fold}" not found`);
    for (const f of g.fabrics || []) if (!fabricIds.has(f)) err(w, `fabric "${f}" not found`);
    for (const p of g.patterns || []) if (!patternIds.has(p)) err(w, `pattern "${p}" not found`);
    if (!(g.fabrics || []).length) err(w, 'needs at least one fabric');
  }
  for (const it of items) {
    const w = `items/${it.id}`;
    if (!existsSync(join(ROOT, 'items', `${it.id}.json`))) err(w, 'file name must match the id');
    if (!it.name) err(w, 'needs a name');
    if (!KINDS.includes(it.kind)) err(w, `kind must be one of ${KINDS.join(', ')}`);
    if (!BINS.includes(it.bin)) err(w, `bin must be one of ${BINS.join(', ')}`);
    if (!artIds.has(it.art)) err(w, `art "${it.art}" not found`);
    if (it.fold !== null && it.fold !== undefined && !foldIds.has(it.fold)) err(w, `fold "${it.fold}" not found`);
    if (!/^#[0-9a-f]{6}$/i.test(it.color || '')) err(w, 'color must look like #a1b2c3');
    if (it.pattern && !patternIds.has(it.pattern)) err(w, `pattern "${it.pattern}" not found`);
    if (!it.care || !TEMPS.includes(it.care.maxTemp)) err(w, 'care.maxTemp must be cold, warm or hot');
    if (it.kind === 'trap' && it.bin !== 'nowash') err(w, 'traps go in the nowash bin');
    if (it.onWrong && it.onWrong.fact && !facts.has(it.onWrong.fact)) err(w, `fact "${it.onWrong.fact}" is not in messages/templates.json factPriority`);
    if (it.season && !seasons.some((s) => s.id === it.season)) err(w, `season "${it.season}" not found`);
    const c = it.care || {};
    for (const k of ['gentle', 'bleach', 'dryer', 'shrinks']) if (typeof c[k] !== 'boolean') err(w, `care.${k} must be true or false`);
    if (it.rarity !== undefined && !RARITY_IDS.includes(it.rarity)) err(w, `rarity must be one of ${RARITY_IDS.join(', ')}`);
    if (it.bleeder !== undefined && !(isNum(it.bleeder) && it.bleeder >= 0 && it.bleeder <= 1)) err(w, 'bleeder must be a number from 0 to 1');
    if (it.pair !== undefined && typeof it.pair !== 'boolean') err(w, 'pair must be true or false');
    if (it.kind === 'trap' && it.fold !== null) err(w, 'traps have "fold": null');
    if (!Array.isArray(it.tags) || !it.tags.every((x) => typeof x === 'string' && x)) err(w, 'tags must be a list of care tag words');
    if (it.onWrong && it.onWrong.damage !== undefined && !DAMAGE.includes(it.onWrong.damage)) err(w, `onWrong.damage must be one of ${DAMAGE.join(', ')}`);
    if (it.unlock !== null && it.unlock !== undefined && !(it.unlock.type === 'cleanStreak' && Number.isInteger(it.unlock.count) && it.unlock.count >= 1)) err(w, 'unlock must be null or { "type": "cleanStreak", "count": 3 }');
    if (it.pocket) checkPocket(it.pocket, w);
  }
  for (const s of seasons) {
    const dir = join(ROOT, 'seasons', s.id);
    if (!existsSync(dir)) { err(`seasons/${s.id}`, 'folder not found (config/seasons.json lists it)'); continue; }
    if (!existsSync(join(dir, 'season.json')) && !existsSync(join(dir, 'README.md'))) err(`seasons/${s.id}`, 'needs a season.json, or a README.md while it is waiting to be built');
    if (existsSync(join(dir, 'season.json')) && s.name === undefined) err(`seasons/${s.id}`, 'season.json needs a name');
  }
  for (const f of listDir('seasons')) if (!f.includes('.') && !seasons.some((s) => s.id === f)) err(`seasons/${f}`, 'not listed in config/seasons.json');
  const itemIds = new Set(items.map((i) => i.id));
  for (const f of listDir('items')) if (f.endsWith('.json') && f !== 'index.json' && !itemIds.has(f.replace(/\.json$/, ''))) err(`items/${f}`, 'not listed in items/index.json');
  for (const s of seasons) for (const id of s.itemIds || []) if (!itemIds.has(id)) err(`seasons/${s.id}`, `item "${id}" not found`);
  for (const p of checkShape(game, GAME_SHAPE)) err('config/game.json', p);
  if (game.tiles && game.tiles.count % game.tiles.columns !== 0) err('config/game.json', 'tiles.count must fill whole rows of tiles.columns');
  if (game.tiles && game.tiles.traps + game.tiles.bonus[1] + 2 > game.tiles.count) err('config/game.json', 'the day needs room for the traps, the bonus items and the sock pair');
  for (const [k, v] of Object.entries(game.rarity || {})) if (!(v > 0)) err('config/game.json', `rarity.${k} must be above 0`);
  for (const id of game.closet.startColors) if (!colorIds.has(id)) err('config/game.json', `start color "${id}" not found`);
  for (const id of game.closet.startPatterns) if (!patternIds.has(id)) err('config/game.json', `start pattern "${id}" not found`);
  for (const id of game.closet.unlockOrder) if (!colorIds.has(id) && !patternIds.has(id)) err('config/game.json', `unlock "${id}" is not a color or pattern`);
  const T = 'messages/templates.json';
  for (const f of PLAN_FACTS) if (!templates.factPriority.includes(f)) err(T, `fact "${f}" is missing from factPriority`);
  for (const f of templates.factPriority) {
    const notes = templates.houseNotes[f];
    if (!Array.isArray(notes) || notes.length < 2 || !notes.every((n) => typeof n === 'string' && n.trim())) err(T, `fact "${f}" needs at least two house notes`);
    const fb = templates.noteFallback && templates.noteFallback.byFact && templates.noteFallback.byFact[f];
    if (!Array.isArray(fb) || !fb.length) err(T, `fact "${f}" needs a fallback line in noteFallback.byFact`);
  }
  if (!templates.noteFallback || !Array.isArray(templates.noteFallback.headline) || !templates.noteFallback.headline.length) err(T, 'noteFallback.headline needs at least one line');
  const titleIds = new Set();
  for (const ti of templates.titles || []) {
    if (!TITLE_RULES[ti.rule]) err(T, `title "${ti.name}" uses the rule "${ti.rule}", which does not exist (try ${Object.keys(TITLE_RULES).join(', ')})`);
    if (!ti.name || !ti.id) err(T, 'every title needs an id and a name');
    if (titleIds.has(ti.id)) err(T, `duplicate title id "${ti.id}"`);
    titleIds.add(ti.id);
  }
  if (typeof templates.defaultTitle !== 'string' || !templates.defaultTitle) err(T, 'defaultTitle is missing');
  for (const k of SIGNS) if (typeof (templates.signs || {})[k] !== 'string') err(T, `signs.${k} is missing`);
  for (const k of SCREEN_TEXT) if (!(templates.screens || {})[k]) err(T, `screens.${k} is missing`);
  for (const [k, v] of Object.entries(templates.screens || {})) if (typeof v !== 'string' && !Array.isArray(v)) err(T, `screens.${k} must be text`);
  for (const [id, s] of Object.entries(manifest.sounds)) {
    if (s.core !== false && !RECIPES[id]) err('sounds/default/manifest.json', `core sound "${id}" has no stand-in recipe`);
    if (s.file && !existsSync(join(ROOT, 'sounds', manifest.pack || 'default', s.file))) err('sounds/default/manifest.json', `file for "${id}" not found: ${s.file}`);
    if (!s.caption) err('sounds/default/manifest.json', `"${id}" needs a caption`);
    if (s.loopStart !== undefined && !(isNum(s.loopStart) && s.loopStart >= 0)) err('sounds/default/manifest.json', `"${id}" loopStart must be a number, 0 or more`);
    if (s.loopEnd !== undefined && s.loopEnd !== null && !(isNum(s.loopEnd) && s.loopEnd > (s.loopStart || 0))) err('sounds/default/manifest.json', `"${id}" loopEnd must be null (the end of the file) or a number after loopStart`);
    if ((s.loopStart !== undefined || s.loopEnd !== undefined) && !s.loop) err('sounds/default/manifest.json', `"${id}" has loop points but is not a loop`);
  }
  // Every recording in the sound pack has to be credited (PLAN section 18).
  const credits = existsSync(join(ROOT, 'sounds', 'CREDITS.md')) ? readFileSync(join(ROOT, 'sounds', 'CREDITS.md'), 'utf8') : '';
  for (const f of listDir(join('sounds', manifest.pack || 'default'))) if (f.endsWith('.mp3') && !credits.includes(f)) err('sounds/CREDITS.md', `"${f}" is in the sound pack but not listed (add a row)`);
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = checkData();
  if (errors.length) {
    console.error(`Found ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    process.exit(1);
  }
  console.log('All data looks good.');
}
