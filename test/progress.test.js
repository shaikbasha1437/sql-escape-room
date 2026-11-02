const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/progress.js');
const C = require('../js/chapters.js');
const { memStorage } = require('./helpers.js');
const CH = C.CHAPTERS;
test('save and load slots round-trip; empty slots load null; active slot remembered', () => {
  const st = memStorage(); const s = P.fresh();
  P.solve(s, CH[0], CH[0].puzzles[0].id);
  P.save(st, 2, s);
  assert.deepStrictEqual(P.load(st, 2).chapters, s.chapters);
  assert.strictEqual(P.load(st, 1), null);
  P.setActive(st, 2); assert.strictEqual(P.activeSlot(st), 2);
  st.setItem(P.KEY(3), '{broken'); assert.strictEqual(P.load(st, 3), null);
});
test('export/import keeps progress and rejects foreign files', () => {
  const s = P.fresh(); P.solve(s, CH[0], 'night-roster');
  const back = P.importSave(P.exportSave(s));
  assert.ok(back.chapters['reading-room'].solved['night-roster']);
  assert.throws(() => P.importSave('{"app":"other"}'), /isn’t a SQL Escape Room save/);
  assert.throws(() => P.importSave('nope'), /valid JSON/);
});
test('stars: 3 for clean+fast, minus hints, minus slow, revealed solution caps at 1', () => {
  const c = CH[0]; const cs = { solved: {}, hints: {}, revealed: {}, timeMs: 1000 };
  assert.strictEqual(P.stars(c, cs), 3);
  cs.hints = { a: 2 }; assert.strictEqual(P.stars(c, cs), 2);
  cs.timeMs = c.par * 1000 + 1; assert.strictEqual(P.stars(c, cs), 1);
  assert.strictEqual(P.stars(c, { hints: {}, revealed: { x: true }, timeMs: 0 }), 1);
});
test('hint tiers stop at 3; clues get pinned once; chapter completes when all puzzles solve', () => {
  const s = P.fresh(); const c = CH[0];
  assert.strictEqual(P.hint(s, c.id, 'east-door'), 1); P.hint(s, c.id, 'east-door'); P.hint(s, c.id, 'east-door');
  assert.strictEqual(P.hint(s, c.id, 'east-door'), 3);
  let r;
  for (const p of c.puzzles) r = P.solve(s, c, p.id);
  P.solve(s, c, c.puzzles[0].id);
  assert.ok(r.finished && s.chapters[c.id].done);
  assert.strictEqual(s.notebook.filter((n) => n.kind === 'clue').length, c.puzzles.length);
  assert.ok(P.unlocked(s, CH, 1) && !P.unlocked(s, CH, 2));
});
test('reset chapter removes its progress and clues, and returns a snapshot for undo', () => {
  const s = P.fresh(); const c = CH[0];
  c.puzzles.forEach((p) => P.solve(s, c, p.id));
  s.notebook.push({ id: 'x', kind: 'note', text: 'mine', chapter: c.id });
  const before = P.resetChapter(s, c.id);
  assert.ok(!s.chapters[c.id]); assert.deepStrictEqual(s.notebook.map((n) => n.id), ['x']);
  assert.ok(before.chapters[c.id].done);
});
test('history is per chapter, newest first, deduped and capped at 50', () => {
  const s = P.fresh();
  for (let i = 0; i < 60; i++) P.pushHistory(s, 'a', 'SELECT ' + i, true);
  P.pushHistory(s, 'a', 'SELECT 59', false);
  assert.strictEqual(s.chapters.a.history.length, 50); assert.strictEqual(s.chapters.a.history[0].sql, 'SELECT 59');
  assert.ok(!s.chapters.b);
});
test('achievements unlock from events', () => {
  const s = P.fresh();
  ['x', 'y', 'z'].forEach((q) => P.evaluate(s, { type: 'query', sql: q, ok: false }, CH));
  const got = P.evaluate(s, { type: 'query', sql: 'WITH a AS (SELECT 1) SELECT x, LAG(x) OVER (ORDER BY x) FROM a JOIN b', ok: true }, CH);
  for (const id of ['first-query', 'whisperer', 'cte', 'window', 'joiner']) assert.ok(got.includes(id), id);
  assert.ok(!P.evaluate(s, { type: 'query', sql: "SELECT 'join' AS x", ok: true }, CH).includes('joiner'));
  assert.deepStrictEqual(P.evaluate(s, { type: 'accuse', correct: false }, CH), ['wrong-tree']);
  assert.deepStrictEqual(P.evaluate(s, { type: 'tick', hour: 2 }, CH), ['night-owl']);
  assert.strictEqual(P.ACHIEVEMENTS.length, new Set(P.ACHIEVEMENTS.map((a) => a.id)).size);
});
test('time formatting', () => { assert.strictEqual(P.fmtTime(65000), '1:05'); assert.strictEqual(P.fmtTime(3723000), '1:02:03'); });
