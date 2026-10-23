// Builds the end-of-day receipt (PLAN section 13). Pure functions.

const BIN_NAMES = { white: 'Whites', dark: 'Darks', color: 'Colors', delicate: 'Delicates' };

/** Title rules, referenced by name from messages/templates.json. */
export const TITLE_RULES = {
  bleedHappened: (d) => d.loads.some((l) => l.facts.includes('bleed')),
  catCaught: (d) => d.trapsCaught.some((t) => t.id === 'sleepy-cat'),
  allPocketsChecked: (d) => d.pocketsTotal > 0 && d.pocketsChecked >= d.pocketsTotal,
  allPairsMatched: (d) => d.pairsTotal > 0 && d.socksPaired >= d.pairsTotal,
  allLoadsAbove90: (d) => d.loads.length > 0 && d.loads.every((l) => l.score >= 90),
  noDryerSheets: (d) => d.counts.dried > 0 && d.sheets === 0,
};

/** First matching title in priority order, else the default. */
export function pickTitle(day, templates) {
  for (const t of templates.titles || []) {
    const rule = TITLE_RULES[t.rule];
    if (rule && rule(day)) return t.name;
  }
  return templates.defaultTitle || 'Laundry Star';
}

/** "Thu Oct 08 2026  4:12 PM", the way the plan prints it. */
export function receiptStamp(when) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).formatToParts(when).map((p) => [p.type, p.value]));
  const time = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ');
  return `${parts.weekday} ${parts.month} ${parts.day} ${parts.year}  ${time}`;
}

/** Fill a line out to the receipt's width, with spaces or a dotted leader. */
const pad = (left, right, width = 32, leader = false) => {
  const l = String(left);
  const r = String(right);
  const gap = Math.max(1, width - l.length - r.length);
  if (leader && gap >= 4) return `${l} ${'.'.repeat(gap - 2)} ${r}`;
  return l + ' '.repeat(gap) + r;
};

/**
 * @param {object} day summary of the day
 * @param {object} templates messages/templates.json
 * @param {{note:string, when:Date, busy?:boolean}} extra
 * @returns {{title:string, rows:Array<[string,string]|'cut'|string>, text:string}}
 */
export function buildReceipt(day, templates, extra) {
  const title = pickTitle(day, templates);
  const when = extra.when || new Date();
  const stamp = receiptStamp(when);
  const rows = [];
  rows.push({ center: 'COZY WASH', strong: true }, { center: 'example.com' }, { center: stamp }, 'cut');
  rows.push(['LOADS', String(day.loads.length)]);
  for (const l of day.loads) {
    rows.push([`  ${BIN_NAMES[l.bin] || l.bin}`, `${l.score} / 100`, 'dots']);
    if (l.facts.includes('bleed')) rows.push({ left: `    (${l.facts.includes('rewash_fixed') ? 'pink, fixed on rewash' : 'pink'})`, sub: true });
  }
  rows.push('cut');
  rows.push(['Washed', String(day.counts.washed)]);
  rows.push(['Dried', String(day.counts.dried)]);
  rows.push(['Hung on rack', String(day.counts.hung || 0)]);
  rows.push(['Folded', String(day.counts.folded)]);
  rows.push(['Pockets checked', String(day.pocketsChecked)]);
  const traps = day.trapsCaught.map((t) => t.short || t.name.toLowerCase());
  rows.push(['Traps caught', traps.length ? `${traps.length} (${traps.join(', ')})` : '0']);
  rows.push(['Socks paired', String(day.socksPaired)]);
  if (day.tidy > 0) rows.push([(templates.screens && templates.screens.receiptTidy) || 'Tidy bonus', `+${day.tidy}`]);
  for (const s of day.lostSocks || []) rows.push([(templates.screens && templates.screens.lostSock) || 'Lost sock?', s.name.toLowerCase()]);
  rows.push(['Rewashes', String(day.rewashes || 0)]);
  rows.push(['Dryer sheets', String(day.sheets)]);
  const paid = [];
  if (day.paid.coin) paid.push(`coin x${day.paid.coin}`);
  if (day.paid.tap) paid.push(`tap x${day.paid.tap}`);
  rows.push(['Paid with', paid.join(', ') || '-']);
  if (day.newCloset) rows.push(['New in your closet', day.newCloset]);
  if (day.newShelf && day.newShelf.length) rows.push([(templates.screens && templates.screens.receiptShelf) || 'New on your shelf', day.newShelf.join(', ')]);
  rows.push('cut', { center: `TITLE: ${title}`, strong: true }, 'cut');
  rows.push({ left: "Attendant's note:" }, { left: `"${extra.note}"`, note: true });
  if (extra.busy && templates.signs && templates.signs.busy) rows.push({ left: templates.signs.busy });
  rows.push('cut');
  for (const line of (templates.screens && templates.screens.receiptThanks) || []) rows.push({ center: line });
  const text = rows.map((r) => {
    if (r === 'cut') return '-'.repeat(32);
    if (Array.isArray(r)) return pad(r[0], r[1], 32, r[2] === 'dots');
    return r.center || r.left || '';
  }).join('\n');
  return { title, rows, text };
}

/** Facts sent to the model (server rebuilds names from ids). */
export function recapPayload(day) {
  return {
    loads: day.loads.map((l) => ({
      bin: l.bin,
      itemIds: l.itemIds.slice(0, 20),
      settings: l.settings,
      facts: l.facts.slice(0, 12),
      score: l.score,
      rewashes: l.rewashes || 0,
    })).slice(0, 6),
    summary: {
      trapIdsCaught: day.trapsCaught.map((t) => t.id).slice(0, 10),
      pocketsChecked: day.pocketsChecked,
      socksPaired: day.socksPaired,
      folded: day.counts.folded,
    },
  };
}

/** A fallback note from templates, from the day's facts. */
export function fallbackNote(day, templates, rng = Math.random) {
  const facts = day.loads.flatMap((l) => l.facts);
  const byFact = (templates.noteFallback && templates.noteFallback.byFact) || {};
  for (const f of templates.factPriority || []) {
    if (facts.includes(f) && byFact[f] && f !== 'clean') return byFact[f][0];
  }
  if (day.trapsCaught.some((t) => t.id === 'sleepy-cat')) return 'Nice job catching the cat before the wash.';
  const heads = (templates.noteFallback && templates.noteFallback.headline) || ['Thanks for washing with us today.'];
  return heads[Math.floor(rng() * heads.length)];
}
