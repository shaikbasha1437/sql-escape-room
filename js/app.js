/* SQL Escape Room: page controller. Story, puzzles, query console, schema explorer, notebook,
   saves, achievements and the accusation. The database lives in a Web Worker (js/worker.js). */
(function () {
  'use strict';
  const S = window.SER; const C = S.chapters; const P = S.progress; const K = S.check; const X = S.errors; const A = S.audio;
  const CH = C.CHAPTERS;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const put = (el, ...k) => el.replaceChildren(...k.filter((x) => x != null && x !== false));
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  // ---------- storage ----------
  const mem = {}; let storeOk = true;
  const store = {
    getItem(k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } },
    setItem(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; if (storeOk) { storeOk = false; toast('Your browser refused to save progress (private mode or full storage). Progress lasts until you close this tab.'); } } },
    removeItem(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
  };
  const SET_KEY = 'ser.settings';
  const mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let settings = Object.assign({ theme: document.documentElement.dataset.theme || 'dark', sfx: false, ambient: false, typewriter: true, reduceMotion: false }, safeJSON(store.getItem(SET_KEY)) || {});
  function safeJSON(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  const saveSettings = () => store.setItem(SET_KEY, JSON.stringify(settings));
  const reduced = () => settings.reduceMotion || mqReduce.matches;

  let slot = P.activeSlot(store);
  let state = P.load(store, slot) || P.fresh();
  function persist() { P.save(store, slot, state); P.setActive(store, slot); }

  const cur = { index: -1, chapter: null, schema: null, answers: null, last: null, loading: false, running: false, door: false };
  const csOf = () => P.ch(state, cur.chapter.id);

  // ---------- toasts ----------
  function toast(text, opts) {
    opts = opts || {};
    const host = $('#toasts');
    const t = h('div', { class: 'toast' + (opts.cls ? ' ' + opts.cls : ''), role: 'status' }, h('span', { class: 'grow', text }));
    let timer = null;
    const done = () => { clearTimeout(timer); t.remove(); };
    if (opts.action) t.append(h('button', { type: 'button', class: 'btn small', onclick: () => { done(); opts.action.fn(); } }, opts.action.label));
    t.append(h('button', { type: 'button', class: 'x', 'aria-label': 'Dismiss', onclick: done }, '\u00d7'));
    host.append(t);
    while (host.children.length > 4) host.firstChild.remove();
    timer = setTimeout(done, opts.ms || (opts.action ? 8000 : 4500));
    return done;
  }
  function undoToast(text, undo) { toast(text, { action: { label: 'Undo', fn: undo }, ms: 9000 }); }

  // ---------- modals: X, Cancel, Esc, backdrop click and browser Back all close ----------
  const stack = S.modal.createModalStack({ history: window.history, confirm: (t) => window.confirm(t) });
  window.addEventListener('popstate', () => stack.onPopState());
  let sheetSeq = 0;
  function sheet(o) {
    const id = o.id || 'sheet' + (++sheetSeq);
    if (stack.isOpen(id)) return null;
    const titleId = id + '-title';
    const body = h('div', { class: 'sheet-body' });
    const foot = h('div', { class: 'sheet-foot' });
    const box = h('div', { class: 'sheet' + (o.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1', 'data-sheet': id },
      h('div', { class: 'sheet-head' }, h('h2', { id: titleId, text: o.title }), h('button', { type: 'button', class: 'x', 'aria-label': 'Close', 'data-close': 'x', onclick: () => api.requestClose() }, '\u00d7')),
      body, foot);
    const back = h('div', { class: 'backdrop', 'data-backdrop': id });
    let downOnBack = false;
    back.addEventListener('mousedown', (e) => { downOnBack = e.target === back; });
    back.addEventListener('click', (e) => { if (e.target === back && downOnBack) api.requestClose(); downOnBack = false; });
    back.append(box);
    let prevFocus = null;
    const api = {
      id, el: box, body, foot,
      close: () => stack.close(id),
      requestClose: () => stack.requestClose(id),
      refresh: () => { body.textContent = ''; o.body && o.body(body, api); }
    };
    (o.actions || []).forEach((a) => foot.append(h('button', { type: 'button', class: 'btn ' + (a.cls || ''), onclick: () => a.fn(api) }, a.label)));
    foot.append(h('button', { type: 'button', class: 'btn', 'data-close': 'cancel', onclick: () => api.requestClose() }, o.cancelLabel || 'Close'));
    stack.open({
      id,
      isDirty: o.isDirty,
      confirmText: o.confirmText || 'Discard your unsaved changes?',
      show() {
        prevFocus = document.activeElement;
        $('#modal-root').append(back);
        o.body && o.body(body, api);
        const f = box.querySelector(o.focus || '[autofocus], .sheet-body input, .sheet-body textarea, .sheet-body button, .sheet-foot .btn.primary') || box;
        setTimeout(() => f.focus(), 0);
      },
      hide() { back.remove(); o.onClose && o.onClose(); if (prevFocus && prevFocus.isConnected) prevFocus.focus(); }
    });
    return api;
  }
  // Async yes/no question in a sheet. Any close (X, Cancel, Esc, backdrop, Back) means no.
  function ask(o) {
    return new Promise((resolve) => {
      let answer = false;
      const made = sheet({
        id: 'ask', title: o.title, cancelLabel: o.cancel || 'Cancel', focus: '.sheet-foot .btn.primary',
        body: (b) => (Array.isArray(o.text) ? o.text : [o.text]).forEach((t) => b.append(h('p', { text: t }))),
        actions: [{ label: o.ok || 'OK', cls: 'primary' + (o.danger ? ' danger-ok' : ''), fn: (api) => { answer = true; api.close(); } }],
        onClose: () => resolve(answer)
      });
      if (!made) resolve(false);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (cur.door) { endDoor(); e.preventDefault(); return; }
      const top = stack.top();
      if (top) { e.preventDefault(); stack.requestClose(top.id); }
      return;
    }
    if (e.key === 'Tab' && stack.top()) { // keep focus inside the top sheet
      const box = document.querySelector('[data-sheet="' + stack.top().id + '"]');
      if (!box) return;
      const f = Array.from(box.querySelectorAll('button, [href], input, textarea, select, summary, [tabindex]:not([tabindex="-1"])')).filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === box)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  // ---------- database ----------
  const db = S.db.createDb({ url: 'js/worker.js', timeoutMs: 5000 });
  const status = (t) => { $('#db-status').textContent = t; };

  // ---------- header ----------
  function renderHeader() {
    const ch = cur.chapter; const cs = csOf();
    $('#room-num').textContent = 'Room ' + (cur.index + 1) + '/' + CH.length;
    $('#room-title').textContent = ch.title;
    document.title = ch.title + ' \u00b7 SQL Escape Room';
    const st = cs.done ? cs.stars : P.stars(ch, cs);
    $('#room-stars').textContent = '\u2605'.repeat(st) + '\u2606'.repeat(3 - st);
    $('#room-stars').setAttribute('aria-label', (cs.done ? 'Earned ' : 'On track for ') + st + ' of 3 stars');
    $('#room-stars').title = cs.done ? 'Stars earned in this room' : 'Stars you\u2019re on track for (hints and par time ' + P.fmtTime(ch.par * 1000) + ' count)';
    renderTimer();
    $('#nb-count').textContent = String(state.notebook.length);
    const on = settings.sfx || settings.ambient;
    $('#btn-sound').setAttribute('aria-pressed', String(on)); $('#btn-sound').setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    $('#sound-icon').textContent = on ? '\ud83d\udd0a' : '\ud83d\udd07';
    const dark = settings.theme === 'dark';
    $('#theme-icon').textContent = dark ? '\u263e' : '\u2600';
    $('#btn-theme').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  function renderTimer() {
    const cs = csOf(); const t = $('#timer');
    t.textContent = P.fmtTime(cs.timeMs);
    t.classList.toggle('over', cs.timeMs > cur.chapter.par * 1000);
  }
  function applySettings() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = settings.theme === 'dark' ? '#1a1216' : '#efe4d4';
    A.set({ sfx: settings.sfx, ambient: settings.ambient });
  }

  // ---------- narration (typewriter, skippable) ----------
  let typing = null;
  function narrate(paras, animate) {
    const host = $('#narration-text');
    if (typing) typing.cancel();
    host.textContent = '';
    const ps = paras.map((t) => { const p = h('p'); host.append(p); return { p, t }; });
    const finish = () => { ps.forEach((x) => { x.p.textContent = x.t; x.p.classList.remove('caret-blink'); }); $('#btn-skip').hidden = true; $('#btn-replay').hidden = false; typing = null; };
    if (!animate || reduced() || !settings.typewriter) { finish(); return Promise.resolve(); }
    $('#btn-skip').hidden = false; $('#btn-replay').hidden = true;
    return new Promise((resolve) => {
      let i = 0; let j = 0; let timer = null; let n = 0;
      const step = () => {
        if (i >= ps.length) { finish(); resolve(); return; }
        const x = ps[i]; x.p.classList.add('caret-blink');
        j++; x.p.textContent = x.t.slice(0, j);
        if ((n++ % 4) === 0) A.play('click');
        if (j >= x.t.length) { x.p.classList.remove('caret-blink'); i++; j = 0; timer = setTimeout(step, 420); return; }
        const c = x.t[j - 1];
        timer = setTimeout(step, /[.!?]/.test(c) ? 260 : /[,;:\u2014]/.test(c) ? 120 : 16);
      };
      typing = { cancel: () => { clearTimeout(timer); finish(); resolve(); } };
      step();
    });
  }
  const introParas = () => (cur.index === 0 ? C.CASE.prologue.concat(cur.chapter.intro) : cur.chapter.intro);

  // ---------- chapter ----------
  async function openChapter(i) {
    if (typing) typing.cancel();
    cur.index = i; cur.chapter = CH[i]; cur.schema = null; cur.answers = null; cur.last = null; cur.loading = true;
    state.current = i;
    const cs = csOf();
    document.body.dataset.mood = cur.chapter.mood;
    A.set({ mood: cur.chapter.mood });
    renderHeader(); renderPuzzles(); renderRoomEnd(); renderSchema(); clearResults();
    editor.set(cs.draft || '');
    status('Opening ' + cur.chapter.title + '\u2026');
    const animate = !cs.seenIntro;
    cs.seenIntro = true; persist();
    narrate(introParas(), animate);
    try {
      const r = await db.load(i);
      if (cur.index !== i) return;
      cur.schema = r.schema; cur.answers = r.answers; cur.loading = false;
      editor.setSchema(r.schema);
      status(r.schema.length + ' table' + (r.schema.length === 1 ? '' : 's') + ' \u00b7 read-only');
      renderSchema(); renderPuzzles();
    } catch (e) {
      if (cur.index !== i) return;
      cur.loading = false;
      status('Could not open the database.');
      $('#results-body').replaceChildren(h('div', { class: 'err' }, h('h3', { text: 'The archive terminal won\u2019t start' }), h('p', { text: 'The in-browser database failed to load (' + e.message + '). Check your connection and reload.' }), h('button', { type: 'button', class: 'btn', onclick: () => openChapter(i) }, 'Try again')));
    }
  }

  // ---------- puzzles ----------
  function renderPuzzles() {
    const ch = cur.chapter; const cs = csOf();
    const act = P.active(ch, cs);
    const list = $('#puzzles'); list.textContent = '';
    ch.puzzles.forEach((p, j) => {
      const solved = !!cs.solved[p.id]; const isAct = act && act.id === p.id; const locked = !solved && !isAct;
      const li = h('li', { class: 'pz' + (solved ? ' solved' : '') + (isAct ? ' active' : '') + (locked ? ' locked' : ''), 'data-puzzle': p.id });
      li.append(h('div', { class: 'pz-head' }, h('h3', { text: (j + 1) + '. ' + (locked ? 'Locked' : p.title) }), h('span', { class: 'pz-state', text: solved ? 'Solved \u2713' : isAct ? 'Open' : '\ud83d\udd12' })));
      if (locked) { list.append(li); return; }
      li.append(h('p', { class: 'pz-story', text: p.story }));
      li.append(h('span', { class: 'pz-kind', text: p.check === 'code' ? 'Enter the ' + (p.label || 'answer').toLowerCase() : 'Find the rows' }));
      li.append(h('p', { class: 'pz-task', text: p.task }));
      const used = cs.hints[p.id] || 0;
      if (used) li.append(h('ol', { class: 'hint-list', 'aria-label': 'Hints you\u2019ve opened' }, p.hints.slice(0, used).map((t) => h('li', { text: t }))));
      if (solved) li.append(h('div', { class: 'pz-clue' }, h('strong', { text: 'Clue: ' }), p.clue));
      if (isAct) {
        const fb = h('div', { class: 'pz-feedback', role: 'status', 'aria-live': 'polite' });
        const actions = h('div', { class: 'pz-actions' });
        if (p.check === 'code') {
          const inp = h('input', { type: 'text', 'aria-label': p.label || 'Answer', placeholder: p.label || 'Answer', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'data-code': p.id });
          const form = h('form', { class: 'code-form', onsubmit: (e) => { e.preventDefault(); tryCode(p, inp.value, li, fb); } }, inp, h('button', { type: 'submit', class: 'btn primary', disabled: cur.loading || !cur.answers }, 'Try it'));
          actions.append(form);
        } else {
          actions.append(h('button', { type: 'button', class: 'btn primary', 'data-check': p.id, disabled: cur.loading || !cur.answers, onclick: () => checkResult(p, li, fb) }, 'Check my last result'));
        }
        actions.append(h('button', { type: 'button', class: 'btn', 'data-hint': p.id, onclick: () => openHints(p) }, 'Hint ' + used + '/3'));
        li.append(actions, fb);
        if (p.check !== 'code') li.append(h('p', { class: 'muted small', text: 'Run a query whose result answers this, then check it. Extra columns are fine.' }));
      }
      list.append(li);
    });
  }
  function bad(li, fb, msg) {
    fb.className = 'pz-feedback bad'; fb.textContent = msg; A.play('error');
    if (!reduced()) { li.classList.remove('shake'); void li.offsetWidth; li.classList.add('shake'); }
  }
  function tryCode(p, value, li, fb) {
    if (!cur.answers) return;
    const r = K.compareCode(value, cur.answers[p.id].accept);
    if (r.ok) return solved(p);
    const trap = Object.entries(p.traps || {}).find(([k]) => K.normCode(k) === K.normCode(value));
    bad(li, fb, trap ? trap[1] : r.message);
  }
  function checkResult(p, li, fb) {
    if (!cur.answers) return;
    if (!cur.last) return bad(li, fb, 'Run a query first, then check its result.');
    const exp = cur.answers[p.id];
    const r = K.compareResult(exp, cur.last, { ordered: exp.ordered, set: exp.set });
    if (r.ok) return solved(p);
    bad(li, fb, r.message);
  }
  function solved(p) {
    const ch = cur.chapter;
    const res = P.solve(state, ch, p.id);
    A.play('success');
    toast('Solved: ' + p.title + '. Clue pinned to your notebook.');
    award(P.evaluate(state, { type: 'solve' }, CH));
    if (res.finished) {
      award(P.evaluate(state, { type: 'chapter', chapter: ch, cs: csOf() }, CH));
      persist(); renderHeader(); renderPuzzles(); renderRoomEnd();
      if (cur.index < CH.length - 1) playDoor('Room ' + (cur.index + 2) + ' unlocked: ' + CH[cur.index + 1].title);
      else playDoor('The Vault is open. Time to name a thief.');
      return;
    }
    persist(); renderHeader(); renderPuzzles();
    const nxt = document.querySelector('.pz.active input, .pz.active [data-check]');
    if (nxt && nxt.tagName === 'INPUT') nxt.focus();
  }
  function renderRoomEnd() {
    const el = $('#room-end'); const cs = csOf();
    if (!cs.done) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false; el.textContent = '';
    cur.chapter.outro.forEach((t) => el.append(h('p', { text: t })));
    el.append(h('p', { class: 'muted small', text: 'Room cleared in ' + P.fmtTime(cs.timeMs) + ' with ' + cs.stars + ' star' + (cs.stars === 1 ? '' : 's') + '.' }));
    if (cur.index < CH.length - 1) el.append(h('button', { type: 'button', class: 'btn primary', 'data-next': '1', onclick: () => openChapter(cur.index + 1) }, 'Enter ' + CH[cur.index + 1].title + ' \u2192'));
    else if (state.solved) el.append(h('button', { type: 'button', class: 'btn primary', onclick: openFinale }, 'Read the case file again'));
    else el.append(h('button', { type: 'button', class: 'btn primary', 'data-accuse': '1', onclick: openAccuse }, 'Make your accusation'));
  }
  function award(ids) {
    (ids || []).forEach((id) => { const a = P.ACHIEVEMENTS.find((x) => x.id === id); if (a) toast(a.icon + ' Achievement: ' + a.name + '. ' + a.desc, { cls: 'ach' }); });
  }

  // ---------- door unlock ----------
  let doorTimer = null;
  function playDoor(text) {
    const d = $('#door');
    $('#door-text').textContent = text;
    d.hidden = false; d.classList.remove('open'); void d.offsetWidth; d.classList.add('open');
    cur.door = true; A.play('unlock');
    const live = $('#toasts'); live.setAttribute('aria-label', text);
    clearTimeout(doorTimer); doorTimer = setTimeout(endDoor, reduced() ? 1700 : 3500);
  }
  function endDoor() { clearTimeout(doorTimer); const d = $('#door'); d.hidden = true; d.classList.remove('open'); cur.door = false; const n = document.querySelector('[data-next], [data-accuse]'); if (n) { setTab('story'); n.focus(); } }
  $('#door').addEventListener('click', endDoor);

  // ---------- editor + run ----------
  let draftTimer = null;
  const editor = S.editor.createEditor($('#editor-host'), {
    placeholder: '-- Write SQL here. Ctrl+Enter (or Shift+Enter) runs it.',
    onRun: () => run(),
    onChange: () => { clearTimeout(draftTimer); draftTimer = setTimeout(() => { if (cur.chapter) { csOf().draft = editor.get(); persist(); } }, 600); }
  });
  async function run() {
    if (cur.running) return;
    const sql = editor.get();
    if (!sql.trim()) return showError('empty query');
    if (!cur.answers) { status('Still opening the room\u2026'); return; }
    cur.running = true; $('#btn-run').disabled = true; status('Running\u2026');
    const ch = cur.chapter; const t0 = performance.now();
    try {
      const r = await db.run(sql);
      if (cur.chapter !== ch) return;
      cur.last = r;
      P.pushHistory(state, ch.id, sql, true);
      award(P.evaluate(state, { type: 'query', sql, ok: true }, CH));
      showResult(r, performance.now() - t0);
      status('Done in ' + Math.max(1, Math.round(performance.now() - t0)) + ' ms');
    } catch (e) {
      if (cur.chapter !== ch) return;
      P.pushHistory(state, ch.id, sql, false);
      award(P.evaluate(state, { type: 'query', sql, ok: false }, CH));
      showError(e.message);
      status(e.message === 'timeout' ? 'Stopped a runaway query' : 'Error');
    } finally {
      cur.running = false; $('#btn-run').disabled = false; csOf().draft = sql; persist();
    }
  }
  function clearResults() {
    $('#results-head').replaceChildren(h('span', { class: 'muted' }, 'Results appear here. Try ', h('code', { text: 'SELECT * FROM ' + ((W0()) || 'staff') + ';' })));
    $('#results-body').textContent = '';
  }
  const W0 = () => (cur.chapter ? cur.chapter.tables[0].replace(/_.*$/, '') : 'staff');
  const cellText = (v) => (v === null || v === undefined ? 'NULL' : v instanceof Uint8Array ? '<blob ' + v.length + ' bytes>' : String(v));
  function showResult(r) {
    const head = $('#results-head'); const body = $('#results-body');
    const n = r.rows.length;
    const act = P.active(cur.chapter, csOf());
    put(head,
      h('strong', { text: r.columns.length ? n + (r.truncated ? '+' : '') + ' row' + (n === 1 ? '' : 's') : 'Statement ran (no rows to show)' }),
      r.truncated ? h('span', { class: 'muted small', text: 'Stopped at ' + n + ' rows. Add a filter or LIMIT.' }) : null,
      r.statements > 1 ? h('span', { class: 'muted small', text: 'Showing the last of ' + r.statements + ' statements.' }) : null,
      h('span', { class: 'grow' }),
      act && act.check !== 'code' ? h('button', { type: 'button', class: 'btn small primary', 'data-check-result': '1', onclick: () => { const li = document.querySelector('.pz[data-puzzle="' + act.id + '"]'); checkResult(act, li, li.querySelector('.pz-feedback')); if (!document.querySelector('.pz[data-puzzle="' + act.id + '"].active')) return; setTab('story'); } }, 'Check against \u201c' + act.title + '\u201d') : null
    );
    if (!r.columns.length) { body.textContent = ''; return; }
    const SHOW = 500;
    const tbl = h('table', { class: 'grid' });
    tbl.append(h('thead', null, h('tr', null, h('th', { 'aria-label': 'Pin' }), r.columns.map((c) => h('th', { scope: 'col', text: c })))));
    const tb = h('tbody');
    r.rows.slice(0, SHOW).forEach((row) => {
      tb.append(h('tr', null, h('td', null, h('button', { type: 'button', class: 'pin', title: 'Pin this row to your notebook', 'aria-label': 'Pin row to notebook', onclick: () => pinRow(r.columns, row) }, '\ud83d\udccc')),
        row.map((v) => h('td', { class: v === null ? 'null' : typeof v === 'number' ? 'num' : '', title: cellText(v), text: cellText(v) }))));
    });
    tbl.append(tb);
    body.replaceChildren(tbl);
    if (n > SHOW) body.append(h('p', { class: 'muted small', style: 'padding:8px 10px', text: 'Showing the first ' + SHOW + ' of ' + n + ' rows.' }));
    body.scrollTop = 0;
  }
  function showError(message) {
    const ex = X.explain(message, cur.schema || []);
    $('#results-head').replaceChildren(h('strong', { class: 'bad', text: 'The terminal beeps.' }));
    $('#results-body').replaceChildren(h('div', { class: 'err', role: 'alert' }, h('h3', { text: ex.title }), h('p', { text: ex.tip }), ex.raw ? h('details', null, h('summary', { text: 'SQLite said' }), h('code', { text: ex.raw })) : null));
    A.play('error');
  }
  function pinRow(cols, row) {
    const text = cols.map((c, i) => c + ': ' + cellText(row[i])).join(' \u00b7 ');
    state.notebook.push({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'row', text, chapter: cur.chapter.id, ts: Date.now() });
    award(P.evaluate(state, { type: 'pin' }, CH));
    persist(); renderHeader();
    toast('Row pinned to your notebook.');
  }

  // ---------- schema explorer ----------
  function renderSchema() {
    const host = $('#schema');
    if (!cur.schema) { host.replaceChildren(h('p', { class: 'muted', text: 'Reading the archive\u2026' })); return; }
    host.textContent = '';
    cur.schema.forEach((t, i) => {
      const d = h('details', { class: 'tbl', open: i < 2 });
      d.append(h('summary', null, t.name, h('span', { class: 'count', text: t.count + ' rows' })));
      d.append(h('ul', { class: 'cols' }, t.columns.map((c) => h('li', null, h('button', { type: 'button', title: 'Insert ' + c.name, onclick: () => insertText(c.name) }, h('span', { class: c.pk ? 'pk' : '', text: c.name }), h('span', { class: 'type', text: c.type }))))));
      d.append(h('div', { class: 'tbl-actions' },
        h('button', { type: 'button', class: 'btn small', onclick: () => openSample(t) }, 'Sample rows'),
        h('button', { type: 'button', class: 'btn small', onclick: () => insertText('SELECT * FROM ' + t.name + ' LIMIT 20;', true) }, 'SELECT *')));
      host.append(d);
    });
  }
  function insertText(t, whole) {
    if (whole && editor.get().trim()) t = '\n' + t;
    if (whole && !editor.get().trim()) editor.set(t); else editor.insert(t);
    setTab('query'); editor.focus();
  }
  function gridOf(columns, rows) {
    const tbl = h('table', { class: 'grid' });
    tbl.append(h('thead', null, h('tr', null, columns.map((c) => h('th', { scope: 'col', text: c })))));
    tbl.append(h('tbody', null, rows.map((r) => h('tr', null, r.map((v) => h('td', { class: v === null ? 'null' : typeof v === 'number' ? 'num' : '', text: cellText(v) }))))));
    return h('div', { style: 'overflow:auto' }, tbl);
  }
  function openSample(t) {
    sheet({ id: 'sample', title: t.name + ' \u00b7 first rows', wide: true,
      body: (b) => { b.append(h('p', { class: 'muted small', text: t.count + ' rows in total. Columns: ' + t.columns.map((c) => c.name + ' ' + c.type).join(', ') })); b.append(gridOf(t.sample.columns, t.sample.rows)); },
      actions: [{ label: 'Query this table', cls: 'primary', fn: (api) => { api.close().then(() => insertText('SELECT * FROM ' + t.name + ' LIMIT 20;', true)); } }] });
  }

  // ---------- hints ----------
  function openHints(p) {
    const ch = cur.chapter;
    sheet({ id: 'hints', title: 'Hints: ' + p.title,
      body: (b, api) => {
        const cs = csOf(); const used = cs.hints[p.id] || 0;
        b.append(h('p', { class: 'pz-task', text: p.task }));
        if (!used) b.append(h('p', { class: 'muted', text: 'Each hint gets more specific. Using more than one in a room costs a star.' }));
        b.append(h('ol', { class: 'hint-list' }, p.hints.slice(0, used).map((t) => h('li', { text: t }))));
        const row = h('div', { class: 'row', style: 'margin-top:12px' });
        if (used < 3) row.append(h('button', { type: 'button', class: 'btn primary', 'data-next-hint': '1', onclick: () => { P.hint(state, ch.id, p.id); A.play('hint'); persist(); api.refresh(); renderHeader(); renderPuzzles(); const nb = api.el.querySelector('[data-next-hint]') || api.el.querySelector('[data-solution]'); if (nb) nb.focus(); } }, 'Show hint ' + (used + 1) + ' of 3'));
        if (cs.revealed[p.id]) {
          b.append(h('h3', { text: 'Solution' }), h('pre', { class: 'sql', text: p.solution }));
          row.append(h('button', { type: 'button', class: 'btn', onclick: () => { api.close().then(() => { editor.set(p.solution); setTab('query'); editor.focus(); }); } }, 'Copy to editor'));
        } else {
          row.append(h('button', { type: 'button', class: 'btn danger', 'data-solution': '1', onclick: async () => {
            const ok = await ask({ title: 'Show the solution?', text: ['You\u2019ll see a query that solves this puzzle. You still have to run it and check the result.', 'Revealing any solution caps this room at 1 star.'], ok: 'Show solution' });
            if (!ok) return;
            P.reveal(state, ch.id, p.id); persist(); renderHeader(); api.refresh();
          } }, 'Show solution\u2026'));
        }
        b.append(row);
      } });
  }

  // ---------- history ----------
  function openHistory() {
    sheet({ id: 'history', title: 'Query history: ' + cur.chapter.title, wide: true,
      body: (b, api) => {
        const cs = csOf();
        if (!cs.history.length) { b.append(h('p', { class: 'muted', text: 'Queries you run in this room appear here.' })); return; }
        b.append(h('ul', { class: 'list' }, cs.history.map((q) => h('li', null,
          h('div', { class: 'row' }, h('span', { class: 'grow note-meta', text: (q.ok ? '\u2713 ran ' : '\u2717 error \u00b7 ') + ago(q.ts) }), h('button', { type: 'button', class: 'btn small', onclick: () => api.close().then(() => { editor.set(q.sql); setTab('query'); editor.focus(); }) }, 'Use')),
          h('pre', { class: 'sql', text: q.sql })))));
      },
      actions: [{ label: 'Clear history', cls: 'ghost left', fn: (api) => {
        const cs = csOf(); if (!cs.history.length) return;
        const old = cs.history.slice(); cs.history = []; persist(); api.refresh();
        undoToast('History cleared.', () => { csOf().history = old; persist(); if (stack.isOpen('history')) api.refresh(); });
      } }] });
  }
  function ago(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return new Date(ts).toLocaleDateString();
  }

  // ---------- cheat sheet ----------
  function openCheats() {
    const ch = cur.chapter;
    sheet({ id: 'cheats', title: 'Cheat sheet: ' + ch.title,
      body: (b, api) => {
        b.append(h('div', { class: 'cheat-concepts' }, ch.concepts.map((c) => h('span', { class: 'chip', text: c }))));
        b.append(h('dl', { class: 'cheat' }, ch.cheats.map((c) => [h('dt', { text: c.t }), h('dd', null, h('pre', { class: 'sql', text: c.c }), h('button', { type: 'button', class: 'btn small', style: 'margin-top:4px', onclick: () => api.close().then(() => insertText(c.c, true)) }, 'Insert'))])));
        b.append(h('p', { class: 'muted small', text: 'This is SQLite: text in single quotes, || joins strings, strftime() and julianday() handle dates.' }));
      } });
  }

  // ---------- notebook ----------
  const chTitle = (id) => { const c = CH.find((x) => x.id === id); return c ? c.title : ''; };
  function openNotebook() {
    sheet({ id: 'notebook', title: 'Detective\u2019s notebook', wide: true,
      body: (b, api) => {
        if (!state.notebook.length) b.append(h('p', { class: 'muted', text: 'Clues are pinned here automatically when you solve a puzzle. You can also pin result rows and write your own notes.' }));
        const kinds = { clue: '\ud83d\udd0e Clue', row: '\ud83d\udccc Pinned row', note: '\u270f\ufe0f Note' };
        b.append(h('ul', { class: 'list' }, state.notebook.slice().reverse().map((n) => h('li', { 'data-note': n.id },
          h('div', { class: 'row' }, h('span', { class: 'grow note-meta', text: (kinds[n.kind] || 'Note') + (n.chapter ? ' \u00b7 ' + chTitle(n.chapter) : '') }),
            n.kind !== 'clue' ? h('button', { type: 'button', class: 'btn small', onclick: () => editNote(n, api) }, 'Edit') : null,
            h('button', { type: 'button', class: 'btn small ghost', 'aria-label': 'Delete this entry', onclick: () => deleteNote(n, api) }, 'Delete')),
          h('div', { class: 'note-text', text: n.text })))));
      },
      actions: [{ label: '+ Add note', cls: 'primary left', fn: (api) => editNote(null, api) }] });
  }
  function deleteNote(n, api) {
    const idx = state.notebook.findIndex((x) => x.id === n.id); if (idx < 0) return;
    state.notebook.splice(idx, 1); persist(); renderHeader(); api.refresh();
    undoToast('Notebook entry deleted.', () => { state.notebook.splice(Math.min(idx, state.notebook.length), 0, n); persist(); renderHeader(); if (stack.isOpen('notebook')) api.refresh(); });
  }
  function editNote(n, parent) {
    const start = n ? n.text : '';
    let ta = null; let err = null;
    sheet({ id: 'note-edit', title: n ? 'Edit note' : 'New note', cancelLabel: 'Cancel', focus: 'textarea',
      isDirty: () => !!ta && ta.value !== start,
      confirmText: 'Discard this note? Your changes will be lost.',
      body: (b) => {
        ta = h('textarea', { id: 'note-text', 'aria-describedby': 'note-req', required: true });
        ta.value = start;
        err = h('span', { id: 'note-req', class: 'req', text: '' });
        b.append(h('div', { class: 'field' }, h('label', { for: 'note-text', text: 'Note (required)' }), ta, err));
      },
      actions: [{ label: 'Save note', cls: 'primary', fn: (api) => {
        const t = ta.value.trim();
        if (!t) { err.textContent = 'Write something first, or press Cancel to leave without saving.'; ta.focus(); return; }
        if (n) { n.text = t; n.ts = Date.now(); } else state.notebook.push({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'note', text: t, chapter: cur.chapter.id, ts: Date.now() });
        award(P.evaluate(state, { type: 'note' }, CH));
        persist(); renderHeader();
        ta.value = start; // not dirty any more
        api.close().then(() => { if (parent && stack.isOpen('notebook')) parent.refresh(); });
        toast(n ? 'Note updated.' : 'Note saved.');
      } }] });
  }

  // ---------- chapter map ----------
  function openMap() {
    sheet({ id: 'map', title: 'The Hollowmere Institute', wide: true,
      body: (b, api) => {
        b.append(h('p', { class: 'muted small', text: 'Each room has its own database and teaches new SQL. Cleared rooms can be revisited.' }));
        b.append(h('div', { class: 'map' }, CH.map((c, i) => {
          const cs = state.chapters[c.id]; const open = P.unlocked(state, CH, i); const done = cs && cs.done;
          return h('button', { type: 'button', class: 'map-node' + (i === cur.index ? ' current' : '') + (done ? ' done' : ''), disabled: !open, 'data-room': c.id, 'aria-label': 'Room ' + (i + 1) + ': ' + (open ? c.title : 'locked') + (done ? ', cleared with ' + cs.stars + ' stars' : ''),
            onclick: () => api.close().then(() => { if (i !== cur.index) openChapter(i); }) },
          h('span', { class: 'n', text: 'Room ' + (i + 1) }), h('strong', { text: open ? c.title : '\ud83d\udd12 Locked' }), h('span', { class: 'c', text: c.concepts.join(' \u00b7 ') }),
          done ? h('span', { class: 'stars', text: '\u2605'.repeat(cs.stars) + '\u2606'.repeat(3 - cs.stars) }) : null);
        })));
        const s = P.summary(state, CH);
        b.append(h('p', { class: 'muted small', style: 'margin-top:12px', text: s.rooms + ' of ' + s.total + ' rooms cleared \u00b7 ' + s.stars + ' of ' + s.maxStars + ' stars \u00b7 total time ' + P.fmtTime(s.timeMs) }));
      } });
  }

  // ---------- achievements ----------
  function openAchievements() {
    sheet({ id: 'achievements', title: 'Achievements', wide: true,
      body: (b) => {
        const got = P.ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
        b.append(h('p', { class: 'muted', text: got + ' of ' + P.ACHIEVEMENTS.length + ' unlocked in this save.' }));
        b.append(h('div', { class: 'ach' }, P.ACHIEVEMENTS.map((a) => h('div', { class: state.achievements[a.id] ? '' : 'locked' }, h('div', { class: 'i', 'aria-hidden': 'true', text: a.icon }), h('strong', { text: a.name }), h('div', { class: 'muted small', text: a.desc }), h('div', { class: 'small', text: state.achievements[a.id] ? 'Unlocked ' + new Date(state.achievements[a.id]).toLocaleDateString() : 'Locked' })))));
      } });
  }

  // ---------- saves + settings ----------
  function switchSlot(n, fresh) {
    persist();
    slot = n; P.setActive(store, n);
    state = fresh ? P.fresh() : (P.load(store, n) || P.fresh());
    persist();
    openChapter(Math.min(state.current || 0, CH.length - 1));
  }
  function openMenu() {
    sheet({ id: 'menu', title: 'Saves & settings', wide: true,
      body: (b, api) => {
        b.append(h('h3', { text: 'Save slots' }));
        const slots = h('div', { class: 'slots' });
        for (let n = 1; n <= P.SLOTS; n++) {
          const st = n === slot ? state : P.load(store, n); const s = P.summary(st, CH);
          const el = h('div', { class: 'slot' + (n === slot ? ' on' : ''), 'data-slot': n },
            h('h3', { text: 'Slot ' + n + (n === slot ? ' (playing)' : '') }),
            h('p', { class: 'muted small', text: s ? s.rooms + '/' + s.total + ' rooms \u00b7 ' + s.stars + '\u2605 \u00b7 ' + P.fmtTime(s.timeMs) + (s.solved ? ' \u00b7 case solved' : '') + ' \u00b7 saved ' + ago(s.updated) : 'Empty' }));
          const row = h('div', { class: 'row' });
          if (n !== slot) row.append(h('button', { type: 'button', class: 'btn small primary', onclick: () => { switchSlot(n, false); api.refresh(); toast('Now playing slot ' + n + '.'); } }, st ? 'Continue' : 'Start here'));
          if (st) row.append(h('button', { type: 'button', class: 'btn small', onclick: async () => {
            if (!(await ask({ title: 'Start a new game in slot ' + n + '?', text: 'This replaces the progress in slot ' + n + '. You can undo right after.', ok: 'New game' }))) return;
            const old = n === slot ? JSON.parse(JSON.stringify(state)) : st; const was = slot;
            switchSlot(n, true); api.refresh();
            undoToast('Slot ' + n + ' reset to a new game.', () => { P.save(store, n, old); if (slot === n) { state = old; persist(); openChapter(state.current || 0); } else slot = was; if (stack.isOpen('menu')) api.refresh(); });
          } }, 'New game'));
          if (st && n !== slot) row.append(h('button', { type: 'button', class: 'btn small ghost', onclick: () => {
            P.remove(store, n); api.refresh();
            undoToast('Slot ' + n + ' deleted.', () => { P.save(store, n, st); if (stack.isOpen('menu')) api.refresh(); });
          } }, 'Delete'));
          el.append(row); slots.append(el);
        }
        b.append(slots);
        const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, 'data-import': '1', onchange: () => importFile(file, api) });
        b.append(h('div', { class: 'row', style: 'margin-top:10px' },
          h('button', { type: 'button', class: 'btn', onclick: exportFile }, 'Export this save'),
          h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'Import a save\u2026'), file,
          h('button', { type: 'button', class: 'btn', onclick: () => api.close().then(openShare) }, 'Progress card'),
          h('button', { type: 'button', class: 'btn danger', 'data-reset-room': '1', onclick: () => resetRoom(api) }, 'Reset this room')));
        b.append(h('h3', { text: 'Settings', style: 'margin-top:18px' }));
        const chk = (key, label, after) => h('label', null, h('input', { type: 'checkbox', checked: !!settings[key], 'data-setting': key, onchange: (e) => { settings[key] = e.target.checked; saveSettings(); applySettings(); renderHeader(); after && after(); } }), label);
        b.append(h('div', { class: 'settings' },
          chk('sfx', 'Sound effects'), chk('ambient', 'Ambient room sound'), chk('typewriter', 'Typewriter story text'), chk('reduceMotion', 'Reduce motion (also follows your system setting)'),
          h('label', null, 'Theme ', h('select', { 'aria-label': 'Theme', onchange: (e) => { settings.theme = e.target.value; saveSettings(); applySettings(); renderHeader(); } },
            h('option', { value: 'dark', selected: settings.theme === 'dark' }, 'Dark (lamplight)'), h('option', { value: 'light', selected: settings.theme === 'light' }, 'Light (parchment)')))));
        b.append(h('p', { class: 'muted small', style: 'margin-top:14px', text: 'Everything runs in your browser. Saves stay in this browser\u2019s storage; export one to move it to another device.' }));
      } });
  }
  async function resetRoom(api) {
    const ch = cur.chapter;
    if (!(await ask({ title: 'Reset ' + ch.title + '?', text: 'This clears the puzzles, hints, timer, history and clues for this room. You can undo right after.', ok: 'Reset room' }))) return;
    const snap = P.resetChapter(state, ch.id); persist();
    openChapter(cur.index); if (api && stack.isOpen('menu')) api.refresh();
    undoToast(ch.title + ' was reset.', () => { state = snap; persist(); openChapter(state.current || 0); });
  }
  function exportFile() {
    const blob = new Blob([P.exportSave(state)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'sql-escape-room-slot' + slot + '.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Save exported.');
  }
  function importFile(input, api) {
    const f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    f.text().then(async (text) => {
      let s; try { s = P.importSave(text); } catch (e) { toast(e.message); return; }
      if (!(await ask({ title: 'Load this save into slot ' + slot + '?', text: 'It replaces the progress in slot ' + slot + '. You can undo right after.', ok: 'Load save' }))) return;
      const old = state; state = s; persist(); openChapter(Math.min(state.current || 0, CH.length - 1)); if (stack.isOpen('menu')) api.refresh();
      undoToast('Save imported into slot ' + slot + '.', () => { state = old; persist(); openChapter(state.current || 0); });
    });
  }

  // ---------- accusation + finale ----------
  function openAccuse() {
    let choice = null; let verdict = null;
    sheet({ id: 'accuse', title: 'Name the thief', wide: true,
      body: (b) => {
        b.append(h('p', { text: 'Six people could have taken the Ashgrove Codex. Your notebook holds everything the building remembers. Choose carefully.' }));
        const cleared = new Set(state.accusations.map((a) => a.id));
        b.append(h('div', { class: 'suspects', role: 'radiogroup', 'aria-label': 'Suspects' }, C.SUSPECTS.map((s) => h('label', { class: 'suspect' + (cleared.has(s.id) ? ' cleared' : '') },
          h('input', { type: 'radio', name: 'suspect', value: s.id, onchange: () => { choice = s.id; verdict.textContent = ''; verdict.hidden = true; } }), h('strong', { text: s.name }), h('span', { text: s.role + (cleared.has(s.id) ? ' \u00b7 ruled out' : '') })))));
        verdict = h('div', { class: 'verdict', role: 'alert', hidden: true });
        b.append(verdict);
      },
      actions: [{ label: 'Accuse', cls: 'primary', fn: (api) => {
        if (!choice) { verdict.hidden = false; verdict.textContent = 'Pick a suspect first, or press Cancel to keep investigating.'; return; }
        const s = C.SUSPECTS.find((x) => x.id === choice);
        A.play('accuse');
        if (!s.culprit) {
          if (!state.accusations.some((a) => a.id === s.id)) state.accusations.push({ id: s.id, ts: Date.now() });
          award(P.evaluate(state, { type: 'accuse', correct: false }, CH)); persist();
          verdict.hidden = false; verdict.textContent = s.reply + ' Look again.';
          A.play('error');
          return;
        }
        state.solved = true; state.solvedAt = Date.now();
        award(P.evaluate(state, { type: 'accuse', correct: true }, CH)); persist();
        api.close().then(() => { renderRoomEnd(); openFinale(); });
      } }], cancelLabel: 'Keep investigating' });
  }
  function cardData() {
    const s = P.summary(state, CH);
    return { title: C.CASE.title, subtitle: state.solved ? 'Trapped overnight in a locked archive, I followed the data to the thief.' : 'Trapped overnight in a locked archive. Still following the data\u2026', rooms: s.rooms, total: s.total, stars: s.stars, maxStars: s.maxStars, time: P.fmtTime(s.timeMs), queries: state.stats.queries, solved: !!state.solved, url: location.host + location.pathname.replace(/index\.html$/, '') };
  }
  function shareBody(b) {
    const d = cardData();
    let img = null;
    try { img = h('img', { class: 'share-preview', alt: 'Case card: ' + d.rooms + ' of ' + d.total + ' rooms, ' + d.stars + ' stars, ' + d.time, src: S.share.draw(d).toDataURL('image/png') }); } catch (e) { /* canvas unavailable */ }
    if (img) b.append(img);
  }
  const shareActions = [
    { label: 'Download PNG', cls: 'primary', fn: () => S.share.download(cardData()).then(() => toast('Card downloaded.')) },
    { label: 'Share\u2026', cls: '', fn: () => S.share.share(cardData()).then((ok) => { if (!ok) toast('Sharing isn\u2019t available here. Download the PNG instead.'); }).catch(() => {}) }
  ];
  function openFinale() {
    sheet({ id: 'finale', title: 'Case closed', wide: true,
      body: (b) => {
        const f = h('div', { class: 'finale' }); C.FINALE.forEach((t) => f.append(h('p', { text: t }))); b.append(f);
        const s = P.summary(state, CH);
        b.append(h('p', { class: 'muted', text: 'You escaped ' + s.rooms + ' rooms with ' + s.stars + ' of ' + s.maxStars + ' stars in ' + P.fmtTime(s.timeMs) + ', running ' + state.stats.queries + ' queries.' }));
        shareBody(b);
      }, actions: shareActions });
  }
  function openShare() { sheet({ id: 'share', title: state.solved ? 'Case card' : 'Progress card', wide: true, body: shareBody, actions: shareActions }); }

  // ---------- tabs (phones) ----------
  function setTab(t) {
    $('#layout').dataset.tab = t;
    document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === t)));
  }
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // ---------- timer ----------
  let last = Date.now(); let ticks = 0;
  setInterval(() => {
    const now = Date.now(); const dt = Math.min(now - last, 5000); last = now;
    if (!cur.chapter || document.hidden || cur.door) return;
    const cs = csOf();
    if (cs.done) return;
    cs.timeMs += dt; renderTimer();
    if (++ticks % 10 === 0) { persist(); renderHeader(); }
    if (ticks % 60 === 1) award(P.evaluate(state, { type: 'tick', hour: new Date().getHours() }, CH));
  }, 1000);
  document.addEventListener('visibilitychange', () => { last = Date.now(); if (document.hidden && cur.chapter) persist(); });
  window.addEventListener('pagehide', () => { if (cur.chapter) { csOf().draft = editor.get(); persist(); } });

  // ---------- wire up ----------
  $('#btn-run').addEventListener('click', run);
  $('#btn-history').addEventListener('click', openHistory);
  $('#btn-cheats').addEventListener('click', openCheats);
  $('#btn-clear').addEventListener('click', () => { const old = editor.get(); if (!old.trim()) return; editor.set(''); editor.focus(); undoToast('Editor cleared.', () => editor.set(old)); });
  $('#btn-map').addEventListener('click', openMap);
  $('#btn-notebook').addEventListener('click', openNotebook);
  $('#btn-achievements').addEventListener('click', openAchievements);
  $('#btn-menu').addEventListener('click', openMenu);
  $('#btn-sound').addEventListener('click', () => { const on = !(settings.sfx || settings.ambient); settings.sfx = on; settings.ambient = on; saveSettings(); applySettings(); renderHeader(); if (on) A.play('hint'); toast(on ? 'Sound on. Fine-tune it in Menu.' : 'Sound off.'); });
  $('#btn-theme').addEventListener('click', () => { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applySettings(); renderHeader(); });
  $('#btn-skip').addEventListener('click', () => { if (typing) typing.cancel(); });
  $('#btn-replay').addEventListener('click', () => narrate(introParas(), true));
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', () => applySettings());

  applySettings();
  const start = Math.min(state.current || 0, CH.length - 1);
  openChapter(P.unlocked(state, CH, start) ? start : 0);
  if (state.chapters && Object.keys(state.chapters).length > 1 && P.summary(state, CH).rooms > 0) toast('Welcome back. Progress restored from slot ' + slot + '.');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  window.__ser = { get state() { return state; }, get slot() { return slot; }, stack };
})();
