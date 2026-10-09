// Draws clothes from their art, color and pattern (PLAN sections 6 and 8).
// One function draws an item everywhere: tiles, bins, drums, the folding table and the basket.
import { esc } from '../util.js';
import { pointsAttr } from '../engine/fold.js';

let uid = 0;
const nextId = (p) => `${p}${++uid}`;

/** The words for a piece: its name, plus (pink) once it has bled, so colour is never the only clue. */
export function itemLabel(item, state = {}) {
  return state && state.pink ? `${item.name} (pink)` : item.name;
}

/** Lighten (amt > 0) or darken (amt < 0) a hex color. */
export function shade(hex, amt) {
  const h = (hex || '#cccccc').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const luminance = (hex) => {
  const n = parseInt((hex || '#ccc').replace('#', '').padEnd(6, '0'), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** The accent color for a pattern on a base color. */
export function accentFor(hex) {
  return luminance(hex) > 0.6 ? shade(hex, -0.35) : shade(hex, 0.45);
}

/** <pattern> markup for a pattern kind. Returns '' for solid. */
export function patternDef(id, kind, base, scale = 1) {
  const a = accentFor(base);
  const s = 6 * scale;
  switch (kind) {
    case 'stripes':
      return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="${base}"/><rect width="${s}" height="${s / 2}" fill="${a}"/></pattern>`;
    case 'dots':
      return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="${base}"/><circle cx="${s / 2}" cy="${s / 2}" r="${s / 5}" fill="${a}"/></pattern>`;
    case 'checks':
      return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="${base}"/><rect width="${s / 2}" height="${s / 2}" fill="${a}"/><rect x="${s / 2}" y="${s / 2}" width="${s / 2}" height="${s / 2}" fill="${a}"/></pattern>`;
    case 'plaid':
      return `<pattern id="${id}" width="${s * 1.5}" height="${s * 1.5}" patternUnits="userSpaceOnUse"><rect width="${s * 1.5}" height="${s * 1.5}" fill="${base}"/><rect width="${s * 1.5}" height="${s / 3}" y="${s / 2}" fill="${a}" opacity=".7"/><rect height="${s * 1.5}" width="${s / 3}" x="${s / 2}" fill="${a}" opacity=".7"/></pattern>`;
    case 'stars':
      return `<pattern id="${id}" width="${s * 1.4}" height="${s * 1.4}" patternUnits="userSpaceOnUse"><rect width="${s * 1.4}" height="${s * 1.4}" fill="${base}"/><path transform="translate(${s * 0.7} ${s * 0.7}) scale(${s / 12})" d="M0 -4 L1.2 -1.2 L4 -1.2 L1.8 0.6 L2.6 3.6 L0 1.8 L-2.6 3.6 L-1.8 0.6 L-4 -1.2 L-1.2 -1.2 Z" fill="${a}"/></pattern>`;
    case 'hearts':
      return `<pattern id="${id}" width="${s * 1.4}" height="${s * 1.4}" patternUnits="userSpaceOnUse"><rect width="${s * 1.4}" height="${s * 1.4}" fill="${base}"/><path transform="translate(${s * 0.7} ${s * 0.6}) scale(${s / 12})" d="M0 3 C-4 0 -4 -3 -2 -3 C-1 -3 0 -2 0 -1 C0 -2 1 -3 2 -3 C4 -3 4 0 0 3 Z" fill="${a}"/></pattern>`;
    case 'leaves':
      return `<pattern id="${id}" width="${s * 1.6}" height="${s * 1.6}" patternUnits="userSpaceOnUse"><rect width="${s * 1.6}" height="${s * 1.6}" fill="${base}"/><path transform="translate(${s * 0.8} ${s * 0.8}) rotate(35) scale(${s / 12})" d="M0 -4 Q3 0 0 4 Q-3 0 0 -4 Z" fill="${a}"/></pattern>`;
    default:
      return '';
  }
}

/** Fill for an item, taking its state (pink, wet) into account. */
function fillColor(item, state = {}, wet = false) {
  let c = item.color || '#dddddd';
  if (state.pink) c = '#f6b9cc';
  if (wet) c = shade(c, -0.18);
  return c;
}

/**
 * SVG markup for one item.
 * @param {object} item
 * @param {{state?:object, size?:number, wet?:boolean, art?:object, label?:string, className?:string, style?:string}} opts
 */
export function itemSVG(item, art, opts = {}) {
  const a = art || { viewBox: [32, 30], outline: 'M2 2 H30 V28 H2 Z', details: [] };
  const [w, h] = a.viewBox;
  const state = opts.state || {};
  const size = opts.size || 64;
  const scale = state.shrunk ? 0.78 : 1;
  const base = fillColor(item, state, opts.wet);
  const pid = nextId('p');
  const pat = patternDef(pid, item.patternSvg || 'solid', base, Math.max(w, h) / 32);
  const fill = pat ? `url(#${pid})` : base;
  const stroke = '#18394d';
  const details = (a.details || []).map((d) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${Math.max(w, h) / 40}" stroke-linecap="round" opacity=".7"/>`).join('');
  const stain = state.stained ? `<ellipse cx="${w * 0.55}" cy="${h * 0.6}" rx="${w * 0.12}" ry="${h * 0.08}" fill="#7a4fb0" opacity=".55"/>` : '';
  const lint = state.linted ? `<g fill="#ffffff" opacity=".8">${[0.3, 0.5, 0.7].map((x, i) => `<circle cx="${w * x}" cy="${h * (0.4 + i * 0.12)}" r="${w / 40}"/>`).join('')}</g>` : '';
  const vbW = w / scale, vbH = h / scale;
  const off = `translate(${(vbW - w) / 2} ${(vbH - h) / 2})`;
  return `<svg class="${opts.className || 'item-svg'}" ${opts.style ? `style="${opts.style}"` : ''} width="${size}" height="${Math.round(size * h / w)}" viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}" role="img" aria-label="${esc(opts.label || itemLabel(item, state))}">
<defs>${pat}</defs><g transform="${off}"><path d="${a.outline}" fill="${fill}" fill-rule="nonzero" stroke="${stroke}" stroke-width="${Math.max(w, h) / 28}" stroke-linejoin="round"/>${details}${stain}${lint}</g></svg>`;
}

/** SVG for an item on the folding table at a fold frame. */
export function foldSVG(item, points, opts = {}) {
  const state = opts.state || {};
  const base = fillColor(item, state);
  const pid = nextId('fp');
  const pat = patternDef(pid, item.patternSvg || 'solid', base, 2.4);
  const fill = pat ? `url(#${pid})` : base;
  return `<svg class="fold-svg" viewBox="0 0 100 100" role="img" aria-label="${esc(itemLabel(item, state))} on the folding table">
<defs>${pat}</defs><polygon class="fold-poly" points="${pointsAttr(points)}" fill="${fill}" stroke="#18394d" stroke-width="1.1" stroke-linejoin="round"/>
${state.stained ? '<ellipse cx="55" cy="60" rx="6" ry="4" fill="#7a4fb0" opacity=".5"/>' : ''}
<line class="fold-line" x1="0" y1="0" x2="0" y2="0" stroke="#224b60" stroke-width=".8" stroke-dasharray="2 2" opacity="0"/></svg>`;
}

/** A small folded square for the basket. */
export function foldedSVG(item, w = 36, h = 22, state = {}) {
  const base = fillColor(item, state);
  const pid = nextId('bp');
  const pat = patternDef(pid, item.patternSvg || 'solid', base, 0.8);
  return `<svg class="folded" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs>${pat}</defs><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="3" fill="${pat ? `url(#${pid})` : base}" stroke="#18394d" stroke-width="1.5"/>${state.stained ? `<ellipse cx="${w * 0.62}" cy="${h * 0.58}" rx="${w * 0.1}" ry="${h * 0.16}" fill="#7a4fb0" opacity=".55"/>` : ''}</svg>`;
}
