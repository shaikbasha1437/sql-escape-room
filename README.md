# SQL Escape Room: The Midnight Archive

**Play it: https://shaikbasha1437.github.io/sql-escape-room/**

You fell asleep in the reading room of a private archive. You wake up after midnight: the power is out, every door has sealed itself, and something priceless has gone missing from the Vault. The building's terminal still works, read-only, and the note taped to it says *"The building remembers everything. Ask it."*

You get out by writing real SQL. Each of the eight rooms has its own database (staff rosters, door panels, badge swipes, logins, sensor logs) and teaches a new part of SQL. Solve a room's puzzles to open its door. At the end you name the thief.

No account, no server, no install. Everything runs in your browser, and it works offline once it has loaded.

## What you learn

| Room | SQL you practise |
| --- | --- |
| 1. The Reading Room | `SELECT`, `WHERE`, `AND` / `OR`, `IS NULL`, `LIKE` |
| 2. The Card Catalogue | `ORDER BY`, `LIMIT` / `OFFSET`, `DISTINCT`, how NULLs sort |
| 3. The Ledger Hall | `COUNT` / `SUM` / `AVG`, `GROUP BY`, `HAVING`, `LOWER()` |
| 4. The Security Office | `INNER JOIN`, `LEFT JOIN`, table aliases, joining on IDs |
| 5. The Server Closet | subqueries, `IN` / `NOT IN`, `NOT EXISTS`, the `NOT IN` + NULL trap |
| 6. The Map Room | `WITH` (CTEs), chained CTEs, greatest-per-group, time windows |
| 7. The Clock Tower | window functions, `LAG` / `LEAD`, `PARTITION BY`, running totals, `julianday()` |
| 8. The Vault | self-joins, date math, `TRIM` / `UPPER`, `SUBSTR`, `group_concat` |

The data is deliberately a bit messy, like real data: missing values, inconsistent capitalisation, two people with the same name. Every puzzle can still be solved fairly from what's in the tables.

## How it plays

- **Answers are checked by result, not by query text.** Any query that returns the right rows passes. Extra columns are fine, column names and order don't matter, and text is compared case-insensitively. Some puzzles want a door code or a name instead; type it into the lock.
- **Schema explorer** with every table's columns, types, row counts and sample rows. Click a column to insert it.
- **Editor** with SQL highlighting and autocomplete for the current room's tables and columns. `Ctrl+Enter` (or `Shift+Enter`) runs the query.
- **Friendly errors**: SQLite's messages are translated into plain advice ("no column `nme`, did you mean `name`?").
- **Three hint tiers** per puzzle, plus a "show solution" behind a confirmation. Using more than one hint, revealing a solution, or going over the par time costs stars.
- **Notebook**: clues pin themselves as you solve puzzles; you can pin result rows and write your own notes.
- Per-room query history, cheat sheet and timer, a chapter map, 13 achievements, and a "case solved" share card (PNG). The card never names the culprit.
- **Saves**: 3 save slots in your browser, export/import a save file, and reset a room (with undo).
- Light and dark themes, a mood colour for each room, optional ambient sound and sound effects (off by default), reduced-motion support, keyboard navigation, and a phone layout with tabs.
- Every popup closes with its X, Cancel, `Esc`, a click outside, or the browser's Back button. If you have unsaved edits it asks first.

## Stuck?

Use the in-game hints first. If you really want the answers, [SOLUTIONS.md](SOLUTIONS.md) has every query and the ending. **It contains spoilers.**

---

## For developers

Plain HTML/CSS/JS with no build step for the app itself. Libraries are vendored in `vendor/`:

- [sql.js](https://github.com/sql-js/sql.js) 1.15.2 (SQLite compiled to WebAssembly), MIT
- [CodeMirror 6](https://codemirror.net/) with `@codemirror/lang-sql`, bundled into one file with esbuild (`scripts/build-vendor.sh`), MIT

How it works:

- `js/world.js` generates every table from fixed seeds (`js/rng.js`), so the data is identical for everyone, every time.
- `js/chapters.js` holds the story, rooms and puzzles. Expected answers are **computed** by running each puzzle's reference query on a fresh copy of the room's database, never stored as text.
- `js/worker.js` runs the database in a Web Worker. Queries that run longer than 5 seconds are stopped and the worker restarts. The database is read-only (`PRAGMA query_only`) and results are capped at 5,000 rows.
- `js/check.js` compares results by value; `js/errors.js` explains SQLite errors; `js/progress.js` handles saves, stars and achievements.
- `sw.js` is a network-first service worker with a versioned cache, so new releases show up on the next visit and the game works offline.

Run it locally with any static server, for example `python3 -m http.server` in this folder, then open http://localhost:8000/.

Tests use Node's built-in runner and need no `npm install`:

```sh
npm test        # or: node --test test/*.test.js
```

They check that every puzzle's reference query passes, that alternative correct queries pass and common wrong ones fail, that the data is deterministic, that hints, saves and achievements work, and they play the whole game from the first room to the accusation.

`node scripts/gen-solutions.js` regenerates SOLUTIONS.md.

## License

[MIT](LICENSE)
