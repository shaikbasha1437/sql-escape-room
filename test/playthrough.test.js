// Automated full playthrough: every room in order, through the same engine/check/progress code the app uses.
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');
const K = require('../js/check.js');
const P = require('../js/progress.js');
const C = require('../js/chapters.js');
const { sqljs, memStorage } = require('./helpers.js');
test('full playthrough: all rooms, wrong accusation, right accusation, save + reload', async () => {
  const SQL = await sqljs(); const st = memStorage();
  let s = P.fresh();
  C.CHAPTERS.forEach((ch, i) => {
    assert.ok(P.unlocked(s, C.CHAPTERS, i), 'room ' + (i + 1) + ' unlocked in order');
    if (i + 1 < C.CHAPTERS.length) assert.ok(!P.unlocked(s, C.CHAPTERS, i + 1));
    const db = E.build(SQL, ch); const ans = E.answers(db, ch);
    let p;
    while ((p = P.active(ch, P.ch(s, ch.id)))) {
      const res = E.run(db, p.solution);
      P.pushHistory(s, ch.id, p.solution, true); P.evaluate(s, { type: 'query', sql: p.solution, ok: true }, C.CHAPTERS);
      const a = ans[p.id];
      const ok = a.kind === 'code' ? K.compareCode(E.display(res.rows[0][0]), a.accept).ok : K.compareResult(a, res, a).ok;
      assert.ok(ok, p.id);
      const r = P.solve(s, ch, p.id);
      if (r.finished) P.evaluate(s, { type: 'chapter', chapter: ch, cs: s.chapters[ch.id] }, C.CHAPTERS);
    }
    assert.ok(s.chapters[ch.id].done && s.chapters[ch.id].stars === 3);
    P.save(st, 1, s); s = P.load(st, 1); // reload between rooms like a returning visitor
    db.close();
  });
  const wrong = C.SUSPECTS.find((x) => !x.culprit);
  s.accusations.push(wrong.id); assert.deepStrictEqual(P.evaluate(s, { type: 'accuse', correct: false }, C.CHAPTERS), ['wrong-tree']);
  const culprit = C.SUSPECTS.find((x) => x.culprit);
  assert.strictEqual(culprit.name, 'Margot Vell');
  s.accusations.push(culprit.id); s.solved = true; P.evaluate(s, { type: 'accuse', correct: true }, C.CHAPTERS);
  P.save(st, 1, s);
  const back = P.load(st, 1);
  assert.ok(back.solved && back.achievements['case-closed'] && back.achievements.spotless && back.achievements.notebook);
  const sum = P.summary(back, C.CHAPTERS);
  assert.strictEqual(sum.rooms, C.CHAPTERS.length); assert.strictEqual(sum.stars, sum.maxStars);
});
