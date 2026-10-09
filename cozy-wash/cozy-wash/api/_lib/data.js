// Reads the game's data files from disk (used by the API, the tools and the tests).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexData } from '../../src/engine/generate.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const readJSON = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

/** Load every list file plus the per-id files it names. */
export function loadRaw() {
  const items = readJSON('items/index.json').map((id) => readJSON(`items/${id}.json`));
  const garments = readJSON('wardrobe/garments/index.json').map((id) => readJSON(`wardrobe/garments/${id}.json`));
  const seasons = readJSON('config/seasons.json').map((s) => {
    const p = `seasons/${s.id}/season.json`;
    return existsSync(join(ROOT, p)) ? { ...readJSON(p), id: s.id } : { id: s.id };
  });
  return {
    game: readJSON('config/game.json'),
    model: readJSON('config/model.json'),
    templates: readJSON('messages/templates.json'),
    manifest: readJSON('sounds/default/manifest.json'),
    colors: readJSON('wardrobe/colors.json'),
    patterns: readJSON('wardrobe/patterns.json'),
    fabrics: readJSON('wardrobe/fabrics.json'),
    items,
    garments,
    seasons,
    art: readJSON('art/index.json').map((id) => readJSON(`art/${id}.json`)),
    folds: readJSON('folds/index.json').map((id) => readJSON(`folds/${id}.json`)),
  };
}

let cached = null;

/** Indexed data with every season's colors and patterns, so any saved id can be named. */
export function loadData() {
  if (cached) return cached;
  const raw = loadRaw();
  const season = {
    colors: raw.seasons.flatMap((s) => s.colors || []),
    patterns: raw.seasons.flatMap((s) => s.patterns || []),
  };
  const items = [...raw.items, ...raw.seasons.flatMap((s) => s.items || [])];
  const data = indexData({ ...raw, items, season });
  cached = { raw, data };
  return cached;
}

export const listDir = (rel) => readdirSync(join(ROOT, rel));
