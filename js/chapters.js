/* The Midnight Archive: story, rooms and puzzles. Answer checks never use stored answer text:
   expected results are computed by running each reference solution on the chapter's fresh database.
   (SPOILERS below, obviously.) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.SER = root.SER || {}).chapters = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CASE = {
    title: 'The Midnight Archive',
    prologue: [
      'You came to the Hollowmere Institute to read one manuscript, and you fell asleep over it.',
      'When you wake, the carrel lamp is dead. Red emergency lights hum along the shelves. Every door has sealed itself with a heavy magnetic clunk, and somewhere below you an alarm is ringing itself hoarse.',
      'On the desk, the archive terminal is still glowing on battery power: HOLLOWMERE ARCHIVE \u2014 EMERGENCY MODE \u2014 READ ONLY. Beneath it, someone has taped a note: \u201cThe building remembers everything. Ask it.\u201d'
    ]
  };
  const CHAPTERS = [
    {
      id: 'reading-room', title: 'The Reading Room', concepts: ['SELECT', 'WHERE', 'AND / OR', 'IS NULL', 'LIKE'], mood: 'ember', par: 600,
      tables: ['staff', 'doors_panel'],
      intro: [
        'The Reading Room is all long tables and green lamps that no longer work. The clock above the door stopped at 23:47.',
        'The terminal offers two tables: the staff roster and the building\u2019s door panels. Start with who should be here at this hour.'
      ],
      outro: ['The keypad blinks green. The east door sighs open onto a corridor that smells of old paper and cold dust. Somewhere ahead, the card catalogue.'],
      cheats: [
        { t: 'Pick columns', c: 'SELECT name, role FROM staff;' },
        { t: 'Filter rows', c: "SELECT * FROM staff\nWHERE shift = 'night';" },
        { t: 'Combine conditions', c: "WHERE floor = 1 AND lock_type = 'keypad'" },
        { t: 'Missing values', c: 'WHERE notes IS NULL   -- not = NULL' },
        { t: 'Pattern match', c: "WHERE name LIKE 'Reading%'  -- % = anything" }
      ],
      puzzles: [
        {
          id: 'night-roster', title: 'Who should be here?', check: 'result',
          story: 'If anyone else is trapped in the building, they\u2019re on the night shift.',
          task: 'List the names of everyone on the night shift.',
          solution: "SELECT name FROM staff WHERE shift = 'night';",
          alts: ["SELECT * FROM staff WHERE shift = 'night'", "select name, role from staff where shift like 'night'", "SELECT name FROM staff WHERE shift IN ('night')"],
          wrong: ['SELECT name FROM staff', "SELECT name FROM staff WHERE shift = 'evening'", "SELECT name FROM staff WHERE shift <> 'day'"],
          hints: ['The staff table has a column that says when each person works.', "Use WHERE to keep only matching rows. Text values go in single quotes: WHERE column = 'value'.", "SELECT name FROM staff WHERE shift = '...';  (fill in the shift)"],
          clue: 'Night shift: Wen Li, Theo Marsh, Nadia Okafor, Felix Ordway, Sam Kettering.'
        },
        {
          id: 'vault-keys', title: 'Keys to the Vault', check: 'result',
          story: 'Down the corridor, a second alarm is coming from the Vault, where the archive\u2019s treasures are kept. Very few people can open it.',
          task: 'List the names of all staff with vault clearance.',
          solution: "SELECT name FROM staff WHERE clearance = 'vault';",
          alts: ["SELECT name, shift FROM staff WHERE clearance LIKE 'vault'", "SELECT * FROM staff WHERE clearance = 'vault' ORDER BY name"],
          wrong: ["SELECT name FROM staff WHERE clearance = 'rare'", "SELECT name FROM staff WHERE clearance = 'vault' AND shift = 'night'"],
          hints: ['Look for a column describing what each person is allowed to open.', "Filter on clearance. Check the sample rows to see exactly how the values are written.", "SELECT name FROM staff WHERE clearance = '...';"],
          clue: 'Vault clearance: Imogen Hale (chief archivist), Margot Vell (donor relations), Theo Marsh (security).'
        },
        {
          id: 'east-door', title: 'The way out', check: 'code', label: 'Door code',
          story: 'The doors table lists every panel. The Reading Room has several exits, but the panel by your desk says FLOOR 1 \u2014 KEYPAD. Some of those keypads carry maintenance notes, and a note means the door is broken.',
          task: 'Find the code of the Reading Room door on floor 1 that has a keypad and no maintenance note.',
          solution: "SELECT code FROM doors WHERE name LIKE 'Reading Room%' AND floor = 1 AND lock_type = 'keypad' AND notes IS NULL;",
          alts: ["SELECT * FROM doors WHERE floor = 1 AND lock_type = 'keypad' AND notes IS NULL AND name LIKE '%Reading%'"],
          traps: { '9903': 'The keypad sparks. That door is jammed. Check its notes.', '6618': 'Nothing happens. That keypad was decommissioned.', '3350': 'That code belongs to the Annex, upstairs on floor 2.', '1207': 'That\u2019s the Catalogue Hall door, not a Reading Room exit.' },
          hints: ['Several doors match "Reading Room". You need floor, lock type and notes to narrow them down.', 'An empty note is NULL, and NULL never equals anything. Use IS NULL. LIKE \u2019Reading Room%\u2019 matches names that start with those words.', "SELECT name, code, notes FROM doors WHERE name LIKE 'Reading Room%' AND floor = 1 AND lock_type = 'keypad' AND notes IS ...;"],
          clue: 'Reading Room East exit code: 2741.'
        }
      ]
    },
    {
      id: 'catalogue', title: 'The Card Catalogue', concepts: ['ORDER BY', 'LIMIT / OFFSET', 'DISTINCT', 'NULL ordering'], mood: 'amber', par: 720,
      tables: ['books'],
      intro: [
        'The catalogue hall is a canyon of tiny oak drawers. Several have been pulled out and dumped on the floor, with cards scattered like leaves.',
        'One drawer is labelled RARE \u2014 R-01 TO R-20, and it is empty. The terminal still has the full catalogue.'
      ],
      outro: ['The hall door gives way with a groan. Beyond it, a spiral of ledgers climbs the walls of the Ledger Hall.'],
      cheats: [
        { t: 'Sort', c: 'SELECT title, year FROM books\nORDER BY year DESC;' },
        { t: 'Top N', c: 'ORDER BY year DESC LIMIT 5' },
        { t: 'Skip rows', c: 'LIMIT 1 OFFSET 2   -- the 3rd row' },
        { t: 'No duplicates', c: 'SELECT DISTINCT author FROM books;' },
        { t: 'NULLs sort first (ASC)', c: 'WHERE year IS NOT NULL ORDER BY year' }
      ],
      puzzles: [
        {
          id: 'oldest-rare', title: 'The oldest treasure', check: 'code', label: 'Shelf mark',
          story: 'Whatever was taken, it was taken from the Rare collection, and the thief went for its oldest volume.',
          task: 'Find the shelf mark of the oldest book in the \u2018Rare\u2019 collection that has a known year.',
          solution: "SELECT shelf FROM books WHERE collection = 'Rare' AND year IS NOT NULL ORDER BY year LIMIT 1;",
          alts: ["SELECT shelf FROM books WHERE collection = 'Rare' AND year = (SELECT MIN(year) FROM books WHERE collection = 'Rare')", "select shelf, title, year from books where lower(collection) = 'rare' and year is not null order by year asc limit 1"],
          traps: { 'r-02': 'That psalter fragment has no recorded year. SQLite puts NULLs first when sorting ascending.', 'lh-01': 'That\u2019s the oldest item in the whole archive, but it\u2019s in Local History, not Rare.' },
          hints: ['Filter to the Rare collection, then sort by year so the oldest comes first.', 'ORDER BY year puts the smallest year first, but NULL years sort before everything in SQLite. Exclude them with IS NOT NULL. LIMIT 1 keeps just the top row.', "SELECT shelf, title, year FROM books WHERE collection = 'Rare' AND year IS NOT NULL ORDER BY year LIMIT ...;"],
          clue: 'Shelf R-13 held The Ashgrove Codex (1291). Status: missing.'
        },
        {
          id: 'recent-checkouts', title: 'Last borrowed', check: 'result', ordered: true,
          story: 'Someone was in the catalogue late tonight. The checkout times will show who.',
          task: 'Show the titles of the 5 most recently checked-out books, newest first.',
          solution: 'SELECT title FROM books ORDER BY last_checkout DESC LIMIT 5;',
          alts: ['SELECT title, last_checkout FROM books WHERE last_checkout IS NOT NULL ORDER BY last_checkout DESC LIMIT 5', "SELECT * FROM books WHERE last_checkout >= '2026-03-13' ORDER BY last_checkout DESC"],
          wrong: ['SELECT title FROM books ORDER BY last_checkout LIMIT 5', 'SELECT title FROM books ORDER BY last_checkout DESC LIMIT 6', 'SELECT title FROM books ORDER BY year DESC LIMIT 5'],
          hints: ['last_checkout holds a timestamp. Text dates written as YYYY-MM-DD sort correctly.', 'Newest first means descending order: ORDER BY ... DESC. Then keep only the top five with LIMIT.', 'SELECT title, last_checkout FROM books ORDER BY last_checkout DESC LIMIT ...;'],
          clue: 'Checked out tonight, 22:37\u201322:41: three books about Ashgrove and its star tables.'
        },
        {
          id: 'missing-authors', title: 'A pattern of absences', check: 'result',
          story: 'The Codex isn\u2019t the only gap on the shelves. If other missing books share authors, that could be a pattern.',
          task: 'List each author who has at least one book with status \u2018missing\u2019, once each.',
          solution: "SELECT DISTINCT author FROM books WHERE status = 'missing';",
          alts: ["SELECT author FROM books WHERE status = 'missing' GROUP BY author", "SELECT DISTINCT author, status FROM books WHERE status LIKE 'missing'"],
          wrong: ["SELECT author FROM books WHERE status = 'missing'", "SELECT DISTINCT author FROM books WHERE status = 'in repair'"],
          hints: ['Filter on status first.', 'One author has more than one missing book. DISTINCT removes duplicate rows from the result.', "SELECT DISTINCT author FROM books WHERE status = '...';"],
          clue: 'Missing books: the Codex, two by H. Calloway (star charts) and one by M. Ostrander. All are about Ashgrove or the Fen skies.'
        },
        {
          id: 'astro-door', title: 'The catalogue lock', check: 'code', label: 'Door code',
          story: 'The hall door keypad has a sticky note in the deputy archivist\u2019s handwriting: \u201cCode = year of the 3rd newest Astronomy book. Rowan.\u201d',
          task: 'Sort the Astronomy books by year, newest first. The code is the year of the third one.',
          solution: "SELECT year FROM books WHERE collection = 'Astronomy' AND year IS NOT NULL ORDER BY year DESC LIMIT 1 OFFSET 2;",
          alts: ["SELECT title, year FROM books WHERE collection = 'Astronomy' ORDER BY year DESC LIMIT 3"],
          hints: ['Filter to Astronomy and sort by year, newest first.', 'DESC puts NULLs last, so they won\u2019t get in the way here. LIMIT 1 OFFSET 2 skips two rows and returns the third.', "SELECT title, year FROM books WHERE collection = 'Astronomy' ORDER BY year DESC LIMIT 1 OFFSET ...;"],
          clue: 'Catalogue door opened with the third newest Astronomy year.'
        }
      ]
    },
    {
      id: 'ledger-hall', title: 'The Ledger Hall', concepts: ['COUNT / SUM / AVG', 'GROUP BY', 'HAVING', 'LOWER()'], mood: 'moss', par: 900,
      tables: ['checkouts', 'donations'],
      intro: [
        'Ledgers climb all the way to the ceiling: loans, fines, gifts. The Institute has written down every penny and every page for two hundred years.',
        'Two tables are on screen: every checkout, and every donation. Money and missing books. Somebody wanted the Codex badly.'
      ],
      outro: ['The ledger hall\u2019s lock clicks open. A sign over the next door reads SECURITY OFFICE \u2014 STAFF ONLY.'],
      cheats: [
        { t: 'Count rows', c: 'SELECT COUNT(*) FROM checkouts\nWHERE returned_at IS NULL;' },
        { t: 'Totals per group', c: 'SELECT donor, SUM(amount)\nFROM donations GROUP BY donor;' },
        { t: 'Filter groups', c: 'GROUP BY borrower\nHAVING COUNT(*) > 3' },
        { t: 'Fold messy text', c: 'GROUP BY LOWER(borrower)' },
        { t: 'COUNT(col) skips NULLs', c: 'COUNT(*) counts rows; COUNT(returned_at) counts non-NULLs' }
      ],
      puzzles: [
        {
          id: 'unreturned', title: 'Overdue', check: 'code', label: 'Number of loans',
          story: 'A book that was never returned is a book that left the building.',
          task: 'How many checkouts were never returned?',
          solution: 'SELECT COUNT(*) FROM checkouts WHERE returned_at IS NULL;',
          alts: ['SELECT SUM(returned_at IS NULL) FROM checkouts', 'SELECT COUNT(*) - COUNT(returned_at) FROM checkouts'],
          traps: { '0': 'COUNT(returned_at) skips NULLs, so it can never count the unreturned ones. Try COUNT(*) with a WHERE.' },
          hints: ['A missing return date is NULL.', 'COUNT(*) counts rows. Filter with WHERE returned_at IS NULL first.', 'SELECT COUNT(*) FROM checkouts WHERE returned_at IS ...;'],
          clue: 'Plenty of loans never came back, but most borrowers only have one or two.'
        },
        {
          id: 'hoarders', title: 'The hoarders', check: 'result', set: true,
          story: 'The front-desk volunteer typed names however they liked: capitals, lowercase, shouting. The ledger still knows who keeps books.',
          task: 'Which borrowers have more than 3 unreturned checkouts? Treat names that differ only in capitalisation as the same person.',
          solution: 'SELECT LOWER(borrower) AS borrower FROM checkouts WHERE returned_at IS NULL GROUP BY LOWER(borrower) HAVING COUNT(*) > 3;',
          alts: ['SELECT UPPER(borrower), COUNT(*) AS n FROM checkouts WHERE returned_at IS NULL GROUP BY 1 HAVING n > 3', 'SELECT borrower FROM checkouts WHERE returned_at IS NULL GROUP BY borrower COLLATE NOCASE HAVING COUNT(*) >= 4'],
          wrong: ['SELECT borrower FROM checkouts WHERE returned_at IS NULL GROUP BY borrower HAVING COUNT(*) > 3', 'SELECT LOWER(borrower) FROM checkouts GROUP BY LOWER(borrower) HAVING COUNT(*) > 3'],
          hints: ['Group the unreturned checkouts by borrower and count each group.', 'HAVING filters groups after counting, the way WHERE filters rows. Group by LOWER(borrower) so "PRIYA RAMAN" and "Priya Raman" land in the same group.', 'SELECT LOWER(borrower), COUNT(*) FROM checkouts WHERE returned_at IS NULL GROUP BY LOWER(borrower) HAVING COUNT(*) > ...;'],
          clue: 'Biggest hoarders: Priya Raman (a visiting scholar, all Ashgrove books) and "Sam Kettering". There are two staff members called Sam Kettering.'
        },
        {
          id: 'codex-donor', title: 'Follow the money', check: 'code', label: 'Donor name',
          story: 'The Codex had a fund: \u201cCodex Fund \u2014 acquisition and care.\u201d Someone was paying a lot of attention to it.',
          task: 'Which donor gave the most money in total to the \u2018Codex Fund\u2019?',
          solution: "SELECT donor FROM donations WHERE earmark = 'Codex Fund' GROUP BY donor ORDER BY SUM(amount) DESC LIMIT 1;",
          alts: ["SELECT donor, SUM(amount) AS total FROM donations WHERE earmark = 'Codex Fund' GROUP BY donor ORDER BY total DESC"],
          traps: { 'fenwick family': 'Fenwick gave the biggest single gift, but the question asks for the biggest total. SUM their gifts per donor.' },
          hints: ['Filter to the Codex Fund, then group by donor.', 'SUM(amount) per donor, sorted descending. MAX would only find the largest single gift.', "SELECT donor, SUM(amount) FROM donations WHERE earmark = 'Codex Fund' GROUP BY donor ORDER BY SUM(amount) DESC;"],
          clue: 'The Aurelian Trust gave \u00a3180,000 to the Codex Fund, every gift handled by M. Vell. A further pledge has no amount recorded yet.'
        },
        {
          id: 'fines-door', title: 'Settling accounts', check: 'code', label: 'Door code',
          story: 'The ledger hall door is the treasurer\u2019s pride. Its code is reset every night to the total of the unpaid fines.',
          task: 'Add up the fines that haven\u2019t been paid (paid = 0). That total is the code.',
          solution: 'SELECT SUM(fine) FROM checkouts WHERE paid = 0;',
          alts: ['SELECT TOTAL(fine) FROM checkouts WHERE paid = 0 AND fine IS NOT NULL', 'SELECT SUM(CASE WHEN paid = 0 THEN fine ELSE 0 END) FROM checkouts'],
          hints: ['You need one number: a total.', 'SUM adds up a column and skips NULLs. Filter to unpaid rows with WHERE paid = 0.', 'SELECT SUM(fine) FROM checkouts WHERE paid = ...;'],
          clue: 'Ledger door: the total of unpaid fines.'
        }
      ]
    },
    {
      id: 'security', title: 'The Security Office', concepts: ['INNER JOIN', 'LEFT JOIN', 'Table aliases', 'Joining on IDs, not names'], mood: 'steel', par: 1080,
      tables: ['staff_lite', 'badges', 'swipes', 'doors_zone'],
      intro: [
        'Monitors line the security office, every one of them black. The cameras died with the power.',
        'The badge readers didn\u2019t, though. Every swipe tonight was logged, by badge number. To turn badge numbers into people, you\u2019ll have to JOIN tables.'
      ],
      outro: ['The office door releases. A stairwell leads down, and the air gets warm and smells of hot dust and electronics: the server closet.'],
      cheats: [
        { t: 'Join two tables', c: 'SELECT s.ts, b.holder_id\nFROM swipes AS s\nJOIN badges AS b ON b.badge_id = s.badge_id;' },
        { t: 'Chain joins', c: 'JOIN staff AS p ON p.id = b.holder_id' },
        { t: 'Keep unmatched rows', c: 'LEFT JOIN badges b ON ...\nWHERE b.badge_id IS NULL' },
        { t: 'Time ranges', c: "WHERE s.ts >= '2026-03-13 22:00'" }
      ],
      puzzles: [
        {
          id: 'corridor', title: 'Into the vault corridor', check: 'result', set: true,
          story: 'The Vault Corridor reader logs everyone who goes in. The thief must be on that list.',
          task: 'Who swiped into the \u2018Vault Corridor\u2019 after 22:00 tonight (2026-03-13)? List their names.',
          solution: "SELECT DISTINCT p.name FROM swipes s JOIN badges b ON b.badge_id = s.badge_id JOIN staff p ON p.id = b.holder_id WHERE s.door = 'Vault Corridor' AND s.ts >= '2026-03-13 22:00:00';",
          alts: ["SELECT p.name, s.ts FROM staff p JOIN badges b ON p.id = b.holder_id JOIN swipes s ON s.badge_id = b.badge_id WHERE s.door = 'Vault Corridor' AND s.ts > '2026-03-13 22:00'", "SELECT name FROM staff WHERE id IN (SELECT holder_id FROM badges WHERE badge_id IN (SELECT badge_id FROM swipes WHERE door = 'Vault Corridor' AND ts >= '2026-03-13 22'))"],
          wrong: ["SELECT DISTINCT p.name FROM swipes s JOIN badges b ON b.badge_id = s.badge_id JOIN staff p ON p.id = b.holder_id WHERE s.door = 'Vault Corridor'", "SELECT DISTINCT p.name FROM swipes s JOIN badges b ON b.badge_id = s.badge_id JOIN staff p ON p.id = b.holder_id WHERE s.door = 'Vault' "],
          hints: ['Swipes record a badge_id. badges link badge_id to holder_id, and staff link id to a name.', 'Join swipes \u2192 badges ON badge_id, then badges \u2192 staff ON staff.id = badges.holder_id. Filter by door and time; timestamps compare as text.', "SELECT DISTINCT p.name FROM swipes s JOIN badges b ON b.badge_id = s.badge_id JOIN staff p ON p.id = b.holder_id WHERE s.door = 'Vault Corridor' AND s.ts >= '...';"],
          clue: 'Vault Corridor after 22:00: Nadia Okafor (22:05) and Theo Marsh (22:30, and again at 23:49, two minutes after the blackout).'
        },
        {
          id: 'ghost-badge', title: 'A ghost badge', check: 'code', label: 'Badge ID',
          story: 'One badge in tonight\u2019s log doesn\u2019t belong to anyone. A plain JOIN would quietly drop it.',
          task: 'Find the badge that was swiped tonight but doesn\u2019t appear in the badges table at all.',
          solution: 'SELECT s.badge_id FROM swipes s LEFT JOIN badges b ON b.badge_id = s.badge_id WHERE b.badge_id IS NULL;',
          alts: ['SELECT badge_id, door, ts FROM swipes WHERE badge_id NOT IN (SELECT badge_id FROM badges)', 'SELECT DISTINCT s.badge_id FROM swipes s WHERE NOT EXISTS (SELECT 1 FROM badges b WHERE b.badge_id = s.badge_id)'],
          hints: ['An INNER JOIN only keeps rows that match on both sides. You want the swipe that matches nothing.', 'A LEFT JOIN keeps every swipe. Where no badge matched, the badge columns come back NULL.', 'SELECT s.badge_id, s.door, s.ts FROM swipes s LEFT JOIN badges b ON b.badge_id = s.badge_id WHERE b.badge_id IS ...;'],
          clue: 'Unregistered badge B-0913 opened the Service Lift at 23:31. Someone made a badge tonight.'
        },
        {
          id: 'revoked', title: 'Dead badge walking', check: 'code', label: 'Staff ID',
          story: 'A revoked badge was used tonight. It was denied, but someone still held it up to a reader. And there are two Sam Ketterings on staff, so a name won\u2019t do here.',
          task: 'Find the badge with status \u2018revoked\u2019 that was swiped tonight. Give its holder\u2019s staff id.',
          solution: "SELECT DISTINCT b.holder_id FROM swipes s JOIN badges b ON b.badge_id = s.badge_id WHERE b.status = 'revoked';",
          alts: ["SELECT p.id, p.name, p.role, s.door, s.ts FROM swipes s JOIN badges b ON b.badge_id = s.badge_id JOIN staff p ON p.id = b.holder_id WHERE b.status = 'revoked'"],
          traps: { '14': 'That\u2019s the Sam Kettering who works nights as a custodian. Join on the badge\u2019s holder_id, not the name.', '11': 'Felix\u2019s old badge was revoked, but was it swiped tonight?' },
          hints: ['Join swipes to badges and keep only revoked badges.', 'The badges table tells you who holds each badge: holder_id is the staff id. Joining staff by name would mix up the two Sams.', "SELECT b.holder_id, s.door, s.ts FROM swipes s JOIN badges b ON b.badge_id = s.badge_id WHERE b.status = '...';"],
          clue: 'Revoked badge B-0714 (Sam Kettering #22, the retired groundskeeper) was denied at the Loading Dock at 23:52. Someone tried to get out.'
        },
        {
          id: 'denied-door', title: 'The supervisor\u2019s riddle', check: 'code', label: 'Door code',
          story: 'Ezra Quill, the security supervisor, left a note on the exit keypad: \u201cExit code = the code of whichever door turned people away most often tonight. Don\u2019t ask.\u201d',
          task: 'Find the door with the most \u2018denied\u2019 swipes, and give its code from the doors table.',
          solution: "SELECT d.code FROM swipes s JOIN doors d ON d.name = s.door WHERE s.result = 'denied' GROUP BY d.name ORDER BY COUNT(*) DESC LIMIT 1;",
          alts: ["SELECT code FROM doors WHERE name = (SELECT door FROM swipes WHERE result = 'denied' GROUP BY door ORDER BY COUNT(*) DESC LIMIT 1)"],
          hints: ['Count denied swipes per door, then look up that door\u2019s code.', 'Join swipes to doors ON doors.name = swipes.door, GROUP BY the door and ORDER BY COUNT(*) DESC.', "SELECT d.name, d.code, COUNT(*) FROM swipes s JOIN doors d ON d.name = s.door WHERE s.result = 'denied' GROUP BY d.name ORDER BY COUNT(*) DESC;"],
          clue: 'Security office exit: code of the door that denied the most swipes.'
        }
      ]
    },
    {
      id: 'server-closet', title: 'The Server Closet', concepts: ['Subqueries', 'IN / NOT IN', 'NOT EXISTS', 'NULL traps in NOT IN', 'Averages of counts'], mood: 'cyan', par: 1200,
      tables: ['accounts', 'logins', 'commands', 'terminals', 'staff_lite'],
      intro: [
        'Racks blink amber in the dark. One server fan is still spinning on battery, and the screen above the racks shows a single line: LOCKDOWN ISSUED 23:44 \u2014 EFFECTIVE 23:47.',
        'The blackout was ordered from a terminal. Find out which one, and whose account did it.'
      ],
      outro: ['The closet door clicks. Felix Ordway\u2019s mug is still warm on the desk. A spiral staircase leads up to the Map Room.'],
      cheats: [
        { t: 'Scalar subquery', c: 'SELECT * FROM logins\nWHERE id = (SELECT login_id FROM commands\n            WHERE command LIKE \'LOCKDOWN%\');' },
        { t: 'IN a list', c: 'WHERE username IN (SELECT username FROM accounts)' },
        { t: 'NOT EXISTS', c: 'WHERE NOT EXISTS (SELECT 1 FROM logins l\n  WHERE l.terminal = t.id AND l.success = 1)' },
        { t: 'Subquery as a table', c: 'SELECT AVG(n) FROM (SELECT COUNT(*) AS n\n  FROM logins GROUP BY username)' }
      ],
      puzzles: [
        {
          id: 'lockdown-terminal', title: 'Where the order came from', check: 'code', label: 'Terminal ID',
          story: 'The commands table records what was typed, and logins record where.',
          task: 'Which terminal issued the LOCKDOWN command?',
          solution: "SELECT terminal FROM logins WHERE id = (SELECT login_id FROM commands WHERE command LIKE 'LOCKDOWN%');",
          alts: ["SELECT l.terminal FROM commands c JOIN logins l ON l.id = c.login_id WHERE c.command LIKE '%lockdown%'", "SELECT terminal FROM logins WHERE id IN (SELECT login_id FROM commands WHERE UPPER(command) LIKE 'LOCKDOWN%')"],
          hints: ['Find the command first. It tells you a login_id.', 'Use the login_id in a subquery, WHERE id = (SELECT login_id FROM commands WHERE ...), to look up the login\u2019s terminal.', "SELECT terminal FROM logins WHERE id = (SELECT login_id FROM commands WHERE command LIKE '...%');"],
          clue: 'The LOCKDOWN came from T-07, the terminal in the Donor Lounge. The same session also put the VAULT-MAG circuit into maintenance at 23:46.'
        },
        {
          id: 'lockdown-user', title: 'Whose fingerprints', check: 'code', label: 'Staff name', accept: ['fordway'],
          story: 'Every login belongs to an account, and every account to a person.',
          task: 'Whose account issued the LOCKDOWN? Give the staff member\u2019s name.',
          solution: "SELECT name FROM staff WHERE id = (SELECT staff_id FROM accounts WHERE username = (SELECT username FROM logins WHERE id = (SELECT login_id FROM commands WHERE command LIKE 'LOCKDOWN%')));",
          alts: ["SELECT s.name FROM commands c JOIN logins l ON l.id = c.login_id JOIN accounts a ON a.username = l.username JOIN staff s ON s.id = a.staff_id WHERE c.command LIKE 'LOCKDOWN%'"],
          hints: ['Same command, one step further: login \u2192 username \u2192 account \u2192 staff.', 'Subqueries can nest. Each inner query hands one value to the query around it.', "SELECT name FROM staff WHERE id = (SELECT staff_id FROM accounts WHERE username = (SELECT username FROM logins WHERE id = (...)));"],
          clue: 'The LOCKDOWN ran under fordway, Felix Ordway\u2019s account. But Felix\u2019s usual terminal is T-01, here in the closet.'
        },
        {
          id: 'brute-force', title: 'Knocking on the door', check: 'result', set: true,
          story: 'Logins fail all the time: tired fingers, caps lock. But one account failed far more often than anyone else\u2019s.',
          task: 'List the usernames whose number of failed logins is greater than the average number of failed logins per user (counting only users who had at least one failure).',
          solution: 'SELECT username FROM logins WHERE success = 0 GROUP BY username HAVING COUNT(*) > (SELECT AVG(n) FROM (SELECT COUNT(*) AS n FROM logins WHERE success = 0 GROUP BY username));',
          alts: ['WITH f AS (SELECT username, COUNT(*) AS n FROM logins WHERE success = 0 GROUP BY username) SELECT username, n FROM f WHERE n > (SELECT AVG(n) FROM f)'],
          wrong: ['SELECT username FROM logins WHERE success = 0 GROUP BY username', 'SELECT username FROM logins WHERE success = 0 GROUP BY username HAVING COUNT(*) > 1'],
          hints: ['Count failures per username, then compare each count with the average count.', 'The average comes from a subquery over another subquery: SELECT AVG(n) FROM (SELECT COUNT(*) AS n FROM logins WHERE success = 0 GROUP BY username).', 'SELECT username FROM logins WHERE success = 0 GROUP BY username HAVING COUNT(*) > (SELECT AVG(n) FROM (...));'],
          clue: 'fordway failed 17 times in a row on T-07 between 23:12 and 23:28, then got in at 23:29. Someone guessed Felix\u2019s password.'
        },
        {
          id: 'cold-terminal', title: 'The cold terminal', check: 'code', label: 'Terminal PIN',
          story: 'The closet door is opened by the PIN of the one terminal nobody has logged into successfully. A sysadmin\u2019s idea of a joke. Careful: June Tamaki logged in from home tonight, and remote sessions have no terminal.',
          task: 'Find the terminal with no successful logins at all, and give its pin.',
          solution: 'SELECT pin FROM terminals t WHERE NOT EXISTS (SELECT 1 FROM logins l WHERE l.terminal = t.id AND l.success = 1);',
          alts: ['SELECT pin FROM terminals WHERE id NOT IN (SELECT terminal FROM logins WHERE success = 1 AND terminal IS NOT NULL)', 'SELECT t.pin FROM terminals t LEFT JOIN logins l ON l.terminal = t.id AND l.success = 1 WHERE l.id IS NULL'],
          traps: {},
          hints: ['Look for terminals with no successful login row.', 'NOT IN returns nothing at all if its list contains a NULL, and the remote session has a NULL terminal. Use NOT EXISTS, or filter NULLs out of the subquery.', 'SELECT id, pin FROM terminals t WHERE NOT EXISTS (SELECT 1 FROM logins l WHERE l.terminal = t.id AND l.success = ...);'],
          clue: 'Nobody ever got into T-09 at the Loading Dock. Only two failed attempts by "tashby", an account that doesn\u2019t exist.'
        }
      ]
    },
    {
      id: 'map-room', title: 'The Map Room', concepts: ['WITH (CTEs)', 'Chaining CTEs', 'Greatest-per-group', 'Time windows'], mood: 'violet', par: 1200,
      tables: ['people', 'tags', 'pings', 'rooms'],
      intro: [
        'Parchment maps of the county cover every wall. In the middle of the room, a glass-topped table shows the Institute\u2019s floor plan, lit from below by a single battery lamp.',
        'Staff lanyards and visitor passes ping a sensor each time someone enters a room. Build the picture step by step. A WITH clause lets you name each step.'
      ],
      outro: ['The Map Room door slides back. A narrow stair climbs up into the clock tower, where gears tick in the dark.'],
      cheats: [
        { t: 'Name a step', c: "WITH late AS (\n  SELECT * FROM pings WHERE ts >= '2026-03-13 23:00'\n)\nSELECT room, COUNT(*) FROM late GROUP BY room;" },
        { t: 'Chain steps', c: 'WITH a AS (...), b AS (SELECT ... FROM a)\nSELECT * FROM b;' },
        { t: 'Latest row per group', c: 'WITH last AS (SELECT tag, MAX(ts) AS ts\n  FROM pings GROUP BY tag)\nSELECT p.* FROM pings p JOIN last USING (tag, ts);' }
      ],
      puzzles: [
        {
          id: 'blackout-positions', title: 'Where everyone stood', check: 'result',
          story: 'At 23:47 the lights went out. Where was each person at that moment?',
          task: 'For each person, find the room they entered most recently before 23:47:00. Show their name and that room.',
          solution: "WITH last AS (SELECT tag, MAX(ts) AS ts FROM pings WHERE ts < '2026-03-13 23:47:00' GROUP BY tag) SELECT pe.name, p.room FROM last JOIN pings p ON p.tag = last.tag AND p.ts = last.ts JOIN tags t ON t.tag = p.tag JOIN people pe ON pe.id = t.person_id;",
          alts: ["SELECT pe.name, p.room, MAX(p.ts) FROM pings p JOIN tags t ON t.tag = p.tag JOIN people pe ON pe.id = t.person_id WHERE p.ts < '2026-03-13 23:47' GROUP BY pe.id", "WITH ranked AS (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY tag ORDER BY ts DESC) AS rn FROM pings p WHERE ts < '2026-03-13 23:47:00') SELECT pe.name, r.room FROM ranked r JOIN tags t USING (tag) JOIN people pe ON pe.id = t.person_id WHERE rn = 1"],
          wrong: ["SELECT pe.name, p.room FROM pings p JOIN tags t ON t.tag = p.tag JOIN people pe ON pe.id = t.person_id WHERE p.ts < '2026-03-13 23:47:00'", "WITH last AS (SELECT tag, MAX(ts) AS ts FROM pings GROUP BY tag) SELECT pe.name, p.room FROM last JOIN pings p ON p.tag = last.tag AND p.ts = last.ts JOIN tags t ON t.tag = p.tag JOIN people pe ON pe.id = t.person_id"],
          hints: ['Step 1: each tag\u2019s latest ping before 23:47. Step 2: look up the room for that ping. Step 3: turn tags into names.', 'In a CTE, GROUP BY tag and take MAX(ts). Then join it back to pings ON tag AND ts to get the room, and join tags and people for the name. The unassigned test tag drops out of that join.', "WITH last AS (SELECT tag, MAX(ts) AS ts FROM pings WHERE ts < '2026-03-13 23:47:00' GROUP BY tag) SELECT pe.name, p.room FROM last JOIN pings p ON p.tag = last.tag AND p.ts = last.ts JOIN tags t ON ... JOIN people pe ON ...;"],
          clue: 'At 23:47: Theo Marsh was in the Lobby, Felix Ordway in the Server Closet, Priya Raman and you (Guest G-17) in the Reading Room, and Margot Vell in the Donor Lounge.'
        },
        {
          id: 'lounge-visitors', title: 'Who was in the lounge', check: 'result', set: true,
          story: 'T-07, the terminal that issued the LOCKDOWN, sits in the Donor Lounge. Whoever typed on it had to be in that room.',
          task: 'List the names of everyone who entered the Donor Lounge between 23:00 and 23:45 tonight.',
          solution: "WITH lounge AS (SELECT tag FROM pings WHERE room = 'Donor Lounge' AND ts BETWEEN '2026-03-13 23:00:00' AND '2026-03-13 23:45:00') SELECT DISTINCT pe.name FROM lounge l JOIN tags t ON t.tag = l.tag JOIN people pe ON pe.id = t.person_id;",
          alts: ["SELECT pe.name, p.ts FROM pings p JOIN tags t ON t.tag = p.tag JOIN people pe ON pe.id = t.person_id WHERE p.room = 'Donor Lounge' AND p.ts >= '2026-03-13 23:00' AND p.ts <= '2026-03-13 23:45'"],
          wrong: ["SELECT DISTINCT pe.name FROM pings p JOIN tags t ON t.tag = p.tag JOIN people pe ON pe.id = t.person_id WHERE p.room = 'Donor Lounge'"],
          hints: ['Filter pings to the Donor Lounge and the time window, then turn tags into names.', "BETWEEN '...23:00:00' AND '...23:45:00' works on these text timestamps. Join tags ON tag, then people ON person_id.", "WITH lounge AS (SELECT tag FROM pings WHERE room = 'Donor Lounge' AND ts BETWEEN '...' AND '...') SELECT DISTINCT pe.name FROM lounge l JOIN tags t ON ... JOIN people pe ON ...;"],
          clue: 'Donor Lounge, 23:00\u201323:45: Priya Raman (23:05, four minutes), Sam Kettering (23:15, mopping) and Margot Vell (23:01 and again at 23:33).'
        },
        {
          id: 'crowded-room', title: 'The crowded room', check: 'code', label: 'Door code',
          story: 'The Map Room\u2019s exit panel reads: CODE ROTATED \u2014 SEE ROOM WITH MOST OCCUPANTS AT LAST POWER EVENT. Every room\u2019s current code is in the rooms table.',
          task: 'Using the positions at 23:47 (one room per person), find the room with the most people in it, and give its door_code.',
          solution: "WITH last AS (SELECT tag, MAX(ts) AS ts FROM pings WHERE ts < '2026-03-13 23:47:00' GROUP BY tag), pos AS (SELECT p.room FROM last JOIN pings p ON p.tag = last.tag AND p.ts = last.ts JOIN tags t ON t.tag = p.tag WHERE t.person_id IS NOT NULL), busiest AS (SELECT room, COUNT(*) AS n FROM pos GROUP BY room ORDER BY n DESC LIMIT 1) SELECT r.door_code FROM busiest b JOIN rooms r ON r.name = b.room;",
          alts: ["WITH pos AS (SELECT p.tag, p.room, MAX(p.ts) FROM pings p JOIN tags t ON t.tag = p.tag AND t.person_id IS NOT NULL WHERE p.ts < '2026-03-13 23:47' GROUP BY p.tag) SELECT door_code FROM rooms WHERE name = (SELECT room FROM pos GROUP BY room ORDER BY COUNT(*) DESC LIMIT 1)"],
          hints: ['Reuse your answer to "Where everyone stood", then count people per room.', 'Chain CTEs: last \u2192 positions \u2192 counts per room \u2192 the top room. Then join rooms to get its door_code.', 'WITH last AS (...), pos AS (SELECT p.room FROM last JOIN pings p ON ... ), busiest AS (SELECT room, COUNT(*) n FROM pos GROUP BY room ORDER BY n DESC LIMIT 1) SELECT door_code FROM rooms WHERE name = (SELECT room FROM busiest);'],
          clue: 'Three people were in the Map Room at the blackout: Nadia, Sam the custodian and Wen Li, who had come to check the humidity.'
        }
      ]
    },
    {
      id: 'clock-tower', title: 'The Clock Tower', concepts: ['Window functions', 'LAG / LEAD', 'PARTITION BY', 'Running totals', 'julianday() date math'], mood: 'brass', par: 1320,
      tables: ['power_log', 'pings', 'tags', 'people'],
      intro: [
        'Brass gears the size of cartwheels fill the tower. They stopped when the power went out, but the power meters up here kept logging every minute.',
        'A window function looks at the rows around the current one without collapsing them into groups. That\u2019s how you tell a fault from a deliberate act.'
      ],
      outro: ['The tower hatch swings open. Straight down a service shaft is a steel door with a wheel lock: the Vault.'],
      cheats: [
        { t: 'Previous row', c: 'SELECT ts, kw,\n  LAG(kw) OVER (ORDER BY ts) AS prev_kw\nFROM power_log WHERE circuit = \'MAIN\';' },
        { t: 'Per group', c: 'LEAD(ts) OVER (PARTITION BY tag ORDER BY ts)' },
        { t: 'Running total', c: 'SUM(kw) OVER (ORDER BY ts) AS running' },
        { t: 'Minutes between', c: '(julianday(b) - julianday(a)) * 24 * 60' },
        { t: 'Filter a window', c: 'WITH w AS (SELECT ..., LAG(...) OVER (...) AS p FROM t)\nSELECT * FROM w WHERE ...;  -- windows can\u2019t go in WHERE' }
      ],
      puzzles: [
        {
          id: 'mag-drop', title: 'The first light to go out', check: 'code', label: 'Time (HH:MM)', accept: [],
          story: 'The main power failed at 23:47, but the vault\u2019s magnetic lock runs on its own circuit, VAULT-MAG. If it dropped first, this wasn\u2019t an accident.',
          task: 'Find the minute when VAULT-MAG\u2019s reading fell by more than 3 kW compared with the previous reading. Answer as HH:MM.',
          solution: "WITH w AS (SELECT ts, kw, LAG(kw) OVER (ORDER BY ts) AS prev FROM power_log WHERE circuit = 'VAULT-MAG') SELECT strftime('%H:%M', ts) FROM w WHERE prev - kw > 3;",
          alts: ["SELECT ts FROM (SELECT ts, kw - LAG(kw) OVER (PARTITION BY circuit ORDER BY ts) AS d, circuit FROM power_log) WHERE circuit = 'VAULT-MAG' AND d < -3"],
          traps: { '23:47': 'That\u2019s the main blackout. This one is about the VAULT-MAG circuit specifically.' },
          hints: ['Compare each VAULT-MAG reading with the one before it.', 'LAG(kw) OVER (ORDER BY ts) gives the previous reading. Window results can\u2019t be filtered in WHERE directly, so wrap the query in a CTE.', "WITH w AS (SELECT ts, kw, LAG(kw) OVER (ORDER BY ts) AS prev FROM power_log WHERE circuit = 'VAULT-MAG') SELECT ts FROM w WHERE prev - kw > ...;"],
          clue: 'VAULT-MAG lost power at 23:46, one minute before the blackout, exactly as the command from T-07 had scheduled.'
        },
        {
          id: 'longest-stay', title: 'The long wait', check: 'code', label: 'Name',
          story: 'Everyone who passed through the Donor Lounge tonight had a reason. But one person stayed far longer than a quick errand would take.',
          task: 'A stay lasts from entering a room to that person\u2019s next ping anywhere. Who had the single longest stay in the Donor Lounge tonight?',
          solution: "WITH s AS (SELECT tag, room, ts, LEAD(ts) OVER (PARTITION BY tag ORDER BY ts) AS next_ts FROM pings) SELECT pe.name FROM s JOIN tags t ON t.tag = s.tag JOIN people pe ON pe.id = t.person_id WHERE s.room = 'Donor Lounge' AND s.next_ts IS NOT NULL ORDER BY julianday(s.next_ts) - julianday(s.ts) DESC LIMIT 1;",
          alts: ["WITH s AS (SELECT p.*, LEAD(ts) OVER (PARTITION BY tag ORDER BY ts) AS nxt FROM pings p) SELECT pe.name, ROUND((julianday(nxt) - julianday(s.ts)) * 1440) AS minutes FROM s JOIN tags USING (tag) JOIN people pe ON pe.id = tags.person_id WHERE room = 'Donor Lounge' ORDER BY minutes DESC LIMIT 1"],
          hints: ['For every ping you need the same person\u2019s next ping. That\u2019s LEAD(ts), partitioned by tag.', 'Duration in minutes is (julianday(next_ts) - julianday(ts)) * 1440. Keep Donor Lounge rows and sort by duration, longest first.', "WITH s AS (SELECT tag, room, ts, LEAD(ts) OVER (PARTITION BY tag ORDER BY ts) AS next_ts FROM pings) SELECT ... WHERE s.room = 'Donor Lounge' ORDER BY julianday(next_ts) - julianday(ts) DESC LIMIT 1;"],
          clue: 'Margot Vell stayed in the Donor Lounge from 23:01 to 23:30, the whole time T-07 was being used to guess Felix\u2019s password.'
        },
        {
          id: 'backup-door', title: 'The battery clock', check: 'code', label: 'Time (HH:MM)',
          story: 'The tower hatch is wired to the backup batteries. It unlocks with the minute when the batteries had delivered more than 40 kW of readings in total since the blackout.',
          task: 'Keep a running total of BACKUP readings in time order. At what minute (HH:MM) did it first go above 40?',
          solution: "WITH r AS (SELECT ts, SUM(kw) OVER (ORDER BY ts) AS running FROM power_log WHERE circuit = 'BACKUP') SELECT strftime('%H:%M', MIN(ts)) FROM r WHERE running > 40;",
          alts: ["SELECT ts, running FROM (SELECT ts, SUM(kw) OVER (ORDER BY ts ROWS UNBOUNDED PRECEDING) AS running FROM power_log WHERE circuit = 'BACKUP') WHERE running > 40 ORDER BY ts LIMIT 1"],
          hints: ['You need a cumulative sum that grows row by row.', 'SUM(kw) OVER (ORDER BY ts) is a running total. Wrap it in a CTE, then keep the first row where it\u2019s above 40.', "WITH r AS (SELECT ts, SUM(kw) OVER (ORDER BY ts) AS running FROM power_log WHERE circuit = 'BACKUP') SELECT MIN(ts) FROM r WHERE running > ...;"],
          clue: 'Tower hatch opened on the battery clock.'
        }
      ]
    },
    {
      id: 'vault', title: 'The Vault', concepts: ['Self-joins', 'Date math', 'TRIM / UPPER / LIKE', 'SUBSTR', 'group_concat'], mood: 'crimson', par: 1500,
      tables: ['swipes', 'doors_plain', 'walk_times', 'encoder_log', 'stations', 'manifest'],
      intro: [
        'The Vault stands open. Shelf R-13 is bare, its velvet still dented where the Codex lay for seven hundred years.',
        'Theo Marsh\u2019s badge opened this door at 23:49. But Theo was in the Lobby at 23:47. Can one badge be in two places at once?'
      ],
      outro: ['The terminal accepts the phrase. Deep in the walls, the mag-locks let go one by one, and the building breathes out.'],
      cheats: [
        { t: 'Self-join', c: 'SELECT a.badge_id, a.door, b.door\nFROM swipes a JOIN swipes b\n  ON a.badge_id = b.badge_id AND a.ts < b.ts;' },
        { t: 'Seconds between', c: "(julianday(b.ts) - julianday(a.ts)) * 86400" },
        { t: 'Messy text', c: "WHERE UPPER(TRIM(badge_written)) = 'B-0417'" },
        { t: 'Same day', c: "WHERE date(ts) = '2026-03-13'" },
        { t: 'Pieces of text', c: "SUBSTR(ref, 4, 1)   -- 1 char at position 4" },
        { t: 'Glue rows together', c: "group_concat(x, '' ORDER BY crate)" }
      ],
      puzzles: [
        {
          id: 'impossible-travel', title: 'Two places at once', check: 'result', set: true,
          story: 'walk_times says how many seconds it takes to walk between any two doors. A badge that beats the walk wasn\u2019t carried by one person.',
          task: 'Find the badge that was swiped at two different doors faster than anyone could walk between them. List the badge_id.',
          solution: 'SELECT DISTINCT a.badge_id FROM swipes a JOIN swipes b ON a.badge_id = b.badge_id AND a.ts < b.ts AND a.door <> b.door JOIN walk_times w ON w.from_door = a.door AND w.to_door = b.door WHERE (julianday(b.ts) - julianday(a.ts)) * 86400 < w.seconds;',
          alts: ["SELECT a.badge_id, a.door, a.ts, b.door, b.ts, w.seconds FROM swipes a, swipes b, walk_times w WHERE a.badge_id = b.badge_id AND a.id <> b.id AND w.from_door = a.door AND w.to_door = b.door AND b.ts > a.ts AND strftime('%s', b.ts) - strftime('%s', a.ts) < w.seconds"],
          wrong: ['SELECT DISTINCT a.badge_id FROM swipes a JOIN swipes b ON a.badge_id = b.badge_id AND a.ts < b.ts AND a.door <> b.door', 'SELECT DISTINCT a.badge_id FROM swipes a JOIN swipes b ON a.badge_id = b.badge_id AND a.ts < b.ts AND a.door <> b.door WHERE (julianday(b.ts) - julianday(a.ts)) * 86400 < 600'],
          hints: ['Join swipes to itself: same badge, a later swipe, different door.', 'Join walk_times on the two doors and compare the gap in seconds: (julianday(b.ts) - julianday(a.ts)) * 86400.', 'SELECT DISTINCT a.badge_id FROM swipes a JOIN swipes b ON a.badge_id = b.badge_id AND a.ts < b.ts AND a.door <> b.door JOIN walk_times w ON w.from_door = a.door AND w.to_door = b.door WHERE ... < w.seconds;'],
          clue: 'B-0417 was at the Lobby Desk at 23:48:30 and the Vault Corridor 35 seconds later. That walk takes four minutes. Theo\u2019s badge has been cloned.'
        },
        {
          id: 'encoder', title: 'The badge printer', check: 'code', label: 'Room', accept: ['ENC-2'],
          story: 'Badges are written by encoders. The log is messy: people type IDs in lowercase, with stray spaces, or put them in the note instead.',
          task: 'Which room holds the encoder that wrote a copy of B-0417 tonight (2026-03-13)?',
          solution: "SELECT s.location FROM encoder_log e JOIN stations s ON s.station = e.station WHERE UPPER(TRIM(e.badge_written)) = 'B-0417' AND date(e.ts) = '2026-03-13';",
          alts: ["SELECT location FROM stations WHERE station IN (SELECT station FROM encoder_log WHERE badge_written LIKE '%0417%' AND ts LIKE '2026-03-13%')"],
          traps: { 'security office': 'That encoder wrote B-0417 in 2016, when Theo was hired. You want tonight\u2019s copy.', 'enc-1': 'ENC-1 wrote the original badge in 2016. You want tonight\u2019s copy.' },
          hints: ['Find tonight\u2019s encoder_log row for B-0417, then look up where that station is.', "badge_written is messy. UPPER(TRIM(badge_written)) cleans it up, or use LIKE '%0417%'. date(ts) = '2026-03-13' keeps only tonight.", "SELECT s.location FROM encoder_log e JOIN stations s ON s.station = e.station WHERE UPPER(TRIM(e.badge_written)) = 'B-0417' AND date(e.ts) = '...';"],
          clue: 'At 23:18 the Donor Lounge encoder (ENC-2) wrote a copy of B-0417. Four minutes later it wrote blank badge B-0913.'
        },
        {
          id: 'passphrase', title: 'The courier\u2019s crates', check: 'code', label: 'Passphrase',
          story: 'Outgoing crates are staged in the Donor Lounge for the morning courier. The building\u2019s release phrase is hidden in the reference numbers of the crates going to the Aurelian Trust: the letter at position 4 of each ref, in crate order.',
          task: 'For the crates addressed to the Aurelian Trust (watch the messy spelling), take character 4 of each ref, ordered by crate, and join them into one word.',
          solution: "SELECT group_concat(SUBSTR(ref, 4, 1), '' ORDER BY crate) FROM manifest WHERE LOWER(TRIM(consignee)) = 'aurelian trust';",
          alts: ["WITH x AS (SELECT crate, SUBSTR(ref, 4, 1) AS c FROM manifest WHERE consignee LIKE '%aurelian%' ORDER BY crate) SELECT group_concat(c, '') FROM x"],
          hints: ['Filter the manifest to the Aurelian Trust, then pull one character out of each ref.', "Consignee names vary in case and have stray spaces, so use LOWER(TRIM(consignee)) or LIKE. SUBSTR(ref, 4, 1) gets the 4th character, and group_concat(..., '' ORDER BY crate) joins them.", "SELECT group_concat(SUBSTR(ref, 4, 1), '' ORDER BY crate) FROM manifest WHERE LOWER(TRIM(consignee)) = '...';"],
          clue: 'The Aurelian Trust crates spell the release phrase. One of them, CR-37, weighs 9.4 kg: about what a medieval codex in a padded case would weigh.'
        }
      ]
    }
  ];
  const SUSPECTS = [
    { id: 'hale', name: 'Dr. Imogen Hale', role: 'Chief Archivist', reply: 'Imogen Hale\u2019s badge left by the Staff Entrance at 21:10, and her lanyard never came back. She has vault clearance, but she didn\u2019t need to clone anyone\u2019s badge to use it.' },
    { id: 'marsh', name: 'Theo Marsh', role: 'Security Officer', reply: 'Theo\u2019s badge opened the Vault at 23:49, but 35 seconds earlier the same badge was at the Lobby Desk, four minutes\u2019 walk away. Theo was at the desk. Someone else was carrying a copy.' },
    { id: 'ordway', name: 'Felix Ordway', role: 'IT Contractor', reply: 'The LOCKDOWN ran under Felix\u2019s account, but from T-07 in the Donor Lounge, after 17 failed password guesses. Felix\u2019s lanyard never left the Server Closet.' },
    { id: 'raman', name: 'Priya Raman', role: 'Visiting Scholar', reply: 'Priya borrowed every book about Ashgrove she could find. That\u2019s a scholar\u2019s obsession, not a crime. She spent four minutes in the Donor Lounge asking for help, and at the blackout she was in the Reading Room with you.' },
    { id: 'kettering', name: 'Sam Kettering', role: 'Custodian (or the retired groundskeeper?)', reply: 'Which Sam? The custodian was mopping the Map Room at 23:47. The other Sam retired years ago. His revoked badge was used at the Loading Dock, but not by him.' },
    { id: 'vell', name: 'Margot Vell', role: 'Director of Donor Relations', culprit: true }
  ];
  const FINALE = [
    'You type the phrase, and the Institute unlocks itself one door at a time.',
    'You find Margot Vell in the Donor Lounge, sitting very still beside crate CR-37, addressed to the Aurelian Trust. Under the gala programmes, wrapped in archival tissue, is the Ashgrove Codex.',
    'The Trust had pledged a fortune for a private sale the board had refused. Margot handled every one of its gifts. Tonight she guessed Felix\u2019s password from the lounge terminal, cut the vault\u2019s magnetic lock, ordered the lockdown, and walked into the Vault with a copy of Theo\u2019s badge. When the Loading Dock refused a dead man\u2019s badge, she hid the Codex in a crate the morning courier would have carried away.',
    'She hadn\u2019t planned on a reader asleep in the Reading Room, or on that reader knowing SQL.',
    'Dawn comes up grey over the Fens. Case closed.'
  ];
  return { CASE, CHAPTERS, SUSPECTS, FINALE };
});
