// Small DOM helpers.

/** Escape text for safe use inside HTML templates. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Run a function on click and on Enter/Space for keyboard users. */
export function onActivate(el, fn) {
  el.addEventListener('click', fn);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function reducedMotion(settings) {
  if (settings && settings.reducedMotion !== null && settings.reducedMotion !== undefined) return settings.reducedMotion;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Speed multiplier for timings: ?fast=1 runs everything 10× faster (for testing). */
export function speed() {
  try { return new URLSearchParams(location.search).get('fast') ? 0.1 : 1; } catch { return 1; }
}

export const fmtTime = (secs) => {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
