// Builds the day's 16 tiles (PLAN section 4).
import { makeRng } from './rng.js';
import { namedPiece, randomPiece } from './generate.js';

const RARITY = (cfg, it) => (cfg.rarity && cfg.rarity[it.rarity || 'common']) || 1;

/** Key used to compare days for variety. */
export const itemKey = (item) => item.id;

/**
 * @param {object} data indexed data (indexData)
 * @param {object} cfg config/game.json
 * @param {{date:string, closet:{colors:string[], patterns:string[]}, avoid?:string[], salt?:number, unlocked?:string[]}} opts
 * @returns {{date:string, tiles:Array<{uid:string, item:object, pocket:object|null}>}}
 */
export function buildDay(data, cfg, opts) {
  const t = cfg.tiles;
  const avoid = new Set(opts.avoid || []);
  const maxRepeats = t.maxRepeatsFromYesterday ?? 4;
  let best = null;
  for (let salt = 0; salt < 25; salt++) {
    const day = buildOnce(data, cfg, opts, salt, avoid);
    const repeats = day.tiles.filter((x) => avoid.has(itemKey(x.item))).length;
    if (repeats <= maxRepeats) return day;
    if (!best || repeats < best.repeats) best = { day, repeats };
  }
  return best.day;
}

function buildOnce(data, cfg, opts, salt, avoid) {
  const t = cfg.tiles;
  const rng = makeRng(`${opts.date}#${salt}`);
  const closet = opts.closet;
  const unlocked = new Set(opts.unlocked || []);
  const named = Object.values(data.items);
  const usable = (it) => !it.unlock || unlocked.has(it.id);
  const notAvoided = (it) => !avoid.has(it.id);
  const pickWeighted = (pool) => {
    const fresh = pool.filter(notAvoided);
    return rng.weighted(fresh.length ? fresh : pool, (it) => RARITY(cfg, it));
  };

  const chosen = [];
  // 1. Traps
  let trapPool = named.filter((it) => it.kind === 'trap' && usable(it));
  for (let i = 0; i < t.traps && trapPool.length; i++) {
    const it = pickWeighted(trapPool);
    trapPool = trapPool.filter((x) => x.id !== it.id);
    chosen.push(namedPiece(data, it.id));
  }
  // 2. Bonus items (a season item may take one slot)
  const [bmin, bmax] = t.bonus;
  const bonusCount = rng.range(bmin, bmax);
  const seasonId = data.season && data.season.id;
  let bonusPool = named.filter((it) => it.kind === 'bonus' && usable(it) && !it.season);
  const seasonPool = seasonId
    ? named.filter((it) => it.kind === 'bonus' && it.season === seasonId && (data.season.itemIds || []).includes(it.id))
    : [];
  for (let i = 0; i < bonusCount; i++) {
    let it;
    if (i === 0 && seasonPool.length && rng.chance(cfg.seasonItemChance ?? 0.6)) it = rng.pick(seasonPool);
    else if (bonusPool.length) it = pickWeighted(bonusPool);
    if (!it) break;
    bonusPool = bonusPool.filter((x) => x.id !== it.id);
    chosen.push(namedPiece(data, it.id));
  }
  // 3. The sock pair
  let socks;
  const namedPairs = named.filter((it) => it.pair && it.kind === 'everyday');
  if (namedPairs.length && rng.chance(0.5)) socks = namedPiece(data, rng.pick(namedPairs).id);
  else socks = randomPiece(data, rng, { ...closet, garment: 'socks' });
  const pairId = `pair-${rng.int(1e6)}`;
  // 4. Generated clothes for the rest
  const restCount = t.count - chosen.length - 2;
  const rest = [];
  for (let i = 0; i < restCount; i++) {
    let piece = null;
    for (let tries = 0; tries < 6; tries++) {
      piece = randomPiece(data, rng, closet);
      if (!avoid.has(piece.id) && !rest.some((r) => r.id === piece.id)) break;
    }
    rest.push(piece);
  }
  let everything = [...chosen, ...rest];
  const nonTrap = () => everything.filter((x) => x.kind !== 'trap').concat([socks]);
  // Swap a plain generated piece for a needed one, without emptying another bin.
  const replaceOneGenerated = (piece) => {
    const counts = {};
    nonTrap().forEach((x) => { counts[x.bin] = (counts[x.bin] || 0) + 1; });
    const spare = (x) => x.generated && !x.locked && counts[x.bin] > 1;
    let idx = everything.findIndex((x) => spare(x) && !x.lookAlike && x.bin !== 'delicate');
    if (idx < 0) idx = everything.findIndex(spare);
    if (idx < 0) idx = everything.findIndex((x) => x.generated && !x.locked);
    if (idx >= 0) everything[idx] = piece;
    else everything.push(piece);
    piece.locked = true;
  };
  // Guarantees: at least one look-alike, one delicate, three different bins.
  if (nonTrap().filter((x) => x.lookAlike).length < (t.minLookAlikes ?? 1)) {
    const named2 = named.filter((it) => it.lookAlike && usable(it));
    const piece = named2.length && rng.chance(0.5)
      ? namedPiece(data, rng.pick(named2).id)
      : randomPiece(data, rng, { ...closet, colors: Object.keys(data.colors), lookAlike: true });
    replaceOneGenerated(piece);
  }
  if (nonTrap().filter((x) => x.bin === 'delicate').length < (t.minDelicates ?? 1)) {
    replaceOneGenerated(randomPiece(data, rng, { ...closet, gentle: true }));
  }
  for (const bin of ['white', 'dark', 'color']) {
    const bins = new Set(nonTrap().map((x) => x.bin));
    if (!bins.has(bin)) {
      const colors = closet.colors.filter((c) => data.colors[c] && data.colors[c].bin === bin);
      if (colors.length) {
        let piece = null;
        for (let tries = 0; tries < 12 && (!piece || piece.bin !== bin); tries++) piece = randomPiece(data, rng, { ...closet, colors });
        replaceOneGenerated(piece);
      }
    }
  }
  // Instances with unique ids
  let n = 0;
  const inst = (piece, extra = {}) => ({ uid: `t${n++}`, item: { ...piece, locked: undefined, ...extra }, pocket: null });
  const tiles = everything.map((p) => inst(p));
  tiles.push(inst(socks, { pairId }), inst(socks, { pairId }));
  // 5. Pockets
  const trapIds = new Set(tiles.filter((x) => x.item.kind === 'trap').map((x) => x.item.id));
  const pocketHosts = rng.shuffle(tiles.filter((x) => x.item.kind !== 'trap' && x.item.pocket && !x.item.pairId));
  const fallbackHosts = rng.shuffle(tiles.filter((x) => x.item.generated && !x.item.pairId && !x.item.pocket));
  const hosts = [...pocketHosts, ...fallbackHosts].slice(0, t.pockets);
  for (const host of hosts) {
    const contents = ((host.item.pocket && host.item.pocket.contents) || ['tissue', 'coin', 'pen', 'phone', 'crayon'])
      .filter((id) => data.items[id] && (t.allowSameTrapInPocket || !trapIds.has(id)));
    if (!contents.length) continue;
    const id = rng.pick(contents);
    host.pocket = { uid: `p${n++}`, item: { ...namedPiece(data, id), kind: data.items[id].kind === 'trap' ? 'trap' : 'pocket', fromPocket: true } };
  }
  return { date: opts.date, salt, tiles: rng.shuffle(tiles) };
}

/** Yesterday's date string (YYYY-MM-DD) for a given date string. */
export function previousDate(date) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
