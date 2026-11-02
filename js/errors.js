/* Turns SQLite error messages into plain-English advice. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.SER = root.SER || {}).errors = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function closest(word, list) {
    let best = null; let bd = Infinity;
    for (const w of list) { const x = lev(word, w); if (x < bd) { bd = x; best = w; } }
    return bd <= Math.max(2, Math.floor(word.length / 3)) ? best : null;
  }
  // schema: [{ name, columns: [{ name }] }]
  function explain(message, schema) {
    const msg = String(message || '').replace(/^Error:\s*/, '');
    const tables = (schema || []).map((t) => t.name);
    const columns = Array.from(new Set((schema || []).flatMap((t) => t.columns.map((c) => c.name))));
    let m;
    const out = (title, tip) => ({ title, tip, raw: msg });
    if ((m = msg.match(/no such table: (?:main\.)?(\S+)/i))) {
      const s = closest(m[1], tables);
      return out('There\u2019s no table called \u201c' + m[1] + '\u201d here.', (s ? 'Did you mean \u201c' + s + '\u201d? ' : '') + 'Tables in this room: ' + tables.join(', ') + '.');
    }
    if ((m = msg.match(/no such column: (\S+)/i))) {
      const bare = m[1].split('.').pop();
      const s = closest(bare, columns);
      const dotted = m[1].includes('.');
      return out('There\u2019s no column called \u201c' + m[1] + '\u201d.', (s ? 'Did you mean \u201c' + s + '\u201d? ' : '') + (dotted ? 'Check that the table alias before the dot is defined in FROM or JOIN. ' : '') + 'If you meant a piece of text, put it in single quotes: \u2019' + bare + '\u2019. Double quotes are for column names.');
    }
    if ((m = msg.match(/ambiguous column name: (\S+)/i))) return out('\u201c' + m[1] + '\u201d is in more than one of your joined tables.', 'Say which one you mean with a prefix, like s.' + m[1] + ' or b.' + m[1] + '.');
    if ((m = msg.match(/near "([^"]*)": syntax error/i))) {
      const w = m[1];
      const tip = /^(from|where|group|order|having|limit|join|on|select)$/i.test(w) ? 'Something is missing just before ' + w.toUpperCase() + '. Often it\u2019s a stray comma before it, or an unfinished expression.' : w === ',' ? 'Check for a doubled comma, or a comma right before FROM.' : w === ')' ? 'Check your parentheses: one may close too early, or a list may be missing a value.' : 'Check the spelling of keywords, commas between columns, and quotes around text values.';
      return out('SQLite got confused near \u201c' + w + '\u201d.', tip);
    }
    if (/incomplete input/i.test(msg)) return out('The query ended too early.', 'Look for a missing closing parenthesis or quote, or a clause that stops halfway (like WHERE with nothing after it).');
    if (/unrecognized token/i.test(msg)) return out('There\u2019s a character SQLite doesn\u2019t understand.', 'Usually it\u2019s an unclosed quote. Text values use straight single quotes: \u2019like this\u2019.');
    if ((m = msg.match(/no such function: (\S+)/i))) return out('SQLite has no function called ' + m[1] + '.', /^(year|month|day|datediff|now|getdate|datepart)$/i.test(m[1]) ? 'For dates in SQLite, use strftime(\u2019%Y\u2019, ts), date(ts) or julianday(ts).' : /^(concat)$/i.test(m[1]) ? 'Join text with the || operator: a || \u2019 \u2019 || b.' : /^(len)$/i.test(m[1]) ? 'Use length(text).' : 'Check the spelling. The cheat sheet lists the functions used in this room.');
    if (/misuse of aggregate/i.test(msg)) return out('An aggregate like COUNT or SUM is in the wrong place.', 'Aggregates can\u2019t go in WHERE. To filter on a count, use GROUP BY \u2026 HAVING COUNT(*) > n.');
    if (/misuse of window function/i.test(msg)) return out('Window functions can\u2019t be used in WHERE or GROUP BY.', 'Compute the window in a CTE or subquery first, then filter its result: WITH w AS (SELECT \u2026 OVER (\u2026) AS x FROM t) SELECT * FROM w WHERE x \u2026');
    if (/HAVING clause on a non-aggregate|a GROUP BY clause is required before HAVING/i.test(msg)) return out('HAVING needs a GROUP BY.', 'HAVING filters groups. Add GROUP BY before it, or use WHERE to filter rows instead.');
    if (/sub-select returns (\d+) columns - expected 1/i.test(msg)) return out('Your subquery returns more than one column.', 'A subquery used as a value, or with IN, must select exactly one column.');
    if (/row value misused/i.test(msg)) return out('Something has parentheses around more than one value.', 'Check IN (\u2026) lists and subqueries. A comparison like x = (a, b) isn\u2019t allowed.');
    if (/readonly|query_only|attempt to write/i.test(msg)) return out('This terminal is read-only.', 'The archive only lets you look. SELECT and WITH work, but INSERT, UPDATE, DELETE and CREATE don\u2019t.');
    if (/interrupted|timed? ?out/i.test(msg)) return out('That query ran too long, so the terminal stopped it.', 'A recursive CTE without a stopping condition, or a join without ON, can run forever.');
    if (/empty query/i.test(msg)) return out('There\u2019s nothing to run yet.', 'Type a query, for example SELECT * FROM ' + (tables[0] || 'table') + ' LIMIT 10;');
    if ((m = msg.match(/(\d+) values for (\d+) columns/i))) return out('The number of values doesn\u2019t match.', 'Each row needs the same number of values.');
    if (/ORDER BY term out of range/i.test(msg)) return out('ORDER BY points at a column number that doesn\u2019t exist.', 'ORDER BY 2 means the second selected column, so make sure you select at least that many.');
    if (/SELECTs to the left and right of UNION/i.test(msg)) return out('Both sides of UNION need the same number of columns.', 'Make each SELECT return the same columns, in the same order.');
    return out('SQLite says: ' + msg, 'Read it slowly. It usually names the word it tripped on. The hints and cheat sheet can help too.');
  }
  return { explain, closest, lev };
});
