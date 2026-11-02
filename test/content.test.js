const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/chapters.js');
const W = require('../js/world.js');
const E = require('../js/engine.js');
const { sqljs } = require('./helpers.js');

test('6 to 8 chapters with 2 to 4 puzzles each, unique ids', () => {
  assert.ok(C.CHAPTERS.length >= 6 && C.CHAPTERS.length <= 8);
  const ids = new Set();
  for (const ch of C.CHAPTERS) {
    assert.ok(ch.puzzles.length >= 2 && ch.puzzles.length <= 4, ch.id);
    for (const p of ch.puzzles) { assert.ok(!ids.has(p.id), 'duplicate ' + p.id); ids.add(p.id); }
  }
});
test('every puzzle has exactly 3 hint tiers (nudge, concept, near-solution) and a solution', () => {
  for (const ch of C.CHAPTERS) for (const p of ch.puzzles) {
    assert.strictEqual(p.hints.length, 3, p.id);
    p.hints.forEach((h) => assert.ok(h.length > 15, p.id));
    assert.ok(p.hints[0].length <= p.hints[2].length + 60, 'nudge should not be longer than the near-solution for ' + p.id);
    assert.ok(/select|with/i.test(p.solution));
    assert.ok(p.task && p.story && p.title);
  }
});
test('every chapter has a cheat sheet, intro, outro, concepts and a par time', () => {
  for (const ch of C.CHAPTERS) { assert.ok(ch.cheats.length >= 3); assert.ok(ch.intro.length && ch.outro.length && ch.concepts.length && ch.par > 0); }
});
test('SQL skills escalate: later rooms need joins, CTEs, windows, self-joins', () => {
  const sol = (i) => C.CHAPTERS[i].puzzles.map((p) => p.solution).join('\n');
  assert.ok(!/join|with|over/i.test(sol(0)), 'room 1 is plain SELECT/WHERE');
  assert.ok(/order by/i.test(sol(1)) && /limit/i.test(sol(1)) && /distinct/i.test(sol(1)));
  assert.ok(/group by/i.test(sol(2)) && /having/i.test(sol(2)));
  assert.ok(/left join/i.test(sol(3)));
  assert.ok(/not exists/i.test(sol(4)) && /\(select/i.test(sol(4)));
  assert.ok(/^with/im.test(sol(5)));
  assert.ok(/lag\(/i.test(sol(6)) && /lead\(/i.test(sol(6)) && /sum\(kw\) over/i.test(sol(6)));
  assert.ok(/join swipes b/i.test(sol(7)) && /substr/i.test(sol(7)) && /julianday/i.test(sol(7)));
});
test('database seeds are deterministic (same script twice, and in a fresh process)', () => {
  const { execFileSync } = require('child_process');
  for (const ch of C.CHAPTERS) {
    const a = E.chapterScript(ch); const b = E.chapterScript(ch);
    assert.strictEqual(a, b);
    const hash = require('crypto').createHash('sha256').update(a).digest('hex');
    const other = execFileSync(process.execPath, ['-e', `const E=require(${JSON.stringify(require.resolve('../js/engine.js'))});const ch=E.chapters.find(c=>c.id===${JSON.stringify(ch.id)});process.stdout.write(require('crypto').createHash('sha256').update(E.chapterScript(ch)).digest('hex'))`]).toString();
    assert.strictEqual(other, hash, ch.id);
  }
});
test('the data is realistically messy: NULLs, inconsistent casing, duplicate names', async () => {
  const SQL = await sqljs();
  const db = new SQL.Database();
  db.exec(W.script(['staff', 'books', 'checkouts', 'manifest', 'encoder_log', 'logins']));
  const one = (q) => db.exec(q)[0].values[0][0];
  assert.ok(one("SELECT COUNT(*) FROM staff WHERE ext IS NULL") > 0);
  assert.ok(one("SELECT COUNT(DISTINCT department) - COUNT(DISTINCT LOWER(department)) FROM staff") > 0);
  assert.strictEqual(one("SELECT COUNT(*) FROM staff WHERE name = 'Sam Kettering'"), 2);
  assert.ok(one("SELECT COUNT(DISTINCT borrower) - COUNT(DISTINCT LOWER(borrower)) FROM checkouts") > 5);
  assert.ok(one("SELECT COUNT(*) FROM books WHERE year IS NULL") >= 2);
  assert.ok(one("SELECT COUNT(DISTINCT consignee) FROM manifest WHERE LOWER(TRIM(consignee)) = 'aurelian trust'") >= 3);
  assert.ok(one("SELECT COUNT(*) FROM logins WHERE terminal IS NULL") === 1);
  db.close();
});
test('red herrings are fair: only one badge beats the walking time, only one door has the most denials', async () => {
  const SQL = await sqljs();
  const db = new SQL.Database();
  db.exec(W.script(['swipes', 'walk_times']));
  const pairs = db.exec('SELECT a.badge_id, a.door, b.door FROM swipes a JOIN swipes b ON a.badge_id = b.badge_id AND a.ts < b.ts AND a.door <> b.door JOIN walk_times w ON w.from_door = a.door AND w.to_door = b.door WHERE (julianday(b.ts) - julianday(a.ts)) * 86400 < w.seconds')[0].values;
  assert.ok(pairs.every((p) => p[0] === 'B-0417'));
  const denied = db.exec("SELECT COUNT(*) FROM swipes WHERE result = 'denied' GROUP BY door ORDER BY 1 DESC LIMIT 2")[0].values;
  assert.ok(denied[0][0] > denied[1][0]);
  db.close();
});
test('suspects: exactly one culprit and every wrong suspect gets story feedback', () => {
  assert.strictEqual(C.SUSPECTS.filter((s) => s.culprit).length, 1);
  for (const s of C.SUSPECTS) if (!s.culprit) assert.ok(s.reply.length > 60, s.id);
  assert.ok(C.SUSPECTS.length >= 5 && C.FINALE.length >= 3);
});
test('the player database is read-only', async () => {
  const SQL = await sqljs();
  const db = E.build(SQL, C.CHAPTERS[0]);
  assert.throws(() => E.run(db, 'DELETE FROM staff'), /readonly|query_only|attempt to write/i);
  assert.ok(E.run(db, 'SELECT COUNT(*) FROM staff').rows[0][0] === 24);
});
test('engine.run returns the last result, caps huge results and reports statement counts', async () => {
  const SQL = await sqljs();
  const db = E.build(SQL, C.CHAPTERS[1]);
  const r = E.run(db, 'SELECT 1; SELECT title FROM books LIMIT 3;');
  assert.strictEqual(r.statements, 2); assert.strictEqual(r.rows.length, 3); assert.deepStrictEqual(r.columns, ['title']);
  const big = E.run(db, 'SELECT * FROM books a, books b', 1000);
  assert.ok(big.truncated && big.rows.length === 1000);
  assert.throws(() => E.run(db, '   '), /empty/);
  const sch = E.schema(db);
  assert.strictEqual(sch[0].name, 'books'); assert.ok(sch[0].count === 140 && sch[0].columns.length === 8 && sch[0].sample.rows.length === 5);
});
