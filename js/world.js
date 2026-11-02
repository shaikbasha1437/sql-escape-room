/* The Midnight Archive: every table in the game, generated deterministically.
   Hand-placed "story" rows sit inside seeded background noise, so the data feels lived-in
   (NULLs, inconsistent casing, a duplicate name) while each puzzle still has exactly one fair answer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rng.js'));
  else (root.SER = root.SER || {}).world = factory(root.SER.rng);
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';
  const NIGHT = '2026-03-13';
  const pad = (n, w) => String(n).padStart(w || 2, '0');
  const at = (hms) => NIGHT + ' ' + (hms.length === 5 ? hms + ':00' : hms);
  const fromMin = (m, s) => at(pad(Math.floor(m / 60)) + ':' + pad(m % 60) + ':' + pad(s || 0));
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

  // ---------- staff ----------
  const STAFF_COLS = ['id', 'name', 'role', 'department', 'shift', 'clearance', 'badge_id', 'hired', 'ext'];
  const STAFF = [
    [1, 'Imogen Hale', 'Chief Archivist', 'Archives', 'day', 'vault', 'B-0101', '2009-09-01', 201],
    [2, 'Rowan Achterberg', 'Deputy Archivist', 'Archives', 'day', 'rare', 'B-0102', '2014-02-17', 202],
    [3, 'Lucia Ferreira', 'Conservator', 'Conservation', 'evening', 'rare', 'B-0233', '2017-06-05', null],
    [4, 'Wen Li', 'Conservator', 'Conservation', 'night', 'rare', 'B-0234', '2021-10-11', 233],
    [5, 'Margot Vell', 'Director of Donor Relations', 'Development', 'day', 'vault', 'B-0350', '2019-04-08', 310],
    [6, 'Hugo Brandt', 'Development Officer', 'Development', 'day', 'general', 'B-0351', '2023-01-09', 311],
    [7, 'Theo Marsh', 'Security Officer', 'Security', 'night', 'vault', 'B-0417', '2016-11-21', 400],
    [8, 'Nadia Okafor', 'Security Officer', 'Security', 'night', 'restricted', 'B-0418', '2022-03-14', 401],
    [9, 'Ezra Quill', 'Security Supervisor', 'security', 'day', 'restricted', 'B-0419', '2012-05-30', 402],
    [10, 'June Tamaki', 'Systems Librarian', 'IT', 'day', 'general', 'B-0520', '2018-08-20', 501],
    [11, 'Felix Ordway', 'IT Contractor', 'IT', 'night', 'restricted', 'B-0521', '2025-07-01', null],
    [12, 'Olive Barnes', 'Reference Librarian', 'Public Services', 'evening', 'general', 'B-0610', '2015-03-03', 610],
    [13, 'Marcus Dade', 'Reference Librarian', 'Public Services', 'day', 'general', 'B-0611', '2020-09-14', 611],
    [14, 'Sam Kettering', 'Custodian', 'Facilities', 'night', 'general', 'B-0712', '2011-01-10', null],
    [15, 'Bea Lindqvist', 'Facilities Manager', 'Facilities', 'day', 'restricted', 'B-0713', '2010-06-28', 713],
    [16, 'Arthur Penhaligon', 'Cataloguer', 'Archives', 'day', 'general', 'B-0103', '2008-04-14', 203],
    [17, 'Dalia Haddad', 'Cataloguer', 'archives', 'evening', 'general', 'B-0104', '2024-02-05', 204],
    [18, 'Kofi Mensah', 'Digitisation Technician', 'Digital', 'evening', 'general', 'B-0522', '2023-05-22', 522],
    [19, 'Ines Moreau', 'Digitisation Technician', 'Digital', 'day', 'general', 'B-0523', '2024-09-30', null],
    [20, 'Pavel Novak', 'Archivist', 'ARCHIVES', 'day', 'rare', 'B-0105', '2019-11-11', 205],
    [21, 'Grace Oyelaran', 'Visitor Services', 'Public Services', 'day', 'general', 'B-0612', '2022-07-18', 612],
    [22, 'Sam Kettering', 'Groundskeeper (retired)', 'Facilities', 'day', 'general', 'B-0714', '1998-03-02', null],
    [23, 'Lena Fischer', 'Conservator', 'Conservation', 'day', 'rare', 'B-0235', '2016-01-25', 235],
    [24, 'Tom Ashby', 'Porter', 'Facilities', 'evening', 'general', 'B-0715', '2021-04-12', 715]
  ];

  // ---------- chapter 1: doors with keypads ----------
  const PANEL_COLS = ['id', 'name', 'floor', 'lock_type', 'code', 'notes'];
  const PANELS = [
    [1, 'Main Entrance', 0, 'card', null, 'sealed by lockdown'],
    [2, 'Staff Entrance', 0, 'card', null, 'sealed by lockdown'],
    [3, 'Reading Room North', 1, 'keypad', '9903', 'jammed since Tuesday'],
    [4, 'Reading Room East', 1, 'keypad', '2741', null],
    [5, 'Reading Room West', 1, 'card', null, null],
    [6, 'Reading Room South', 1, 'keypad', '6618', 'decommissioned'],
    [7, 'Reading Room Annex', 2, 'keypad', '3350', null],
    [8, 'Catalogue Hall', 1, 'keypad', '1207', null],
    [9, 'Ledger Hall', 2, 'keypad', null, null],
    [10, 'Security Office', 0, 'card', null, null],
    [11, 'Server Closet', -1, 'card', null, 'IT only'],
    [12, 'Map Room', 2, 'keypad', null, null],
    [13, 'Clock Tower Stair', 3, 'keypad', null, null],
    [14, 'Vault', -1, 'card+keypad', null, 'two-factor'],
    [15, 'Donor Lounge', 1, 'card', null, null],
    [16, 'Loading Dock', 0, 'card', null, 'sealed by lockdown']
  ];

  // ---------- chapter 2: books ----------
  function books() {
    const r = RNG.make(2002);
    const cols = ['id', 'title', 'author', 'year', 'collection', 'shelf', 'status', 'last_checkout'];
    const adjectives = ['Hidden', 'Northern', 'Lesser', 'Forgotten', 'Illustrated', 'Complete', 'Early', 'Quiet', 'Ancient', 'Collected', 'Wandering', 'Silver'];
    const nouns = { Astronomy: ['Comets', 'Eclipses', 'Planets', 'Tides of Light', 'Star Tables', 'Meridians', 'Moons'], Botany: ['Ferns', 'Mosses', 'Herbals', 'Orchards', 'Fen Grasses'], 'Local History': ['Parishes', 'Mills', 'Bells', 'Floods', 'Market Charters'], Maps: ['Estates', 'Coastlines', 'Roads', 'Waterways'], General: ['Letters', 'Sermons', 'Essays', 'Almanacs', 'Recipes'], Rare: ['Psalms', 'Hours', 'Chronicles', 'Bestiaries', 'Herbals'] };
    const authors = ['A. Whitlock', 'E. Marchetti', 'R. Oduya', 'S. Pemberton', 'J. Lowell', 'T. Haverford', 'C. Ibarra', 'P. Lindgren', 'N. Achebe-Ross', 'L. Vaughan', 'K. Sato', 'D. Mireille', 'F. Brannock', 'G. Holm'];
    const statuses = ['on shelf', 'on shelf', 'on shelf', 'checked out', 'in repair'];
    const rows = []; const titles = new Set(); let id = 1;
    const astroYears = r.shuffle(Array.from({ length: 300 }, (_, i) => 1720 + i)).filter((y) => y <= 2025);
    const prefix = { Astronomy: 'AS', Botany: 'BO', 'Local History': 'LH', Maps: 'MP', General: 'GN', Rare: 'R' };
    const stamp = () => { // a past checkout before tonight, or never
      if (r.chance(0.22)) return null;
      const d = new Date(Date.UTC(2025, 9, 1) + r.int(0, 162) * 86400000);
      return d.toISOString().slice(0, 10) + ' ' + pad(r.int(9, 19)) + ':' + pad(r.int(0, 59)) + ':' + pad(r.int(0, 59));
    };
    const add = (title, author, year, coll, shelf, status, last) => { titles.add(title); rows.push([id++, title, author, year, coll, shelf, status, last]); };
    // story rows
    add('Hollowmere Charter (copy)', 'Unknown', 1188, 'Local History', 'LH-01', 'on shelf', null);
    add('Untitled Psalter fragment', null, null, 'Rare', 'R-02', 'on shelf', null);
    add('The Ashgrove Codex', 'Unknown (Ashgrove Priory)', 1291, 'Rare', 'R-13', 'missing', '2026-02-27 10:15:00');
    add('Ashgrove: A Priory and Its Stars', 'P. Raman', 2019, 'Local History', 'LH-44', 'checked out', at('22:41:07'));
    add('Night Skies of the Fen Country', 'H. Calloway', astroYears.pop(), 'Astronomy', 'AS-08', 'checked out', at('22:39:50'));
    add('Reading Medieval Star Tables', 'E. Marchetti', astroYears.pop(), 'Astronomy', 'AS-19', 'checked out', at('22:37:12'));
    add('The Care of Vellum', 'L. Fischer', 2011, 'General', 'GN-31', 'checked out', at('20:14:33'));
    add('Bells and Clockwork of Hollowmere', 'F. Brannock', 1934, 'Local History', 'LH-17', 'checked out', at('19:58:02'));
    add('Star Charts of the Fens', 'H. Calloway', 1802, 'Maps', 'MP-06', 'missing', '2025-11-03 14:22:10');
    add("Calloway's Night Sky Atlas", 'H. Calloway', astroYears.pop(), 'Astronomy', 'AS-02', 'missing', '2025-12-19 11:05:44');
    add('The Lost Bells of Ashgrove', 'M. Ostrander', 1961, 'Local History', 'LH-29', 'missing', null);
    add('Undated star wheel', 'Unknown', null, 'Astronomy', 'AS-40', 'in repair', null);
    // background
    const colls = ['Astronomy', 'Botany', 'Local History', 'Maps', 'General', 'Rare'];
    let guard = 0;
    while (rows.length < 140 && guard++ < 5000) {
      const coll = r.pick(colls);
      const title = 'The ' + r.pick(adjectives) + ' ' + r.pick(nouns[coll]) + (r.chance(0.4) ? ' of ' + r.pick(['Hollowmere', 'the Fens', 'Ashby Vale', 'Norwick', 'the Marsh']) : '');
      if (titles.has(title)) continue;
      let year; let c = coll;
      if (coll === 'Rare') { year = r.int(1402, 1790); if (r.chance(0.3)) { c = 'rare'; year = r.int(1650, 1800); } }
      else if (coll === 'Astronomy') year = astroYears.pop();
      else year = r.int(1750, 2024);
      const shelf = prefix[coll] + '-' + pad(r.int(1, 60));
      add(title, r.pick(authors), year, c, shelf, r.pick(statuses), stamp());
    }
    return { cols, rows };
  }

  // ---------- chapter 3: checkouts + donations ----------
  function checkouts() {
    const r = RNG.make(3003);
    const cols = ['id', 'book_id', 'borrower', 'out_at', 'returned_at', 'fine', 'paid'];
    const people = ['Olive Barnes', 'Marcus Dade', 'Hugo Brandt', 'Ines Moreau', 'Lena Fischer', 'Arthur Penhaligon', 'Grace Oyelaran', 'Adaeze Nwosu', 'Callum Reid', 'Hana Kowalski', 'Jonah Pryce', 'Mira Castell', 'Oskar Lund', 'Ruth Ellery', 'Tobias Grant', 'Yusuf Demir', 'Zara Whitcombe', 'Lucia Ferreira', 'Wen Li', 'Dalia Haddad'];
    const variants = (n) => r.pick([n, n, n.toLowerCase(), n.toUpperCase()]);
    const rows = []; let id = 1;
    const day = (d0, span) => { const d = new Date(Date.UTC(2025, 8, 1) + r.int(d0, d0 + span) * 86400000); return d.toISOString().slice(0, 10); };
    const fine = () => (r.chance(0.45) ? r.int(2, 30) : null);
    const push = (borrower, returned) => {
      const outDay = r.int(0, 180); const out = day(outDay, 0) + ' ' + pad(r.int(9, 18)) + ':' + pad(r.int(0, 59)) + ':00';
      const ret = returned ? day(outDay + 3, 20) + ' ' + pad(r.int(9, 18)) + ':' + pad(r.int(0, 59)) + ':00' : null;
      const f = fine();
      rows.push([id++, r.int(1, 140), borrower, out, ret, f, f == null ? 0 : (r.chance(0.5) ? 1 : 0)]);
    };
    const unreturned = {};
    for (let i = 0; i < 200; i++) {
      const p = r.pick(people);
      let ret = r.chance(0.9);
      if (!ret && (unreturned[p] || 0) >= 2) ret = true;
      if (!ret) unreturned[p] = (unreturned[p] || 0) + 1;
      push(variants(p), ret);
    }
    ['Priya Raman', 'Priya Raman', 'priya raman', 'priya raman', 'PRIYA RAMAN'].forEach((b) => push(b, false));
    ['Priya Raman', 'priya raman'].forEach((b) => push(b, true));
    ['Sam Kettering', 'Sam Kettering', 'Sam Kettering', 'sam kettering'].forEach((b) => push(b, false));
    push('Sam Kettering', true);
    // shuffle ids so story rows don't sit at the end
    const shuffled = r.shuffle(rows).map((row, i) => [i + 1].concat(row.slice(1)));
    return { cols, rows: shuffled.sort((a, b) => (a[3] < b[3] ? -1 : 1)).map((row, i) => [i + 1].concat(row.slice(1))) };
  }
  function donations() {
    const r = RNG.make(3103);
    const cols = ['id', 'donor', 'amount', 'received', 'earmark', 'handled_by'];
    const donors = ['Fenwick Family', 'Marsh Valley Rotary', 'Dr. A. Kemble', 'The Hollis Foundation', 'Ashby Vale Council', 'Anonymous', 'Pemberton & Daughters', 'Norwick Historical Society', 'Ellery Bequest', 'The Corran Fund'];
    const marks = ['General', 'Conservation', 'Digitisation', 'Roof Appeal', 'Codex Fund'];
    const officers = ['H. Brandt', 'M. Vell', 'I. Hale'];
    const rows = [];
    const date = () => new Date(Date.UTC(2025, 3, 1) + r.int(0, 340) * 86400000).toISOString().slice(0, 10);
    const codexTotals = {};
    for (let i = 0; i < 56; i++) {
      const d = r.pick(donors); const m = r.pick(marks);
      let amt = r.int(1, 60) * 250;
      if (m === 'Codex Fund') { if (d === 'Fenwick Family') continue; amt = Math.min(amt, 9000); if ((codexTotals[d] || 0) + amt > 60000) continue; codexTotals[d] = (codexTotals[d] || 0) + amt; }
      rows.push([0, d, amt, date(), m, r.pick(officers)]);
    }
    rows.push([0, 'Aurelian Trust', 60000, '2025-11-14', 'Codex Fund', 'M. Vell']);
    rows.push([0, 'Fenwick Family', 150000, '2025-12-02', 'Codex Fund', 'I. Hale']);
    rows.push([0, 'Aurelian Trust', 75000, '2026-01-20', 'Codex Fund', 'M. Vell']);
    rows.push([0, 'Aurelian Trust', 45000, '2026-03-02', 'Codex Fund', 'M. Vell']);
    rows.push([0, 'Aurelian Trust', null, '2026-03-12', 'Codex Fund', 'M. Vell']); // pledge recorded, amount pending
    rows.sort((a, b) => (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0));
    return { cols, rows: rows.map((row, i) => [i + 1].concat(row.slice(1))) };
  }

  // ---------- building geometry (doors + walking times) ----------
  const DOORS = [ // name, zone, x, y (metres on a flattened floor plan), keypad code
    ['Main Entrance', 'public', 0, 0, '1100'], ['Staff Entrance', 'staff', 60, 0, '4410'], ['Lobby Desk', 'public', 10, 10, '0000'],
    ['Reading Room East', 'public', 40, 30, '2741'], ['Catalogue Hall', 'public', 30, 50, '1207'], ['Ledger Hall', 'staff', 60, 60, '3916'],
    ['Security Office', 'staff', 20, 5, '7072'], ['Server Closet', 'restricted', 80, 20, '5521'], ['Map Room', 'staff', 50, 90, '6644'],
    ['Clock Tower Stair', 'staff', 90, 110, '2208'], ['Vault Corridor', 'restricted', 120, 40, '9180'], ['Vault', 'vault', 124, 44, '----'],
    ['Donor Lounge', 'staff', 100, 10, '3303'], ['Service Lift', 'staff', 110, 25, '1515'], ['Loading Dock', 'staff', 140, 0, '6060'],
    ['Conservation Lab', 'restricted', 70, 80, '4747'], ['Archive Stacks', 'restricted', 100, 70, '8352'], ['Break Room', 'staff', 75, 35, '1313']
  ];
  function walkSeconds(a, b) {
    const A = DOORS.find((d) => d[0] === a); const B = DOORS.find((d) => d[0] === b);
    return Math.round((Math.abs(A[2] - B[2]) + Math.abs(A[3] - B[3])) * 1.6 + 20);
  }
  function walkTimes() {
    const rows = [];
    for (const a of DOORS) for (const b of DOORS) if (a !== b) rows.push([a[0], b[0], a[0] === 'Vault Corridor' && b[0] === 'Vault' || a[0] === 'Vault' && b[0] === 'Vault Corridor' ? 4 : walkSeconds(a[0], b[0])]);
    return { cols: ['from_door', 'to_door', 'seconds'], rows };
  }

  // ---------- badges + swipes ----------
  function badges() {
    const rows = STAFF.map((s) => [s[6], s[0], s[0] === 22 ? 'revoked' : 'active', s[7]]);
    rows.push(['B-0599', 11, 'revoked', '2025-07-01']); // Felix's first badge, replaced after a printer fault
    rows.push(['B-0716', 24, 'lost', '2021-04-12']);
    rows.push(['B-0800', null, 'spare', '2024-01-15']);
    rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return { cols: ['badge_id', 'holder_id', 'status', 'issued'], rows };
  }
  function swipes() {
    const r = RNG.make(4004);
    const ev = [];
    const S = (badge, door, hms, result) => ev.push([badge, door, at(hms), result || 'granted']);
    // story swipes
    S('B-0101', 'Staff Entrance', '21:10:12');
    S('B-0418', 'Vault Corridor', '22:05:40');
    S('B-0417', 'Vault Corridor', '22:30:02');
    S('B-0418', 'Security Office', '22:40:15'); S('B-0417', 'Security Office', '22:52:30');
    S('B-0350', 'Staff Entrance', '22:58:44');
    S('B-0350', 'Donor Lounge', '23:01:09');
    S('B-0913', 'Service Lift', '23:31:27');
    S('B-0350', 'Donor Lounge', '23:33:50');
    S('B-0417', 'Lobby Desk', '23:48:30');
    S('B-0417', 'Vault Corridor', '23:49:05');
    S('B-0417', 'Vault', '23:49:10');
    S('B-0714', 'Loading Dock', '23:52:18', 'denied');
    S('B-0418', 'Map Room', '23:30:11'); S('B-0521', 'Server Closet', '21:50:03'); S('B-0521', 'Break Room', '22:40:20'); S('B-0521', 'Server Closet', '22:50:41');
    S('B-0712', 'Donor Lounge', '23:15:36'); S('B-0712', 'Map Room', '23:21:02');
    S('B-0234', 'Conservation Lab', '21:30:00'); S('B-0234', 'Map Room', '23:38:16');
    // the Archive Stacks reader rejects old-format badges all evening
    [['B-0104', '18:07:31'], ['B-0522', '19:44:02'], ['B-0233', '20:12:55'], ['B-0104', '21:51:40'], ['B-0715', '20:59:13'], ['B-0712', '23:05:58']].forEach(([b, t]) => S(b, 'Archive Stacks', t, 'denied'));
    const story = {}; ev.forEach((e) => { const m = toMin(e[2].slice(11, 16)); (story[e[0]] = story[e[0]] || []).push(m); });
    // background: evening crowd and a quiet night, >= 12 minutes between one badge's swipes
    const doorsNoise = ['Main Entrance', 'Staff Entrance', 'Lobby Desk', 'Reading Room East', 'Catalogue Hall', 'Ledger Hall', 'Security Office', 'Map Room', 'Conservation Lab', 'Break Room', 'Clock Tower Stair'];
    const plan = [['B-0233', 18 * 60, 22 * 60], ['B-0610', 18 * 60, 21 * 60 + 30], ['B-0104', 18 * 60 + 20, 22 * 60], ['B-0522', 18 * 60, 22 * 60], ['B-0715', 18 * 60 + 30, 22 * 60 + 15],
      ['B-0417', 18 * 60, 22 * 60 + 10], ['B-0418', 18 * 60, 21 * 60 + 50], ['B-0712', 18 * 60, 23 * 60], ['B-0234', 18 * 60, 21 * 60 + 15], ['B-0521', 18 * 60 + 10, 21 * 60 + 35], ['B-0101', 18 * 60, 20 * 60 + 55], ['B-0611', 18 * 60, 18 * 60 + 40], ['B-0102', 18 * 60, 19 * 60]];
    for (const [badge, start, end] of plan) {
      let m = start + r.int(0, 10);
      while (m < end) {
        const door = r.pick(doorsNoise);
        if ((story[badge] || []).some((x) => Math.abs(x - m) < 9)) { m += r.int(12, 40); continue; }
        S(badge, door, pad(Math.floor(m / 60)) + ':' + pad(m % 60) + ':' + pad(r.int(0, 59)), r.chance(0.1) ? 'denied' : 'granted');
        m += r.int(12, 40);
      }
    }
    ev.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    return { cols: ['id', 'badge_id', 'door', 'ts', 'result'], rows: ev.map((e, i) => [i + 1].concat(e)) };
  }

  // ---------- chapter 5: accounts, logins, commands, terminals ----------
  const TERMINALS = [['T-01', 'Server Closet', '4471'], ['T-02', 'Reading Room', '0328'], ['T-03', 'Catalogue Hall', '7715'], ['T-04', 'Security Office', '2290'],
    ['T-05', 'Ledger Hall', '8034'], ['T-06', 'Map Room', '5162'], ['T-07', 'Donor Lounge', '3847'], ['T-08', 'Conservation Lab', '9256'], ['T-09', 'Loading Dock', '6190']];
  const ACCOUNTS = [['ihale', 1, '2009-09-01'], ['rachterberg', 2, '2014-02-17'], ['lferreira', 3, '2017-06-05'], ['wli', 4, '2021-10-11'], ['mvell', 5, '2019-04-08'], ['tmarsh', 7, '2016-11-21'], ['nokafor', 8, '2022-03-14'],
    ['equill', 9, '2012-05-30'], ['jtamaki', 10, '2018-08-20'], ['fordway', 11, '2025-07-01'], ['obarnes', 12, '2015-03-03'], ['dhaddad', 17, '2024-02-05'], ['kmensah', 18, '2023-05-22'], ['svc_backup', null, '2020-01-01']];
  function logins() {
    const r = RNG.make(5005);
    const ev = [];
    const L = (u, term, hms, ok) => ev.push([u, term, at(hms), ok ? 1 : 0]);
    const usual = { ihale: 'T-05', lferreira: 'T-08', wli: 'T-08', tmarsh: 'T-04', nokafor: 'T-04', obarnes: 'T-02', dhaddad: 'T-03', kmensah: 'T-06', fordway: 'T-01', svc_backup: 'T-01' };
    const evening = [['ihale', 18 * 60, 21 * 60], ['lferreira', 18 * 60, 22 * 60], ['wli', 18 * 60, 23 * 60 + 30], ['tmarsh', 18 * 60, 23 * 60 + 40], ['nokafor', 18 * 60, 23 * 60 + 20], ['obarnes', 18 * 60, 21 * 60 + 20], ['dhaddad', 18 * 60, 21 * 60 + 50], ['kmensah', 18 * 60, 21 * 60 + 50]];
    const fails = { ihale: 1, lferreira: 2, tmarsh: 1, nokafor: 3, dhaddad: 2, kmensah: 1 };
    for (const [u, s, e] of evening) {
      let m = s + r.int(0, 20); let f = fails[u] || 0;
      while (m < e) {
        const term = r.chance(0.8) ? usual[u] : r.pick(['T-02', 'T-03', 'T-05', 'T-06', 'T-08']);
        if (f > 0 && r.chance(0.5)) { L(u, term, pad(Math.floor(m / 60)) + ':' + pad(m % 60) + ':' + pad(r.int(0, 29)), false); f--; }
        L(u, term, pad(Math.floor(m / 60)) + ':' + pad(m % 60) + ':' + pad(r.int(30, 59)), true);
        m += r.int(25, 70);
      }
    }
    // story logins
    L('jtamaki', null, '20:15:09', true); // VPN session from home: no terminal recorded
    L('fordway', 'T-01', '21:52:40', true); L('fordway', 'T-01', '22:51:12', true); L('svc_backup', 'T-01', '23:00:00', true);
    L('tashby', 'T-09', '21:58:02', false); L('tashby', 'T-09', '21:58:30', false);
    for (let i = 0; i < 17; i++) { const sec = 23 * 3600 + 12 * 60 + i * 57 + r.int(0, 20); L('fordway', 'T-07', pad(Math.floor(sec / 3600)) + ':' + pad(Math.floor(sec / 60) % 60) + ':' + pad(sec % 60), false); }
    L('fordway', 'T-07', '23:29:03', true);
    ev.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    return { cols: ['id', 'username', 'terminal', 'ts', 'success'], rows: ev.map((e, i) => [i + 1].concat(e)) };
  }
  function commands(loginRows) {
    const r = RNG.make(5105);
    const cmds = ['OPEN REPORT daily_visits', 'PRINT label_sheet', 'SEARCH catalogue', 'EXPORT checkouts.csv', 'CHECK humidity', 'VIEW camera_feed', 'RESET printer', 'SYNC catalogue', 'BACKUP nightly', 'OPEN ticket'];
    const rows = [];
    for (const l of loginRows) {
      if (!l[4]) continue;
      if (l[1] === 'fordway' && l[2] === 'T-07') {
        rows.push([l[0], 'VIEW door_schedule', at('23:35:20')]);
        rows.push([l[0], 'SET circuit VAULT-MAG maintenance --at 23:46', at('23:41:57')]);
        rows.push([l[0], 'LOCKDOWN --all --at 23:47', at('23:44:02')]);
        rows.push([l[0], 'LOGOUT', at('23:44:30')]);
        continue;
      }
      const n = r.int(0, 2);
      const base = l[3];
      for (let i = 0; i < n; i++) { const t = new Date(base.replace(' ', 'T') + 'Z'); t.setUTCMinutes(t.getUTCMinutes() + 1 + i * 3); rows.push([l[0], l[1] === 'svc_backup' ? 'BACKUP nightly' : r.pick(cmds), t.toISOString().slice(0, 19).replace('T', ' ')]); }
    }
    rows.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    return { cols: ['id', 'login_id', 'command', 'ts'], rows: rows.map((e, i) => [i + 1].concat(e)) };
  }

  // ---------- chapters 6-7: lanyard tags and room entries ----------
  const PEOPLE = [[1, 'Imogen Hale', 'staff'], [2, 'Lucia Ferreira', 'staff'], [3, 'Wen Li', 'staff'], [4, 'Margot Vell', 'staff'], [5, 'Theo Marsh', 'staff'], [6, 'Nadia Okafor', 'staff'],
    [7, 'Felix Ordway', 'staff'], [8, 'Olive Barnes', 'staff'], [9, 'Sam Kettering', 'staff'], [10, 'Dalia Haddad', 'staff'], [11, 'Kofi Mensah', 'staff'], [12, 'Tom Ashby', 'staff'],
    [13, 'Priya Raman', 'visitor'], [14, 'Guest G-17', 'visitor']];
  const TAGS = [['LY-201', 1], ['LY-233', 2], ['LY-234', 3], ['LY-350', 4], ['LY-417', 5], ['LY-418', 6], ['LY-521', 7], ['LY-610', 8], ['LY-712', 9], ['LY-104', 10], ['LY-522', 11], ['LY-715', 12], ['VS-031', 13], ['VS-017', 14], ['LY-999', null]];
  const ROOMS = [['Lobby', 0, '1842'], ['Reading Room', 1, '2741'], ['Catalogue Hall', 1, '1207'], ['Ledger Hall', 2, '3916'], ['Security Office', 0, '7072'], ['Server Closet', -1, '5521'],
    ['Map Room', 2, '6644'], ['Clock Tower', 3, '2208'], ['Vault', -1, null], ['Donor Lounge', 1, '3303'], ['Service Lift', 0, '1515'], ['Loading Dock', 0, '6060'], ['Conservation Lab', 2, '4747'],
    ['Break Room', 1, '1313'], ['Staff Entrance', 0, '4410'], ['Main Entrance', 0, '1100']];
  function pings() {
    const ev = [];
    const P = (tag, room, hms) => ev.push([tag, room, at(hms)]);
    const seq = (tag, list) => list.forEach(([hms, room]) => P(tag, room, hms));
    seq('LY-201', [['18:02:10', 'Ledger Hall'], ['19:40:31', 'Catalogue Hall'], ['20:05:12', 'Ledger Hall'], ['21:09:40', 'Staff Entrance']]);
    seq('LY-233', [['18:01:05', 'Conservation Lab'], ['20:12:50', 'Break Room'], ['20:31:22', 'Conservation Lab'], ['21:58:44', 'Staff Entrance']]);
    seq('LY-234', [['18:05:00', 'Conservation Lab'], ['21:14:10', 'Break Room'], ['21:29:47', 'Conservation Lab'], ['23:38:10', 'Map Room'], ['23:55:30', 'Conservation Lab']]);
    seq('LY-350', [['22:58:40', 'Staff Entrance'], ['23:01:05', 'Donor Lounge'], ['23:30:02', 'Service Lift'], ['23:33:46', 'Donor Lounge'], ['23:49:01', 'Vault'], ['23:52:12', 'Loading Dock'], ['23:55:48', 'Donor Lounge']]);
    seq('LY-417', [['18:00:30', 'Security Office'], ['19:15:12', 'Lobby'], ['20:40:05', 'Security Office'], ['22:29:55', 'Vault'], ['22:52:20', 'Security Office'], ['23:40:09', 'Lobby']]);
    seq('LY-418', [['18:00:40', 'Security Office'], ['19:50:30', 'Reading Room'], ['22:05:31', 'Vault'], ['22:40:05', 'Security Office'], ['23:30:00', 'Map Room']]);
    seq('LY-521', [['18:10:22', 'Server Closet'], ['21:49:58', 'Server Closet'], ['22:40:12', 'Break Room'], ['22:50:33', 'Server Closet']]);
    seq('LY-610', [['18:00:10', 'Reading Room'], ['19:30:45', 'Catalogue Hall'], ['20:02:19', 'Reading Room'], ['21:29:00', 'Main Entrance']]);
    seq('LY-712', [['18:30:00', 'Lobby'], ['20:10:15', 'Reading Room'], ['21:40:00', 'Catalogue Hall'], ['22:20:30', 'Ledger Hall'], ['23:15:31', 'Donor Lounge'], ['23:20:56', 'Map Room']]);
    seq('LY-104', [['18:20:00', 'Catalogue Hall'], ['20:44:30', 'Break Room'], ['20:58:12', 'Catalogue Hall'], ['21:59:20', 'Main Entrance']]);
    seq('LY-522', [['18:00:55', 'Map Room'], ['19:43:58', 'Catalogue Hall'], ['20:10:40', 'Map Room'], ['21:59:59', 'Loading Dock']]);
    seq('LY-715', [['18:31:15', 'Loading Dock'], ['20:01:02', 'Lobby'], ['20:58:45', 'Loading Dock'], ['22:14:30', 'Loading Dock']]);
    seq('VS-031', [['19:02:00', 'Main Entrance'], ['19:04:30', 'Reading Room'], ['22:36:40', 'Catalogue Hall'], ['22:43:15', 'Reading Room'], ['23:05:20', 'Donor Lounge'], ['23:09:41', 'Reading Room']]);
    seq('VS-017', [['17:45:12', 'Main Entrance'], ['17:47:03', 'Reading Room']]);
    seq('LY-999', [['20:15:00', 'Lobby'], ['21:15:00', 'Lobby']]); // an unassigned test tag the security team leaves on the desk
    ev.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    return { cols: ['id', 'tag', 'room', 'ts'], rows: ev.map((e, i) => [i + 1].concat(e)) };
  }

  // ---------- chapter 7: power log ----------
  function powerLog() {
    const r = RNG.make(7007);
    const rows = [];
    for (let m = toMin('23:30'); m <= toMin('23:59'); m++) {
      const ts = fromMin(m);
      const off = m >= toMin('23:47');
      rows.push([ts, 'MAIN', off ? 0 : r.round(38 + r.next() * 4, 1)]);
      rows.push([ts, 'VAULT-MAG', m >= toMin('23:46') ? 0.3 : r.round(4.6 + r.next() * 0.4, 1)]);
      rows.push([ts, 'BACKUP', off ? r.round(6 + r.next() * 3, 1) : 0]);
      rows.push([ts, 'HVAC', off ? 0 : r.round(11 + r.next() * 2, 1)]);
    }
    return { cols: ['ts', 'circuit', 'kw'], rows };
  }

  // ---------- chapter 8: encoders + courier manifest ----------
  function encoderLog() {
    const r = RNG.make(8008);
    const rows = [];
    for (const s of STAFF) if (s[0] !== 22) rows.push([s[7] + ' ' + pad(r.int(9, 16)) + ':' + pad(r.int(0, 59)) + ':00', 'ENC-1', s[6], r.pick(['Issued to new staff', 'issued', 'New starter badge', 'issue'])]);
    rows.push(['1998-03-02 10:00:00', 'ENC-1', 'B-0714', 'issued (paper record migrated)']);
    for (let i = 0; i < 6; i++) rows.push(['2026-0' + r.int(1, 2) + '-' + pad(r.int(10, 28)) + ' ' + pad(r.int(17, 20)) + ':' + pad(r.int(0, 59)) + ':00', 'ENC-2', 'EV-' + r.int(100, 999), r.pick(['donor gala pass', 'Gala guest', 'event pass']) ]);
    for (let i = 0; i < 5; i++) rows.push(['2026-03-' + pad(r.int(2, 12)) + ' ' + pad(r.int(10, 16)) + ':' + pad(r.int(0, 59)) + ':00', 'ENC-3', 'VS-0' + pad(r.int(10, 99)), 'visitor pass']);
    rows.push(['2026-03-13 17:44:50', 'ENC-3', 'VS-017', 'visitor pass (guest reader)']);
    rows.push(['2026-03-13 23:18:36', 'ENC-2', 'b-0417 ', 'Copy?? (replacement for T. Marsh)']);
    rows.push(['2026-03-13 23:22:09', 'ENC-2', 'B-0913', 'blank test']);
    rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return { cols: ['id', 'ts', 'station', 'badge_written', 'note'], rows: rows.map((e, i) => [i + 1].concat(e)) };
  }
  const STATIONS = [['ENC-1', 'Security Office'], ['ENC-2', 'Donor Lounge'], ['ENC-3', 'Visitor Desk']];
  function manifest() {
    const r = RNG.make(8108);
    const word = 'LANTERN';
    const others = ['Norwick Historical Society', 'Fenwick Family', 'Bindery Supplies Ltd', 'Ashby Vale Council', 'The Hollis Foundation'];
    const consigneeVariants = ['Aurelian Trust', 'aurelian trust', 'AURELIAN TRUST', 'Aurelian Trust ', 'Aurelian  Trust'.replace('  ', ' ')];
    const contents = ['Donor gift: framed print', 'Gala programme boxes', 'Archival tissue', 'Returned loan: maps', 'Bookbinding supplies', 'Commemorative plates', 'Display case parts'];
    const letters = 'BCDFGHJKMPQSVWXYZ';
    const rows = []; let w = 0;
    const isAT = r.shuffle([true, true, true, true, true, true, true, false, false, false, false, false, false, false, false]);
    isAT.forEach((at_, i) => {
      const crate = 'CR-' + pad(10 + i * 3);
      const letter = at_ ? word[w++] : r.pick(letters.split(''));
      const ref = pad(r.int(10, 99)) + '-' + letter + '-' + r.int(1000, 9999);
      const kg = at_ && w === 4 ? 9.4 : r.round(1 + r.next() * 15, 1);
      const what = r.pick(contents);
      rows.push([crate, at_ ? consigneeVariants[w % consigneeVariants.length] : r.pick(others), ref, at_ && w === 4 ? 'Gala programme boxes' : what, kg]);
    });
    return { cols: ['crate', 'consignee', 'ref', 'contents', 'weight_kg'], rows };
  }

  // ---------- table catalogue ----------
  const cache = {};
  const memo = (k, f) => cache[k] || (cache[k] = f());
  const TABLES = {
    staff: { ddl: 'CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, role TEXT, department TEXT, shift TEXT, clearance TEXT, badge_id TEXT, hired TEXT, ext INTEGER)', data: () => ({ cols: STAFF_COLS, rows: STAFF }) },
    staff_lite: { name: 'staff', ddl: 'CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, role TEXT, department TEXT, shift TEXT)', data: () => ({ cols: ['id', 'name', 'role', 'department', 'shift'], rows: STAFF.map((s) => s.slice(0, 5)) }) },
    doors_panel: { name: 'doors', ddl: 'CREATE TABLE doors (id INTEGER PRIMARY KEY, name TEXT, floor INTEGER, lock_type TEXT, code TEXT, notes TEXT)', data: () => ({ cols: PANEL_COLS, rows: PANELS }) },
    books: { ddl: 'CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author TEXT, year INTEGER, collection TEXT, shelf TEXT, status TEXT, last_checkout TEXT)', data: () => memo('books', books) },
    checkouts: { ddl: 'CREATE TABLE checkouts (id INTEGER PRIMARY KEY, book_id INTEGER, borrower TEXT, out_at TEXT, returned_at TEXT, fine INTEGER, paid INTEGER)', data: () => memo('checkouts', checkouts) },
    donations: { ddl: 'CREATE TABLE donations (id INTEGER PRIMARY KEY, donor TEXT, amount INTEGER, received TEXT, earmark TEXT, handled_by TEXT)', data: () => memo('donations', donations) },
    badges: { ddl: 'CREATE TABLE badges (badge_id TEXT PRIMARY KEY, holder_id INTEGER, status TEXT, issued TEXT)', data: () => memo('badges', badges) },
    swipes: { ddl: 'CREATE TABLE swipes (id INTEGER PRIMARY KEY, badge_id TEXT, door TEXT, ts TEXT, result TEXT)', data: () => memo('swipes', swipes) },
    doors_zone: { name: 'doors', ddl: 'CREATE TABLE doors (name TEXT PRIMARY KEY, zone TEXT, code TEXT)', data: () => ({ cols: ['name', 'zone', 'code'], rows: DOORS.map((d) => [d[0], d[1], d[4]]) }) },
    doors_plain: { name: 'doors', ddl: 'CREATE TABLE doors (name TEXT PRIMARY KEY, zone TEXT)', data: () => ({ cols: ['name', 'zone'], rows: DOORS.map((d) => [d[0], d[1]]) }) },
    walk_times: { ddl: 'CREATE TABLE walk_times (from_door TEXT, to_door TEXT, seconds INTEGER)', data: () => memo('walk', walkTimes) },
    accounts: { ddl: 'CREATE TABLE accounts (username TEXT PRIMARY KEY, staff_id INTEGER, created TEXT)', data: () => ({ cols: ['username', 'staff_id', 'created'], rows: ACCOUNTS }) },
    logins: { ddl: 'CREATE TABLE logins (id INTEGER PRIMARY KEY, username TEXT, terminal TEXT, ts TEXT, success INTEGER)', data: () => memo('logins', logins) },
    commands: { ddl: 'CREATE TABLE commands (id INTEGER PRIMARY KEY, login_id INTEGER, command TEXT, ts TEXT)', data: () => memo('commands', () => commands(memo('logins', logins).rows)) },
    terminals: { ddl: 'CREATE TABLE terminals (id TEXT PRIMARY KEY, location TEXT, pin TEXT)', data: () => ({ cols: ['id', 'location', 'pin'], rows: TERMINALS }) },
    people: { ddl: 'CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT, kind TEXT)', data: () => ({ cols: ['id', 'name', 'kind'], rows: PEOPLE }) },
    tags: { ddl: 'CREATE TABLE tags (tag TEXT PRIMARY KEY, person_id INTEGER)', data: () => ({ cols: ['tag', 'person_id'], rows: TAGS }) },
    pings: { ddl: 'CREATE TABLE pings (id INTEGER PRIMARY KEY, tag TEXT, room TEXT, ts TEXT)', data: () => memo('pings', pings) },
    rooms: { ddl: 'CREATE TABLE rooms (name TEXT PRIMARY KEY, floor INTEGER, door_code TEXT)', data: () => ({ cols: ['name', 'floor', 'door_code'], rows: ROOMS }) },
    power_log: { ddl: 'CREATE TABLE power_log (ts TEXT, circuit TEXT, kw REAL)', data: () => memo('power', powerLog) },
    encoder_log: { ddl: 'CREATE TABLE encoder_log (id INTEGER PRIMARY KEY, ts TEXT, station TEXT, badge_written TEXT, note TEXT)', data: () => memo('enc', encoderLog) },
    stations: { ddl: 'CREATE TABLE stations (station TEXT PRIMARY KEY, location TEXT)', data: () => ({ cols: ['station', 'location'], rows: STATIONS }) },
    manifest: { ddl: 'CREATE TABLE manifest (crate TEXT PRIMARY KEY, consignee TEXT, ref TEXT, contents TEXT, weight_kg REAL)', data: () => memo('manifest', manifest) }
  };
  const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
  // SQL script that builds a chapter's database from scratch.
  function script(tableKeys) {
    const out = [];
    for (const key of tableKeys) {
      const t = TABLES[key]; if (!t) throw new Error('unknown table ' + key);
      const name = t.name || key; const d = t.data();
      out.push(t.ddl + ';');
      for (let i = 0; i < d.rows.length; i += 200) out.push('INSERT INTO ' + name + ' (' + d.cols.join(', ') + ') VALUES\n' + d.rows.slice(i, i + 200).map((r) => '(' + r.map(lit).join(', ') + ')').join(',\n') + ';');
    }
    return out.join('\n');
  }
  return { NIGHT, TABLES, script, walkSeconds, lit };
});
