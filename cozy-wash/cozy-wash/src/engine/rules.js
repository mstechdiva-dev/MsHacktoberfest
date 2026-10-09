// Wash and dry rules (PLAN section 7). Pure functions: the code decides every outcome.

const TEMP_RANK = { cold: 0, warm: 1, hot: 2 };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** Every item in the drum is an instance: { uid, item, state }. state holds flags like pink, stained. */
export function freshState() {
  return { pink: false, stained: false, ruined: false, shrunk: false, stretched: false, linted: false, grubby: false, teddyFlat: false, removed: false };
}

const isTrapLike = (inst) => inst.item.kind === 'trap' || inst.item.kind === 'pocket';

/**
 * Run one wash (or rewash) on a load.
 * @param {{bin:string, items:Array<{uid:string,item:object,state:object}>}} load items in drum order
 * @param {{machine:string, cycle:'normal'|'gentle', water:'cold'|'warm'|'hot', detergent:number, softener:number, bleach:number, rescue:number, rewash?:boolean}} settings
 * @param {{next:()=>number}} rng
 * @param {object} cfg config/game.json
 * @returns {{changes:Record<string,object>, events:{suds:boolean, heavyBleach:boolean, bleed:boolean}, facts:string[]}}
 */
export function computeOutcome(load, settings, rng, cfg) {
  const r = cfg.rules;
  const facts = new Set();
  const changes = {}; // uid -> partial state
  const set = (uid, k, v = true) => { (changes[uid] = changes[uid] || {})[k] = v; };
  const cur = (inst, k) => (changes[inst.uid] && k in changes[inst.uid] ? changes[inst.uid][k] : inst.state[k]);
  const items = load.items.filter((i) => !i.state.removed);
  const clothes = items.filter((i) => !isTrapLike(i));
  const temp = settings.water;
  const events = { suds: false, heavyBleach: false, bleed: false };

  // Rewash: try to fix pink and stains first.
  if (settings.rewash) {
    const p = Math.min(r.rewashMax, r.rewashBase + r.rewashPerBleach * settings.bleach + r.rewashRescue * (settings.rescue > 0 ? 1 : 0) + (temp !== 'cold' ? r.rewashNotCold : 0));
    const needs = clothes.filter((i) => i.state.pink || i.state.stained);
    if (needs.length) {
      if (rng.next() < p) {
        needs.forEach((i) => { set(i.uid, 'pink', false); set(i.uid, 'stained', false); });
        facts.add('rewash_fixed');
      } else facts.add('rewash_faded');
    }
    if (settings.detergent > 0) clothes.filter((i) => i.state.grubby).forEach((i) => set(i.uid, 'grubby', false));
  }

  // Bleed
  const whites = clothes.filter((i) => i.item.isWhite && !cur(i, 'pink') && !cur(i, 'ruined'));
  const bleeders = clothes.filter((i) => i.item.bleeder > 0 && !i.item.isWhite);
  if (whites.length) {
    for (const b of bleeders) {
      const p = clamp(b.item.bleeder + (r.bleedTemp[temp] || 0) + r.bleedPerBleach * settings.bleach, 0, r.bleedMax);
      if (rng.next() < p) {
        whites.forEach((w) => set(w.uid, 'pink'));
        events.bleed = true;
        facts.add('bleed');
        break;
      }
    }
  }
  // A sock without its partner in the same load is a lost sock.
  const pairCounts = {};
  for (const i of clothes) if (i.item.pairId) pairCounts[i.item.pairId] = (pairCounts[i.item.pairId] || 0) + 1;
  if (Object.values(pairCounts).some((n) => n === 1)) facts.add('lost_sock');
  // Suds
  if (settings.detergent >= r.sudsDetergent || (settings.detergent >= r.sudsComboDetergent && settings.softener >= r.sudsComboSoftener)) {
    events.suds = true;
    facts.add('suds');
  }
  // No detergent
  if (settings.detergent === 0 && !settings.rewash) {
    clothes.forEach((i) => set(i.uid, 'grubby'));
    facts.add('grubby');
  }
  // Bleach
  if (settings.bleach >= 1) {
    clothes.filter((i) => !i.item.care.bleach && !cur(i, 'ruined')).forEach((i) => { set(i.uid, 'ruined'); facts.add('bleach_ruined'); });
  }
  if (settings.bleach >= r.heavyBleach && clothes.some((i) => !i.item.isWhite && !cur(i, 'ruined'))) {
    events.heavyBleach = true;
    facts.add('colors_tired');
  }
  // Too hot, gentle items, teddy
  for (const i of clothes) {
    if (cur(i, 'ruined')) continue;
    if (TEMP_RANK[temp] > TEMP_RANK[i.item.care.maxTemp] && i.item.care.shrinks && !cur(i, 'shrunk')) { set(i.uid, 'shrunk'); facts.add('shrunk'); }
    if (i.item.care.gentle && settings.cycle === 'normal' && !cur(i, 'shrunk') && !cur(i, 'stretched')) { set(i.uid, 'stretched'); facts.add('stretched'); }
    if (i.item.id === 'teddy-bear' && temp === 'hot') { set(i.uid, 'teddyFlat'); facts.add('teddy_flat'); }
  }
  // Traps and pocket contents
  const order = items;
  const neighbors = (idx) => [order[idx - 1], order[idx + 1]].filter((x) => x && !isTrapLike(x));
  order.forEach((inst, idx) => {
    if (!isTrapLike(inst)) return;
    const w = inst.item.onWrong || { damage: 'none' };
    if (w.fact) facts.add(w.fact);
    if (inst.item.lint) clothes.filter((c) => c.item.bin === 'dark').forEach((c) => set(c.uid, 'linted'));
    if (w.damage === 'self' || w.damage === 'neighbors') set(inst.uid, 'ruined');
    if (w.damage === 'neighbors') neighbors(idx).forEach((n) => set(n.uid, 'ruined'));
    if (w.damage === 'stain') { neighbors(idx).forEach((n) => set(n.uid, 'stained')); set(inst.uid, 'ruined'); }
    set(inst.uid, 'removed');
  });
  // Ruined clothes leave the load
  clothes.forEach((i) => { if (cur(i, 'ruined')) set(i.uid, 'removed'); });
  if (!facts.size) facts.add('clean');
  return { changes, events, facts: [...facts] };
}

/** Apply a changes map to instances (mutates). Returns how many items were newly ruined. */
export function applyChanges(instances, changes) {
  let ruined = 0;
  for (const inst of instances) {
    const c = changes[inst.uid];
    if (!c) continue;
    if (c.ruined && !inst.state.ruined) ruined++;
    Object.assign(inst.state, c);
  }
  return ruined;
}

/**
 * Drying (PLAN 7a). Items on the rack never shrink; Hang dry items in the dryer do.
 * @returns {{changes:Record<string,object>, facts:string[], sheet:boolean}}
 */
export function computeDry(instances, { sheet, rackUids }) {
  const rack = new Set(rackUids || []);
  const facts = new Set();
  const changes = {};
  for (const inst of instances) {
    if (inst.state.removed) continue;
    if (rack.has(inst.uid)) { if (!inst.item.care.dryer) facts.add('rack_saved'); continue; }
    if (!inst.item.care.dryer && !inst.state.shrunk) { changes[inst.uid] = { shrunk: true }; facts.add('dryer_shrunk'); }
  }
  const anyInDryer = instances.some((i) => !i.state.removed && !rack.has(i.uid));
  if (anyInDryer) facts.add(sheet ? 'fresh' : 'static');
  return { changes, facts: [...facts], sheet: anyInDryer ? Boolean(sheet) : null };
}

/**
 * Score for a load from the current state of its items plus wash events (PLAN section 7).
 * @param {{items:Array, ruinedCount:number, events:object, dry?:{sheet:boolean}}} load
 */
export function scoreLoad(load, cfg) {
  const s = cfg.score;
  let score = 100;
  const live = load.items.filter((i) => !i.state.removed);
  score += s.ruined * (load.ruinedCount || 0);
  if (live.some((i) => i.state.pink)) score += s.bleed;
  if (load.events && load.events.suds) score += s.suds;
  if (load.events && load.events.heavyBleach) score += s.heavyBleach;
  for (const i of live) {
    if (i.state.shrunk) score += s.shrunk;
    if (i.state.stretched) score += s.stretched;
    if (i.state.stained) score += s.stained;
    if (i.state.linted) score += s.lint;
  }
  if (live.some((i) => i.state.grubby)) score += s.grubby;
  if (load.dry && load.dry.sheet !== null && load.dry.sheet !== undefined) score += load.dry.sheet ? s.fresh : s.static;
  return clamp(Math.round(score), 0, 100);
}

/** Whether a load can be rewashed. */
export function needsRewash(load, cfg) {
  return (load.rewashes || 0) < cfg.rules.rewashLimit && load.items.some((i) => !i.state.removed && (i.state.pink || i.state.stained || i.state.grubby));
}

/** The most serious fact, for the house note. */
export function topFact(facts, priority) {
  for (const f of priority) if (facts.includes(f)) return f;
  return facts[0] || 'clean';
}
