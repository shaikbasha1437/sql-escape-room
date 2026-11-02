const test = require('node:test');
const assert = require('node:assert');
const X = require('../js/errors.js');
const E = require('../js/engine.js');
const { sqljs } = require('./helpers.js');
const schema = [{ name: 'staff', columns: [{ name: 'name' }, { name: 'shift' }] }, { name: 'doors', columns: [{ name: 'code' }] }];
test('typos in table and column names get a suggestion', () => {
  assert.match(X.explain('no such table: staf', schema).tip, /staff/);
  assert.match(X.explain('no such column: shfit', schema).tip, /shift/);
  assert.match(X.explain('no such column: night', schema).tip, /single quotes/);
});
test('real SQLite errors are translated into plain English', async () => {
  const SQL = await sqljs();
  const db = E.build(SQL, E.chapters[0]);
  const cases = [
    ['SELECT name FROM staff WHERE', /ended too early/],
    ['SELECT name, FROM staff', /confused near/],
    ['SELECT name FROM staff WHERE COUNT(*) > 1', /aggregate/],
    ["SELECT name FROM staff WHERE shift = 'night", /character|unclosed|confused/i],
    ['SELECT YEAR(hired) FROM staff', /strftime/],
    ['SELECT id FROM staff JOIN doors ON 1', /more than one/],
    ['DELETE FROM staff', /read-only/],
    ['SELECT name FROM staff HAVING id > 1', /HAVING|SQLite says/],
    ['SELECT name FROM staff WHERE id IN (SELECT id, name FROM staff)', /more than one column/i],
    ['SELECT name, ROW_NUMBER() OVER () r FROM staff WHERE ROW_NUMBER() OVER () = 1', /Window functions/]
  ];
  for (const [q, re] of cases) {
    let msg = null; try { E.run(db, q); } catch (e) { msg = e.message; }
    assert.ok(msg, 'expected an error for ' + q);
    const x = X.explain(msg, schema);
    assert.match(x.title + ' ' + x.tip, re, q + ' -> ' + msg);
  }
});
test('unknown errors still show the original message', () => { assert.match(X.explain('weird thing', schema).title, /weird thing/); });
