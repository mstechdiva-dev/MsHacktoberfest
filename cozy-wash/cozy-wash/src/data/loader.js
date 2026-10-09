// Loads every data file the game needs (browser side).
import { indexData } from '../engine/generate.js';

const json = async (path) => {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
};

/** Which season is active for a local date (month-day ranges, wrapping over New Year). */
export function activeSeason(seasons, date = new Date(), override = null) {
  if (override) return seasons.find((s) => s.id === override) || null;
  const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return seasons.find((s) => (s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to)) || null;
}

export async function loadAll({ seasonOverride } = {}) {
  const [game, model, seasons, templates, manifest, itemIds, garmentIds, colors, patterns, fabrics, artIds, foldIds] = await Promise.all([
    json('config/game.json'),
    json('config/model.json'),
    json('config/seasons.json'),
    json('messages/templates.json'),
    json('sounds/default/manifest.json'),
    json('items/index.json'),
    json('wardrobe/garments/index.json'),
    json('wardrobe/colors.json'),
    json('wardrobe/patterns.json'),
    json('wardrobe/fabrics.json'),
    json('art/index.json'),
    json('folds/index.json'),
  ]);
  const [items, garments, artList, foldList] = await Promise.all([
    Promise.all(itemIds.map((id) => json(`items/${id}.json`))),
    Promise.all(garmentIds.map((id) => json(`wardrobe/garments/${id}.json`))),
    Promise.all(artIds.map((id) => json(`art/${id}.json`))),
    Promise.all(foldIds.map((id) => json(`folds/${id}.json`))),
  ]);
  const seasonInfo = activeSeason(seasons, new Date(), seasonOverride);
  let season = null;
  if (seasonInfo) {
    try { season = await json(`seasons/${seasonInfo.id}/season.json`); } catch { season = null; }
  }
  const data = indexData({ garments, colors, patterns, fabrics, items, season });
  data.art = Object.fromEntries(artList.map((a) => [a.id, a]));
  data.folds = Object.fromEntries(foldList.map((f) => [f.id, f]));
  // Season house notes join the normal ones.
  if (season && season.houseNotes) {
    for (const [fact, lines] of Object.entries(season.houseNotes)) {
      templates.houseNotes[fact] = [...lines, ...(templates.houseNotes[fact] || [])];
    }
  }
  return { cfg: game, model, templates, manifest, data, season };
}
