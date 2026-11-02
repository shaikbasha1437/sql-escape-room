/* Query worker: owns the chapter database so a runaway query never freezes the page.
   The page kills and recreates this worker if a query runs too long. */
/* global importScripts, initSqlJs */
importScripts('../vendor/sql-wasm.js', 'rng.js', 'world.js', 'chapters.js', 'engine.js');
const E = self.SER.engine;
let SQL = null; let db = null; let chapterId = null;
const ready = initSqlJs({ locateFile: (f) => '../vendor/' + f }).then((s) => { SQL = s; });
function load(index) {
  const ch = E.chapters[index];
  if (db) { try { db.close(); } catch (e) { /* ignore */ } }
  db = E.build(SQL, ch); chapterId = ch.id;
  return { chapter: ch.id, schema: E.schema(db), answers: E.answers(db, ch) };
}
self.onmessage = (e) => {
  const m = e.data || {};
  ready.then(() => {
    if (m.type === 'load') return load(m.index);
    if (m.type === 'run') {
      if (!db) throw new Error('database not loaded');
      return E.run(db, m.sql, m.cap || E.ROW_CAP);
    }
    throw new Error('unknown request');
  }).then((result) => self.postMessage({ id: m.id, ok: true, result, chapter: chapterId }),
    (err) => self.postMessage({ id: m.id, ok: false, error: String((err && err.message) || err) }));
};
