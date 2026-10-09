// Seeded random numbers, so the same seed always builds the same day.

/** Hash a string into a 32-bit seed (xmur3). */
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 generator returning floats in [0, 1). */
export function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A small random helper around a seed string.
 * @param {string} seed
 */
export function makeRng(seed) {
  const next = mulberry32(hashSeed(String(seed)));
  const rng = {
    next,
    /** Integer in [0, n). */
    int: (n) => Math.floor(next() * n),
    /** Integer in [min, max]. */
    range: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** Pick using a weight function. */
    weighted(arr, weightOf) {
      const total = arr.reduce((s, x) => s + Math.max(0, weightOf(x)), 0);
      if (total <= 0) return rng.pick(arr);
      let r = next() * total;
      for (const x of arr) {
        r -= Math.max(0, weightOf(x));
        if (r < 0) return x;
      }
      return arr[arr.length - 1];
    },
    /** Shuffled copy. */
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
  return rng;
}
