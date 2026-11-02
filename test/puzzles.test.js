// Every puzzle: the reference solution passes, every alternative query passes, wrong queries are rejected.
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');
const K = require('../js/check.js');
const { sqljs } = require('./helpers.js');

const PINNED = { 'east-door': '2741', 'oldest-rare': 'R-13', 'astro-door': '2006', unreturned: '27', 'codex-donor': 'Aurelian Trust', 'fines-door': '843', 'ghost-badge': 'B-0913', revoked: '22', 'denied-door': '8352', 'lockdown-terminal': 'T-07', 'lockdown-user': 'Felix Ordway', 'cold-terminal': '6190', 'crowded-room': '6644', 'mag-drop': '23:46', 'longest-stay': 'Margot Vell', 'backup-door': '23:51', encoder: 'Donor Lounge', passphrase: 'LANTERN' };

function codeHit(res, accept) {
  const ok = new Set(accept.map(K.norm));
  return res.rows.some((r) => r.some((v) => ok.has(K.norm(v))));
}

for (const ch of E.chapters) {
  test(ch.title + ': every puzzle is solvable, alternatives pass, wrong answers fail', async (t) => {
    const SQL = await sqljs();
    const db = E.build(SQL, ch);
    const ans = E.answers(db, ch);
    for (const p of ch.puzzles) {
      const a = ans[p.id];
      if (p.check === 'code') {
        await t.test(p.id + ' reference', () => {
          assert.strictEqual(a.accept[0], PINNED[p.id], 'pinned answer drifted');
          assert.ok(K.compareCode(' ' + PINNED[p.id].toLowerCase() + ' ', a.accept).ok, 'typed answer accepted, case/space-insensitive');
          assert.ok(!K.compareCode('nope', a.accept).ok);
          for (const trap of Object.keys(p.traps || {})) assert.ok(!K.compareCode(trap, a.accept).ok, 'trap ' + trap + ' must be wrong');
        });
        for (const alt of p.alts) await t.test(p.id + ' alt: ' + alt.slice(0, 60), () => assert.ok(codeHit(E.run(db, alt), a.accept), alt));
      } else {
        const opts = { ordered: a.ordered, set: a.set };
        await t.test(p.id + ' reference', () => assert.ok(K.compareResult(a, E.run(db, p.solution), opts).ok));
        assert.ok(p.alts.length >= 1, 'has alternatives');
        for (const alt of p.alts) await t.test(p.id + ' alt: ' + alt.slice(0, 60), () => { const r = K.compareResult(a, E.run(db, alt), opts); assert.ok(r.ok, alt + ' -> ' + r.message); });
        assert.ok((p.wrong || []).length >= 1, 'has wrong queries');
        for (const w of p.wrong) await t.test(p.id + ' rejects: ' + w.slice(0, 60), () => assert.ok(!K.compareResult(a, E.run(db, w), opts).ok, w));
      }
    }
    db.close();
  });
}
