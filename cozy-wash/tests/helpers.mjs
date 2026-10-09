// Shared test setup: the real data files, indexed the way the browser does it.
import { loadRaw } from '../api/_lib/data.js';
import { indexData } from '../src/engine/generate.js';

export function setup(seasonId = null) {
  const raw = loadRaw();
  const season = seasonId ? raw.seasons.find((s) => s.id === seasonId) : null;
  const data = indexData({ ...raw, season });
  data.art = Object.fromEntries(raw.art.map((a) => [a.id, a]));
  data.folds = Object.fromEntries(raw.folds.map((f) => [f.id, f]));
  const cfg = raw.game;
  const closet = { colors: [...cfg.closet.startColors], patterns: [...cfg.closet.startPatterns] };
  return { raw, data, cfg, closet, templates: raw.templates };
}
