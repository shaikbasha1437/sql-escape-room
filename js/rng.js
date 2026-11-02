/* Deterministic PRNG helpers (mulberry32). Same seed -> same database, on every device. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.SER = root.SER || {}).rng = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function make(seed) {
    const r = mulberry32(seed);
    const api = {
      next: r,
      int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p,
      shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
      round: (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d)
    };
    return api;
  }
  return { make, mulberry32 };
});
