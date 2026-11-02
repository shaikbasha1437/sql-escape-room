/* Save game: per-slot state, stars, achievements, notebook, export/import. Pure functions, so the
   tests can drive it with a fake storage object. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.SER = root.SER || {}).progress = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SLOTS = 3;
  const KEY = (n) => 'ser.slot.' + n;
  const ACTIVE = 'ser.active';
  const now = () => Date.now();
  function fresh() {
    return { v: 1, created: now(), updated: now(), current: 0, chapters: {}, notebook: [], achievements: {}, accusations: [], solved: false, stats: { queries: 0, errors: 0, errStreak: 0 }, seenPrologue: false };
  }
  function ch(state, id) {
    if (!state.chapters[id]) state.chapters[id] = { solved: {}, hints: {}, revealed: {}, timeMs: 0, done: false, stars: 0, history: [], seenIntro: false };
    return state.chapters[id];
  }
  const unlocked = (state, chapters, i) => i === 0 || !!(state.chapters[chapters[i - 1].id] && state.chapters[chapters[i - 1].id].done);
  const active = (chapter, cs) => chapter.puzzles.find((p) => !cs.solved[p.id]) || null;
  const hintsUsed = (cs) => Object.values(cs.hints).reduce((a, b) => a + b, 0);
  function stars(chapter, cs) {
    if (Object.keys(cs.revealed).length) return 1;
    let s = 3;
    if (hintsUsed(cs) > 1) s--;
    if (cs.timeMs > chapter.par * 1000) s--;
    return Math.max(1, s);
  }
  function solve(state, chapter, puzzleId) {
    const cs = ch(state, chapter.id);
    cs.solved[puzzleId] = cs.solved[puzzleId] || now();
    const p = chapter.puzzles.find((x) => x.id === puzzleId);
    if (p && p.clue && !state.notebook.some((n) => n.source === chapter.id + '/' + puzzleId)) state.notebook.push({ id: 'n' + now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'clue', text: p.clue, chapter: chapter.id, source: chapter.id + '/' + puzzleId, ts: now() });
    const finished = chapter.puzzles.every((x) => cs.solved[x.id]);
    if (finished && !cs.done) { cs.done = true; cs.stars = stars(chapter, cs); cs.finishedAt = now(); }
    state.updated = now();
    return { finished };
  }
  function hint(state, chapterId, puzzleId) {
    const cs = ch(state, chapterId);
    cs.hints[puzzleId] = Math.min(3, (cs.hints[puzzleId] || 0) + 1);
    return cs.hints[puzzleId];
  }
  function reveal(state, chapterId, puzzleId) { ch(state, chapterId).revealed[puzzleId] = true; }
  function pushHistory(state, chapterId, sql, ok) {
    const cs = ch(state, chapterId); const q = String(sql).trim();
    if (!q) return;
    if (cs.history.length && cs.history[0].sql === q) { cs.history[0].ts = now(); cs.history[0].ok = ok; return; }
    cs.history.unshift({ sql: q, ts: now(), ok: !!ok });
    if (cs.history.length > 50) cs.history.length = 50;
  }
  function resetChapter(state, chapterId) {
    const before = JSON.parse(JSON.stringify(state));
    delete state.chapters[chapterId];
    state.notebook = state.notebook.filter((n) => !(n.kind === 'clue' && n.chapter === chapterId));
    return before; // for undo
  }
  // ---------- achievements ----------
  const ACHIEVEMENTS = [
    { id: 'first-query', icon: '\u2728', name: 'First Light', desc: 'Run your first query.' },
    { id: 'first-door', icon: '\ud83d\udeaa', name: 'Out of the Reading Room', desc: 'Escape the first room.' },
    { id: 'unassisted', icon: '\ud83e\udde0', name: 'Unassisted', desc: 'Finish a room without any hints.' },
    { id: 'speed', icon: '\u23f1\ufe0f', name: 'Against the Clock', desc: 'Finish a room under its par time.' },
    { id: 'joiner', icon: '\ud83d\udd17', name: 'Matchmaker', desc: 'Run a query with a JOIN.' },
    { id: 'cte', icon: '\ud83e\ude9c', name: 'Step by Step', desc: 'Run a query that starts WITH a CTE.' },
    { id: 'window', icon: '\ud83e\ude9f', name: 'Through the Window', desc: 'Use a window function (OVER).' },
    { id: 'whisperer', icon: '\ud83e\ude84', name: 'Error Whisperer', desc: 'Get a query working right after 3 errors in a row.' },
    { id: 'notebook', icon: '\ud83d\udcd3', name: 'Detective\u2019s Notebook', desc: 'Keep 10 entries in your notebook.' },
    { id: 'wrong-tree', icon: '\ud83c\udf33', name: 'Barking Up the Wrong Tree', desc: 'Make a wrong accusation.' },
    { id: 'case-closed', icon: '\ud83d\udd0e', name: 'Case Closed', desc: 'Name the culprit.' },
    { id: 'spotless', icon: '\ud83c\udf1f', name: 'Spotless', desc: 'Earn 3 stars in every room.' },
    { id: 'night-owl', icon: '\ud83e\udd89', name: 'Night Owl', desc: 'Play between midnight and 4 a.m.' }
  ];
  function award(state, id) { if (state.achievements[id]) return false; state.achievements[id] = now(); return true; }
  // ev: { type: 'query', sql, ok } | { type: 'chapter', chapter, cs } | { type: 'accuse', correct } | { type: 'tick', hour }
  function evaluate(state, ev, chapters) {
    const got = [];
    const give = (id) => { if (award(state, id)) got.push(id); };
    if (ev.type === 'query') {
      state.stats.queries++;
      if (ev.ok) {
        give('first-query');
        if (state.stats.errStreak >= 3) give('whisperer');
        state.stats.errStreak = 0;
        const s = String(ev.sql).replace(/'[^']*'/g, "''").replace(/--.*$/gm, '');
        if (/\bjoin\b/i.test(s)) give('joiner');
        if (/^\s*with\b/i.test(s)) give('cte');
        if (/\bover\s*\(/i.test(s)) give('window');
      } else { state.stats.errors++; state.stats.errStreak++; }
    }
    if (ev.type === 'chapter') {
      const cs = ev.cs; const c = ev.chapter;
      if (c.id === chapters[0].id) give('first-door');
      if (hintsUsed(cs) === 0 && !Object.keys(cs.revealed).length) give('unassisted');
      if (cs.timeMs <= c.par * 1000) give('speed');
      if (chapters.every((x) => state.chapters[x.id] && state.chapters[x.id].done && state.chapters[x.id].stars === 3)) give('spotless');
    }
    if (ev.type === 'accuse') give(ev.correct ? 'case-closed' : 'wrong-tree');
    if (ev.type === 'tick' && ev.hour >= 0 && ev.hour < 4) give('night-owl');
    if (state.notebook.length >= 10) give('notebook');
    return got;
  }
  // ---------- slots ----------
  function load(storage, slot) {
    try { const raw = storage.getItem(KEY(slot)); if (!raw) return null; const s = JSON.parse(raw); return validate(s) ? s : null; } catch (e) { return null; }
  }
  function save(storage, slot, state) { state.updated = now(); storage.setItem(KEY(slot), JSON.stringify(state)); }
  function remove(storage, slot) { storage.removeItem(KEY(slot)); }
  function activeSlot(storage) { const n = parseInt(storage.getItem(ACTIVE), 10); return n >= 1 && n <= SLOTS ? n : 1; }
  function setActive(storage, n) { storage.setItem(ACTIVE, String(n)); }
  function summary(state, chapters) {
    if (!state) return null;
    const done = chapters.filter((c) => state.chapters[c.id] && state.chapters[c.id].done);
    const starsTotal = done.reduce((a, c) => a + state.chapters[c.id].stars, 0);
    const time = Object.values(state.chapters).reduce((a, c) => a + (c.timeMs || 0), 0);
    return { rooms: done.length, total: chapters.length, stars: starsTotal, maxStars: chapters.length * 3, timeMs: time, solved: !!state.solved, updated: state.updated };
  }
  function validate(s) { return !!(s && s.v === 1 && typeof s.chapters === 'object' && Array.isArray(s.notebook) && typeof s.achievements === 'object'); }
  function exportSave(state) { return JSON.stringify({ app: 'sql-escape-room', version: 1, exported: new Date().toISOString(), state }, null, 2); }
  function importSave(text) {
    let o; try { o = JSON.parse(text); } catch (e) { throw new Error('That file isn\u2019t valid JSON.'); }
    if (!o || o.app !== 'sql-escape-room') throw new Error('That file isn\u2019t a SQL Escape Room save.');
    const s = o.state;
    if (!validate(s)) throw new Error('That save file is damaged or from an unknown version.');
    s.stats = Object.assign({ queries: 0, errors: 0, errStreak: 0 }, s.stats || {});
    s.accusations = Array.isArray(s.accusations) ? s.accusations : [];
    return s;
  }
  function fmtTime(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
  }
  return { SLOTS, KEY, ACTIVE, fresh, ch, unlocked, active, hintsUsed, stars, solve, hint, reveal, pushHistory, resetChapter, ACHIEVEMENTS, evaluate, load, save, remove, activeSlot, setActive, summary, exportSave, importSave, validate, fmtTime };
});
