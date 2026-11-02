const test = require('node:test');
const assert = require('node:assert');
const K = require('../js/check.js');
const exp = { columns: ['name'], rows: [['Ann'], ['Bob']] };
test('extra columns, column order and case/whitespace do not matter', () => {
  assert.ok(K.compareResult(exp, { columns: ['id', 'n'], rows: [[2, 'bob '], [1, 'ANN']] }).ok);
});
test('row count mismatch is explained', () => {
  const r = K.compareResult(exp, { columns: ['n'], rows: [['Ann']] });
  assert.ok(!r.ok && r.reason === 'rowcount' && /too few/.test(r.message));
  assert.ok(/no rows/.test(K.compareResult(exp, { columns: ['n'], rows: [] }).message));
});
test('ordered answers need the right order, with a helpful message', () => {
  const r = K.compareResult(exp, { columns: ['n'], rows: [['Bob'], ['Ann']] }, { ordered: true });
  assert.ok(!r.ok && r.reason === 'order');
  assert.ok(K.compareResult(exp, { columns: ['n'], rows: [['ann'], ['bob']] }, { ordered: true }).ok);
});
test('set answers ignore duplicates', () => {
  assert.ok(K.compareResult(exp, { columns: ['n', 't'], rows: [['Ann', 1], ['Bob', 2], ['Ann', 3]] }, { set: true }).ok);
  assert.ok(!K.compareResult(exp, { columns: ['n'], rows: [['Ann'], ['Bob'], ['Cy']] }, { set: true }).ok);
});
test('numbers compare across int/float/text forms; NULL only equals NULL', () => {
  const e = { columns: ['x', 'y'], rows: [[843, null]] };
  assert.ok(K.compareResult(e, { columns: ['a', 'b'], rows: [['843.0', null]] }).ok);
  assert.ok(!K.compareResult(e, { columns: ['a', 'b'], rows: [[843, 'null']] }).ok);
});
test('multi-column answers must line up row by row', () => {
  const e = { columns: ['name', 'room'], rows: [['A', 'X'], ['B', 'Y']] };
  assert.ok(K.compareResult(e, { columns: ['room', 'name'], rows: [['Y', 'B'], ['X', 'A']] }).ok);
  assert.ok(!K.compareResult(e, { columns: ['name', 'room'], rows: [['A', 'Y'], ['B', 'X']] }).ok);
});
test('typed codes ignore quotes, case and spaces', () => {
  assert.ok(K.compareCode('  "lantern" ', ['LANTERN']).ok);
  assert.ok(!K.compareCode('', ['x']).ok);
  assert.ok(K.compareCode('ENC-2', ['Donor Lounge', 'ENC-2']).ok);
});
test('no-column results are rejected cleanly', () => { assert.ok(!K.compareResult(exp, { columns: [], rows: [] }).ok); });
