const path = require('path');
const initSqlJs = require('../vendor/sql-wasm.js');
let SQLp = null;
const sqljs = () => SQLp || (SQLp = initSqlJs({ locateFile: (f) => path.join(__dirname, '..', 'vendor', f) }));
function memStorage() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; }
module.exports = { sqljs, memStorage };
