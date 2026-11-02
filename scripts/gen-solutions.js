// Writes SOLUTIONS.md from the puzzle definitions and the computed answers. Run: node scripts/gen-solutions.js
const fs = require('fs'); const path = require('path');
const initSqlJs = require('../vendor/sql-wasm.js');
const E = require('../js/engine.js'); const C = require('../js/chapters.js');
initSqlJs({ locateFile: (f) => path.join(__dirname, '../vendor', f) }).then((SQL) => {
  const out = ['# SQL Escape Room: full solutions', '', '> **Spoilers.** This file solves every puzzle and names the culprit. The game checks results, not query text, so these are just one way to get each answer.', ''];
  C.CHAPTERS.forEach((ch, i) => {
    const db = E.build(SQL, ch); const ans = E.answers(db, ch);
    out.push('## Room ' + (i + 1) + ': ' + ch.title, '', '_Concepts: ' + ch.concepts.join(', ') + '_', '');
    ch.puzzles.forEach((p) => {
      out.push('### ' + p.title, '', p.task, '', '```sql', p.solution.trim(), '```', '');
      const a = ans[p.id];
      if (a.kind === 'code') out.push('**Answer:** `' + a.accept[0] + '`', '');
      else out.push('**Expected result:** ' + a.rows.length + ' row' + (a.rows.length === 1 ? '' : 's') + (a.ordered ? ' (order matters)' : '') + ': ' + a.rows.slice(0, 6).map((r) => r.join(' / ')).join('; ') + (a.rows.length > 6 ? '; \u2026' : ''), '');
    });
    db.close();
  });
  const v = C.SUSPECTS.find((s) => s.culprit);
  out.push('## The accusation', '', 'The thief is **' + v.name + '** (' + v.role + ').', '');
  C.SUSPECTS.filter((s) => !s.culprit).forEach((s) => out.push('- **' + s.name + '**: ' + s.reply));
  out.push('', ...C.FINALE.map((t) => '> ' + t + '\n>').concat(['']));
  fs.writeFileSync(path.join(__dirname, '../SOLUTIONS.md'), out.join('\n'));
  console.log('wrote SOLUTIONS.md');
});
