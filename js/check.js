/* Answer checking. Results are compared by VALUES, not by SQL text, so any query that produces the
   right rows passes: extra columns are fine, column names and order don't matter, text is compared
   case-insensitively with surrounding spaces trimmed, and numbers are compared to 4 decimal places. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.SER = root.SER || {}).check = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function norm(v) {
    if (v === null || v === undefined) return '\u2205';
    if (typeof v === 'number') return 'n:' + String(Math.round(v * 10000) / 10000);
    if (typeof v === 'bigint') return 'n:' + v.toString();
    if (v instanceof Uint8Array) return 'b:' + v.length;
    const s = String(v).trim().replace(/\s+/g, ' ');
    if (/^-?\d+(\.\d+)?$/.test(s)) return 'n:' + String(Math.round(Number(s) * 10000) / 10000);
    return 's:' + s.toLowerCase();
  }
  const key = (arr) => arr.join('\u241f');
  function multiset(vals) { const m = new Map(); for (const v of vals) m.set(v, (m.get(v) || 0) + 1); return m; }
  function sameMultiset(a, b) {
    if (a.length !== b.length) return false;
    const m = multiset(a);
    for (const v of b) { const c = m.get(v); if (!c) return false; m.set(v, c - 1); }
    return true;
  }
  const uniq = (arr) => Array.from(new Set(arr));
  const sameSet = (a, b) => { const A = uniq(a); const B = new Set(b); return A.length === B.size && A.every((x) => B.has(x)); };

  // expected/actual: { columns: [...], rows: [[...]] }. opts: { ordered, set }
  function compareResult(expected, actual, opts) {
    opts = opts || {};
    if (!actual || !actual.columns || !actual.columns.length) return { ok: false, reason: 'empty', message: 'Run a query that returns rows first.' };
    const E = expected.rows.map((r) => r.map(norm));
    const A = actual.rows.map((r) => r.map(norm));
    const ne = expected.columns.length; const na = actual.columns.length;
    if (na < ne) return { ok: false, reason: 'columns', message: 'Your result has ' + na + ' column' + (na === 1 ? '' : 's') + ' but the answer needs at least ' + ne + '.' };
    let ER = E; let AR = A;
    if (opts.set) { ER = uniqRows(E); AR = uniqRows(A); }
    if (!opts.set && ER.length !== AR.length) return { ok: false, reason: 'rowcount', message: rowMsg(AR.length, ER.length) };
    const ecol = (j, rows) => rows.map((r) => r[j]);
    // candidate actual columns for each expected column (same values, ignoring order)
    const cand = [];
    for (let j = 0; j < ne; j++) {
      const ev = ecol(j, ER);
      const list = [];
      for (let k = 0; k < na; k++) { const av = ecol(k, A); if (opts.set ? sameSet(av, ev) : sameMultiset(av, ev)) list.push(k); }
      if (!list.length) {
        if (opts.set && uniqRows(A.map((r) => [r[0]])).length !== ER.length && ne === 1) return { ok: false, reason: 'rowcount', message: rowMsg(uniq(A.map((r) => key(r))).length, ER.length) };
        return { ok: false, reason: 'values', message: 'Not quite. The values in your result don\u2019t match what the case file needs. Check your filters.' };
      }
      cand.push(list);
    }
    const used = new Set(); const pick = [];
    const tryAssign = (j) => {
      if (j === ne) {
        const proj = (opts.set ? A : A).map((r) => pick.map((k) => r[k]));
        const P = opts.set ? uniqRows(proj) : proj;
        if (opts.ordered) return P.length === ER.length && P.every((r, i) => key(r) === key(ER[i]));
        if (opts.set) return sameSet(P.map(key), ER.map(key));
        return sameMultiset(P.map(key), ER.map(key));
      }
      for (const k of cand[j]) { if (used.has(k)) continue; used.add(k); pick.push(k); if (tryAssign(j + 1)) return true; pick.pop(); used.delete(k); }
      return false;
    };
    if (tryAssign(0)) return { ok: true };
    if (opts.ordered) {
      // right rows, wrong order?
      const unordered = compareResult(expected, actual, Object.assign({}, opts, { ordered: false }));
      if (unordered.ok) return { ok: false, reason: 'order', message: 'Right rows, wrong order. This answer has to be sorted.' };
    }
    return { ok: false, reason: 'values', message: 'Close. Each column looks plausible, but the rows don\u2019t line up with the answer.' };
  }
  function uniqRows(rows) { const seen = new Set(); const out = []; for (const r of rows) { const k = key(r); if (!seen.has(k)) { seen.add(k); out.push(r); } } return out; }
  function rowMsg(got, want) {
    if (got === 0) return 'Your query returned no rows. Loosen a filter and try again.';
    return 'Not yet: your result has ' + got + ' row' + (got === 1 ? '' : 's') + ', ' + (got > want ? 'which is too many. Something still needs filtering out.' : 'which is too few. A filter may be too strict.');
  }
  function normCode(s) {
    return String(s == null ? '' : s).trim().replace(/^["'`]+|["'`]+$/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  }
  // expectedValues: list of acceptable answers (the first one is canonical)
  function compareCode(input, expectedValues) {
    const got = normCode(input);
    if (!got) return { ok: false, reason: 'empty', message: 'Type an answer first.' };
    return expectedValues.some((e) => normCode(e) === got) ? { ok: true } : { ok: false, reason: 'wrong', message: 'The lock buzzes. That isn\u2019t it.' };
  }
  return { norm, compareResult, compareCode, normCode };
});
