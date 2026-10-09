// Makes clothes from garment × color × pattern × fabric (PLAN section 6).
// Pure functions: used by the browser, the API and the tests.

const BIN_TAG = {
  white: 'Wash with whites',
  dark: 'Wash with darks',
  color: 'Wash with colors',
  delicate: 'Gentle cycle',
};

/** Build lookup maps from arrays of data. */
export function indexData({ garments, colors, patterns, fabrics, items, season }) {
  const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));
  const data = {
    garments: byId(garments),
    colors: byId([...(colors || []), ...((season && season.colors) || [])]),
    patterns: byId([...(patterns || []), ...((season && season.patterns) || [])]),
    fabrics: byId(fabrics),
    items: byId(items),
    season: season || null,
  };
  return data;
}

/** Turn a care object into care-tag words. */
export function careTags(bin, care, bleed) {
  const tags = [BIN_TAG[bin] || 'Do not wash'];
  if (bin !== 'delicate' && care.gentle) tags.push('Gentle cycle');
  if (care.maxTemp === 'cold') tags.push('Cold water only');
  else if (care.maxTemp === 'warm') tags.push('Warm max');
  if (!care.bleach) tags.push('No bleach');
  if (!care.dryer) tags.push('Hang dry');
  if (bleed >= 0.25) tags.unshift('Bleeds');
  return tags;
}

/** Build the display name: color, pattern (unless solid), fabric (unless cotton), garment. */
export function pieceName(garment, color, pattern, fabric) {
  const parts = [color.name];
  if (pattern && pattern.id !== 'solid' && pattern.name) parts.push(pattern.name);
  if (fabric && fabric.id !== 'cotton') parts.push(fabric.name);
  parts.push(garment.name);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function genId(g, c, p, f) {
  return `gen:${g}:${c}:${p}:${f}`;
}

export function parseGenId(id) {
  if (typeof id !== 'string' || !id.startsWith('gen:')) return null;
  const [, garment, color, pattern, fabric] = id.split(':');
  if (!garment || !color || !pattern || !fabric) return null;
  return { garment, color, pattern, fabric };
}

/** Make one generated piece. Returns null if a part is unknown. */
export function makePiece(data, garmentId, colorId, patternId, fabricId) {
  const g = data.garments[garmentId];
  const c = data.colors[colorId];
  const p = data.patterns[patternId];
  const f = data.fabrics[fabricId];
  if (!g || !c || !p || !f) return null;
  const care = { ...f.care };
  const bin = care.gentle ? 'delicate' : c.bin;
  const bleed = Math.min(0.95, (c.bleed || 0) + (f.bleedBonus || 0));
  const lookAlike = Boolean((c.looksLike && c.looksLike !== bin) || (care.gentle && g.sturdyLooking));
  return {
    id: genId(g.id, c.id, p.id, f.id),
    generated: true,
    name: pieceName(g, c, p, f),
    kind: 'everyday',
    garment: g.id,
    art: g.art,
    fold: g.fold,
    color: c.hex,
    colorId: c.id,
    pattern: p.id,
    patternSvg: p.svg,
    fabric: f.id,
    care,
    bin,
    isWhite: c.bin === 'white',
    bleeder: bleed > 0 ? bleed : 0,
    tags: careTags(bin, care, bleed),
    pair: Boolean(g.pair),
    pocket: g.pocket || null,
    lookAlike,
    looksLike: c.looksLike || (lookAlike ? 'sturdy' : null),
    onWrong: { damage: 'none', fact: null },
  };
}

/** Normalize a hand-made item file into the same shape as a generated piece. */
export function namedPiece(data, id) {
  const it = data.items[id];
  if (!it) return null;
  return {
    ...it,
    generated: false,
    patternSvg: (data.patterns[it.pattern] && data.patterns[it.pattern].svg) || 'solid',
    isWhite: it.bin === 'white',
    bleeder: it.bleeder || 0,
    lookAlike: Boolean(it.lookAlike),
    looksLike: it.looksLike || null,
  };
}

/** Rebuild any item (named or generated) from its id. */
export function pieceFromId(data, id) {
  const gen = parseGenId(id);
  if (gen) return makePiece(data, gen.garment, gen.color, gen.pattern, gen.fabric);
  return namedPiece(data, id);
}

/**
 * Pick a random piece from what the player's closet allows.
 * @param {object} data indexed data
 * @param {object} rng from makeRng
 * @param {{colors:string[], patterns:string[], gentle?:boolean, garment?:string, lookAlike?:boolean}} opts
 */
export function randomPiece(data, rng, opts) {
  const colorIds = opts.colors.filter((c) => data.colors[c]);
  const patternIds = opts.patterns.filter((p) => data.patterns[p]);
  // A season's patterns can go on any garment that already takes a printed pattern (stripes).
  const seasonPatterns = ((data.season && data.season.patterns) || []).map((p) => p.id);
  const patternsFor = (g) => (g.patterns.includes('stripes') ? [...g.patterns, ...seasonPatterns] : g.patterns);
  let garments = Object.values(data.garments).filter((g) => {
    if (opts.garment && g.id !== opts.garment) return false;
    if (!opts.garment && g.pair) return false; // socks only come as the day's pair
    if (!patternsFor(g).some((p) => patternIds.includes(p))) return false;
    if (opts.gentle && !g.fabrics.some((f) => data.fabrics[f] && data.fabrics[f].care.gentle)) return false;
    return true;
  });
  if (!garments.length) garments = Object.values(data.garments).filter((g) => g.patterns.includes('solid'));
  for (let attempt = 0; attempt < 40; attempt++) {
    const g = rng.pick(garments);
    let fabrics = g.fabrics.filter((f) => data.fabrics[f]);
    if (opts.gentle) fabrics = fabrics.filter((f) => data.fabrics[f].care.gentle);
    if (!fabrics.length) continue;
    const pats = patternsFor(g).filter((p) => patternIds.includes(p));
    const pattern = pats.length ? rng.pick(pats) : 'solid';
    let colors = colorIds;
    if (opts.lookAlike) colors = colorIds.filter((c) => data.colors[c].looksLike);
    if (!colors.length) colors = colorIds;
    const piece = makePiece(data, g.id, rng.pick(colors), pattern, rng.pick(fabrics));
    if (!piece) continue;
    if (opts.lookAlike && !piece.lookAlike) continue;
    return piece;
  }
  return makePiece(data, 'tee', colorIds[0] || 'white', 'solid', 'cotton');
}
