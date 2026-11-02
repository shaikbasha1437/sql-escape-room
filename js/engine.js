/* Game engine shared by the browser worker and the Node tests: builds a chapter database, runs
   player queries with a row cap, and computes each puzzle's expected answer from its reference SQL. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./world.js'), require('./chapters.js'));
  else (root.SER = root.SER || {}).engine = factory(root.SER.world, root.SER.chapters);
})(typeof self !== 'undefined' ? self : this, function (W, C) {
  'use strict';
  const ROW_CAP = 5000;
  function chapterScript(ch) { return W.script(ch.tables); }
  function build(SQL, ch) {
    const db = new SQL.Database();
    db.exec(chapterScript(ch));
    db.exec('PRAGMA query_only = ON;');
    return db;
  }
  // Runs every statement; returns the last statement that produced columns (like a SQL console).
  function run(db, sql, cap) {
    cap = cap || ROW_CAP;
    let last = null; let count = 0;
    const t0 = Date.now();
    for (const stmt of db.iterateStatements(sql)) {
      try {
        const cols = stmt.getColumnNames();
        const rows = []; let truncated = false;
        while (stmt.step()) { if (rows.length >= cap) { truncated = true; break; } rows.push(stmt.get()); }
        count++;
        if (cols.length) last = { columns: cols, rows, truncated };
      } finally { stmt.free(); }
    }
    if (!count) throw new Error('empty query');
    return Object.assign(last || { columns: [], rows: [], truncated: false }, { statements: count, ms: Date.now() - t0 });
  }
  const timeVariants = (v) => (/^\d\d:\d\d$/.test(v) ? [v + ':00', W.NIGHT + ' ' + v + ':00', W.NIGHT + ' ' + v] : []);
  function display(v) { return typeof v === 'number' && Number.isInteger(v) ? String(v) : typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v); }
  function answers(db, ch) {
    const out = {};
    for (const p of ch.puzzles) {
      const res = run(db, p.solution);
      if (p.check === 'code') {
        const v = res.rows[0] && res.rows[0][0];
        if (v === null || v === undefined) throw new Error('puzzle ' + p.id + ' has no answer');
        const main = display(v);
        out[p.id] = { kind: 'code', accept: [main].concat(p.accept || [], timeVariants(main)) };
      } else out[p.id] = { kind: 'result', columns: res.columns, rows: res.rows, ordered: !!p.ordered, set: !!p.set };
    }
    return out;
  }
  function schema(db) {
    const tables = run(db, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").rows.map((r) => r[0]);
    return tables.map((t) => {
      const cols = run(db, 'PRAGMA table_info(' + JSON.stringify(t) + ')').rows.map((r) => ({ name: r[1], type: r[2] || 'ANY', pk: !!r[5] }));
      const count = run(db, 'SELECT COUNT(*) FROM "' + t + '"').rows[0][0];
      const sample = run(db, 'SELECT * FROM "' + t + '" LIMIT 5');
      return { name: t, columns: cols, count, sample };
    });
  }
  return { build, run, answers, schema, chapterScript, ROW_CAP, display, chapters: C.CHAPTERS };
});
