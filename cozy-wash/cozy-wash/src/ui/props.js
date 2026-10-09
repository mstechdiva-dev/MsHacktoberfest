// Inline drawings of the laundromat: machines, coin cup, phone, reader, rack, basket, signs.
import { esc } from '../util.js';
import { itemSVG } from './svg.js';

/** Items scattered inside a drum, at fixed angles so they tumble with the drum. */
export function drumItems(instances, data, { size = 150, wet = false, fluffy = false } = {}) {
  const live = instances.filter((i) => !i.state || !i.state.removed);
  const n = Math.max(1, live.length);
  const itemSize = Math.max(34, Math.min(70, size * (n > 5 ? 0.3 : 0.38)));
  const half = itemSize / 2;
  return live.map((inst, i) => {
    const ang = (i / n) * Math.PI * 2 + 0.4;
    // Positions are percentages of the drum, so the pile stays centered at any machine size.
    const x = 50 + Math.cos(ang) * 24;
    const y = 50 + Math.sin(ang) * 24;
    const rot = Math.round((ang * 180) / Math.PI + 90 + (i % 2 ? 25 : -25));
    const art = data.art[inst.item.art];
    const cls = `drum-item${wet ? ' droopy' : ''}${fluffy ? ' fluffy' : ''}`;
    return `<span class="${cls}" data-uid="${esc(inst.uid || '')}" data-art="${esc(inst.item.art)}" style="left:calc(${x.toFixed(1)}% - ${half}px);top:calc(${y.toFixed(1)}% - ${half}px);transform:rotate(${rot}deg)">${itemSVG(inst.item, art, { state: inst.state, size: itemSize, wet })}</span>`;
  }).join('');
}

/** Clothes for the cover and the closed-screen loop, drawn from the same art as the game. */
const DECOR = {
  washer: [['tee', '#f3a9bd'], ['sock', '#a3c9ee'], ['towel', '#ffe0a2'], ['hoodie', '#b6d4bc']],
  dryer: [['sweater', '#d5b4ed'], ['pants', '#f6bb83'], ['pillowcase', '#f1ebe0'], ['tank', '#a3c9ee']],
};
export function decorItems(kind, data, { size = 150 } = {}) {
  const load = (DECOR[kind] || DECOR.washer).filter(([art]) => data.art[art]).map(([art, color]) => ({ item: { art, color, patternSvg: 'solid' }, state: {} }));
  return drumItems(load, data, { size });
}

/**
 * A front-loading washer or dryer like the cover.
 * @param {{bubbles?:boolean, kind:'washer'|'dryer', name?:string, display?:string, status?:string, footer?:string, inner?:string, water?:boolean, spinning?:boolean|string, open?:boolean, size?:number, id?:string, extraTop?:string}} o
 */
export function machine(o) {
  const size = o.size || 186;
  const dry = o.kind === 'dryer';
  const spin = o.spinning ? `drum spinning${dry ? ' reverse' : ''}${o.spinning === 'fast' ? ' fast' : ''}` : 'drum';
  return `<div class="machine ${dry ? 'dryer' : 'washer'}" ${o.id ? `id="${o.id}"` : ''} style="--door:${size}px">
  <div class="controls">${o.extraTop || ''}<span class="machine-name">${esc(o.name || (dry ? 'COZY DRY' : 'COZY WASH'))}</span><span class="display${dry ? ' warm' : ''}" ${o.displayId ? `id="${o.displayId}"` : ''} role="timer">${esc(o.display || (dry ? '0:15' : '0:45'))}</span><span class="dial" aria-hidden="true"></span></div>
  <div class="door${o.open ? ' open' : ''}"><div class="glass${dry ? ' dry' : ''}" ${o.glassId ? `id="${o.glassId}"` : ''}>
    <div class="${spin}" ${o.drumId ? `id="${o.drumId}"` : ''}>${o.inner || ''}</div>
    ${o.bubbles ? bubblesLayer() : ''}
    ${o.water ? `<div class="water" ${o.waterId ? `id="${o.waterId}"` : ''}></div>` : ''}
  </div></div>
  <div class="machine-bottom"><span>${esc(o.footer || (dry ? 'WARM & FUZZY' : 'WASH · RINSE · REPEAT'))}</span><span class="status">${esc(o.status || '')}</span></div>
  <div class="feet" aria-hidden="true"></div>
</div>`;
}

/** A little pocket, shown on a piece that has one. */
export const pocketIcon = (size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v9a8 8 0 0 1-16 0z"/><path d="M4 9h16"/><path d="M9 13l3 3 3-3" opacity=".7"/></svg>`;

export const tileBack = () => `<svg width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="#7fa3bb" stroke-width="2" aria-hidden="true"><rect x="5" y="4" width="26" height="28" rx="6"/><line x1="5" y1="11" x2="31" y2="11"/><circle cx="18" cy="21" r="6.5"/></svg>`;

export const coinCup = () => `<svg width="76" height="72" viewBox="0 0 76 72" aria-hidden="true"><circle cx="26" cy="14" r="9" fill="#d8dde2" stroke="#18394d" stroke-width="2"/><circle cx="42" cy="10" r="9" fill="#e6eaee" stroke="#18394d" stroke-width="2"/><circle cx="54" cy="17" r="9" fill="#d8dde2" stroke="#18394d" stroke-width="2"/><path d="M10 22 H66 L60 68 H16 Z" fill="#ffffff" stroke="#18394d" stroke-width="2.5" stroke-linejoin="round"/><path d="M13 36 H63" stroke="#398caf" stroke-width="3"/></svg>`;

export const coin = (size = 26) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#d8dde2" stroke="#18394d" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#9aa5ad" stroke-width="1.5"/></svg>`;

export const phone = (paid = false) => `<svg width="44" height="76" viewBox="0 0 44 76" aria-hidden="true"><rect x="2" y="2" width="40" height="72" rx="9" fill="#18394d"/><rect x="6" y="9" width="32" height="54" rx="4" fill="${paid ? '#3a9d6b' : '#3b6680'}"/>${paid ? '<path d="M14 36 l6 6 l11 -12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' : ''}<rect x="16" y="66" width="12" height="3" rx="1.5" fill="#6d8796"/></svg>`;

export const contactless = () => `<svg width="46" height="46" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path class="wave w1" d="M16 16a11 11 0 0 1 0 16"/><path class="wave w2" d="M23 11a18 18 0 0 1 0 26"/><path class="wave w3" d="M30 6a25 25 0 0 1 0 36"/></svg>`;

export const doorSign = (open) => `<div class="door-sign ${open ? 'is-open' : 'is-closed'}" role="img" aria-label="Door sign: ${open ? 'Open' : 'Closed'}"><span>${open ? 'OPEN' : 'CLOSED'}</span></div>`;

export const sheetBox = () => `<svg width="78" height="44" viewBox="0 0 78 44" aria-hidden="true"><rect x="2" y="12" width="74" height="30" rx="6" fill="#ffffff" stroke="#18394d" stroke-width="2"/><path d="M28 12 Q39 0 50 12" fill="#f1ebe0" stroke="#18394d" stroke-width="2"/><text x="39" y="32" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="10" font-weight="700" fill="#18394d">SHEETS</text></svg>`;

export const basket = (stack = '') => `<div class="basket"><div class="basket-stack">${stack}</div><svg width="230" height="150" viewBox="0 0 230 150" aria-hidden="true"><path d="M10 20 H220 L200 145 H30 Z" fill="#ffffff" stroke="#18394d" stroke-width="3" stroke-linejoin="round"/><path d="M22 50 H208 M26 80 H204 M30 110 H200" stroke="#c3d3df" stroke-width="3"/><path d="M60 20 V140 M100 20 V145 M140 20 V145 M180 20 V140" stroke="#dbe6ee" stroke-width="3"/><rect x="4" y="12" width="222" height="14" rx="7" fill="#f7fbff" stroke="#18394d" stroke-width="3"/></svg></div>`;

export const rackSVG = () => `<svg class="rack-svg" width="200" height="240" viewBox="0 0 200 240" aria-hidden="true"><line x1="24" y1="30" x2="14" y2="236" stroke="#7f9aab" stroke-width="6" stroke-linecap="round"/><line x1="176" y1="30" x2="186" y2="236" stroke="#7f9aab" stroke-width="6" stroke-linecap="round"/><line x1="18" y1="30" x2="182" y2="30" stroke="#9fb3bb" stroke-width="5" stroke-linecap="round"/><line x1="20" y1="110" x2="180" y2="110" stroke="#9fb3bb" stroke-width="5" stroke-linecap="round"/></svg>`;

export const neon = (word, sub, tone = 'pink') => `<div class="neon neon-${tone}"><strong>${esc(word)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;

export const plant = () => `<div class="plant" aria-hidden="true"><div class="leaf"></div><div class="leaf"></div><div class="leaf"></div><div class="pot"></div></div>`;

const stroke = (d, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const arrowUpRight = (size = 14) => stroke('<path d="M7 17L17 7"/><path d="M8 7h9v9"/>', size);
export const arrowDownRight = (size = 12) => stroke('<path d="M7 7l10 10"/><path d="M17 8v9H8"/>', size);
export const sparkIcon = (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>`;

/** Bubbles drifting up the glass: drawn circles with a little shine, not text. */
export const bubblesLayer = () => `<div class="bubbles" aria-hidden="true">${[[14, 8, 0], [22, 5, 1.1], [34, 10, 0.5], [44, 6, 1.7], [56, 9, 0.9], [66, 5, 0.2], [76, 8, 1.4]].map(([left, size, delay]) => `<svg class="bubble" style="left:${left}%;width:${size + 6}px;height:${size + 6}px;animation-delay:${delay}s" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#e4faff22" stroke="#e4faffcc" stroke-width="1.6"/><path d="M6 8a5 5 0 0 1 4-3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></svg>`).join('')}</div>`;

export const arrowIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>`;
