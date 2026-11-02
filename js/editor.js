/* SQL editor: CodeMirror 6 with SQLite highlighting and autocomplete of this room's tables and
   columns. Falls back to a plain textarea if CodeMirror can't load. Tab is left for focus moves. */
(function (root) {
  'use strict';
  function createEditor(host, opts) {
    const CM = root.CM;
    const onRun = opts.onRun || (() => {});
    if (!CM) {
      const ta = document.createElement('textarea');
      ta.className = 'fallback-editor'; ta.spellcheck = false; ta.setAttribute('aria-label', 'SQL query'); ta.placeholder = opts.placeholder || '';
      ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); } });
      host.appendChild(ta);
      return { get: () => ta.value, set: (v) => { ta.value = v; }, insert: (t) => { const s = ta.selectionStart; ta.setRangeText(t, s, ta.selectionEnd, 'end'); ta.focus(); }, focus: () => ta.focus(), setSchema() {}, fallback: true };
    }
    const lang = new CM.Compartment();
    const hl = CM.HighlightStyle.define([
      { tag: CM.tags.keyword, color: 'var(--syn-kw)', fontWeight: '600' },
      { tag: [CM.tags.string, CM.tags.special(CM.tags.string)], color: 'var(--syn-str)' },
      { tag: [CM.tags.number, CM.tags.bool, CM.tags.null], color: 'var(--syn-num)' },
      { tag: [CM.tags.comment, CM.tags.lineComment, CM.tags.blockComment], color: 'var(--syn-com)', fontStyle: 'italic' },
      { tag: [CM.tags.operator, CM.tags.punctuation], color: 'var(--syn-op)' },
      { tag: [CM.tags.typeName, CM.tags.standard(CM.tags.name)], color: 'var(--syn-type)' },
      { tag: [CM.tags.name, CM.tags.propertyName], color: 'var(--syn-name)' }
    ]);
    const langFor = (schema) => CM.sql({ dialect: CM.SQLite, upperCaseKeywords: true, schema: schema || {} });
    const view = new CM.EditorView({
      parent: host,
      state: CM.EditorState.create({
        doc: opts.value || '',
        extensions: [
          CM.keymap.of([{ key: 'Mod-Enter', run: () => { onRun(); return true; } }, { key: 'Shift-Enter', run: () => { onRun(); return true; } }]),
          CM.basicSetup,
          lang.of(langFor({})),
          CM.syntaxHighlighting(hl),
          CM.placeholder(opts.placeholder || ''),
          CM.EditorView.lineWrapping,
          CM.EditorView.contentAttributes.of({ 'aria-label': 'SQL query editor', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
          CM.EditorView.updateListener.of((u) => { if (u.docChanged && opts.onChange) opts.onChange(); })
        ]
      })
    });
    return {
      view,
      get: () => view.state.doc.toString(),
      set: (v) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v }, selection: { anchor: v.length } }),
      insert: (t) => { const r = view.state.selection.main; view.dispatch({ changes: { from: r.from, to: r.to, insert: t }, selection: { anchor: r.from + t.length } }); view.focus(); },
      focus: () => view.focus(),
      setSchema(tables) { const s = {}; (tables || []).forEach((t) => { s[t.name] = t.columns.map((c) => c.name); }); view.dispatch({ effects: lang.reconfigure(langFor(s)) }); }
    };
  }
  (root.SER = root.SER || {}).editor = { createEditor };
})(typeof self !== 'undefined' ? self : this);
