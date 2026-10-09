// Saved data (PLAN section 14). Everything lives under one localStorage key.

const KEY = 'cozywash:v1';

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function defaultSave(cfg) {
  return {
    settings: { sound: false, volume: 0.8, captions: false, roomTone: false, reducedMotion: null },
    game: null,
    playedOn: null,
    receipts: [],
    closet: { colors: [...cfg.closet.startColors], patterns: [...cfg.closet.startPatterns] },
    shelf: [],
    progress: { cleanStreak: 0, days: 0 },
    counts: { washed: 0, dried: 0, hung: 0, folded: 0 },
    bests: { bestDayScore: 0, titles: [] },
    lastDayKeys: [],
  };
}

const isObj = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isStrings = (x) => Array.isArray(x) && x.every((v) => typeof v === 'string');
const num = (x, fallback) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);

/** A game in progress has to have every part the screens read; if not, it is dropped rather than risk a crash. */
const isGame = (g) => isObj(g) && typeof g.date === 'string' && Array.isArray(g.tiles) && Array.isArray(g.loads) && Array.isArray(g.reached)
  && ['instances', 'flipped', 'placed', 'bins', 'pocketChecked', 'paid', 'counts'].every((k) => isObj(g[k]));

/** Take whatever was saved and return a save the game can trust, filling in anything missing or damaged. */
export function sanitizeSave(saved, base) {
  const s = isObj(saved) ? saved : {};
  const counts = isObj(s.counts) ? s.counts : {};
  const bests = isObj(s.bests) ? s.bests : {};
  const progress = isObj(s.progress) ? s.progress : {};
  return {
    settings: { ...base.settings, ...(isObj(s.settings) ? s.settings : {}) },
    game: isGame(s.game) ? s.game : null,
    playedOn: typeof s.playedOn === 'string' ? s.playedOn : null,
    receipts: Array.isArray(s.receipts) ? s.receipts.filter(isObj).slice(0, 7) : [],
    closet: isObj(s.closet) && isStrings(s.closet.colors) && isStrings(s.closet.patterns)
      ? { colors: [...s.closet.colors], patterns: [...s.closet.patterns] }
      : base.closet,
    shelf: Array.isArray(s.shelf) ? s.shelf.filter((x) => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string') : [],
    progress: { cleanStreak: Math.max(0, Math.floor(num(progress.cleanStreak, 0))), days: Math.max(0, Math.floor(num(progress.days, 0))) },
    counts: Object.fromEntries(Object.keys(base.counts).map((k) => [k, Math.max(0, num(counts[k], 0))])),
    bests: { bestDayScore: num(bests.bestDayScore, 0), titles: isStrings(bests.titles) ? bests.titles : [] },
    lastDayKeys: isStrings(s.lastDayKeys) ? s.lastDayKeys : [],
  };
}

export function loadSave(cfg) {
  const base = defaultSave(cfg);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    return sanitizeSave(JSON.parse(raw), base);
  } catch {
    return base;
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearPlayedOn(save) {
  save.playedOn = null;
  writeSave(save);
}

/** Next color or pattern the player hasn't unlocked yet, from the unlock order. */
export function nextUnlock(save, cfg) {
  for (const id of cfg.closet.unlockOrder) {
    if (!save.closet.colors.includes(id) && !save.closet.patterns.includes(id)) return id;
  }
  return null;
}

/**
 * After a finished day: the clean-load streak grows with every clean load and resets on a messy one.
 * Pieces that need a streak (`"unlock": { "type": "cleanStreak", "count": 3 }`) join the shelf once it is long enough.
 * @returns {string[]} names of pieces unlocked today
 */
export function updateProgress(save, loads, cfg, items) {
  const p = save.progress;
  const cleanAt = (cfg.progress && cfg.progress.cleanLoadScore) ?? 90;
  for (const l of loads) p.cleanStreak = l.score >= cleanAt ? p.cleanStreak + 1 : 0;
  p.days = (p.days || 0) + 1;
  const unlocked = [];
  for (const it of items) {
    const u = it.unlock;
    if (!u || u.type !== 'cleanStreak' || p.cleanStreak < u.count) continue;
    if (save.shelf.some((x) => x.id === it.id && x.type === 'unlocked')) continue;
    save.shelf.push({ id: it.id, name: it.name, type: 'unlocked' });
    unlocked.push(it.name);
  }
  return unlocked;
}
