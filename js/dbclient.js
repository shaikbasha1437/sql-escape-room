/* Page side of the query worker: request/response with ids, a per-query time limit, and automatic
   restart (reloading the current room) if the worker is killed or crashes. */
(function (root) {
  'use strict';
  function createDb(opts) {
    const url = opts.url || 'js/worker.js';
    const limit = opts.timeoutMs || 5000;
    let w = null; let seq = 0; let pending = new Map(); let lastIndex = null;
    function spawn() {
      w = new Worker(url);
      w.onmessage = (e) => { const m = e.data; const p = pending.get(m.id); if (!p) return; pending.delete(m.id); clearTimeout(p.timer); m.ok ? p.res(m.result) : p.rej(new Error(m.error)); };
      w.onerror = (e) => { e.preventDefault && e.preventDefault(); const err = new Error('The query engine crashed (' + (e.message || 'worker error') + ').'); fail(err); restart(); };
    }
    function fail(err) { pending.forEach((p) => { clearTimeout(p.timer); p.rej(err); }); pending = new Map(); }
    function restart() { try { w && w.terminate(); } catch (e) { /* ignore */ } spawn(); if (lastIndex !== null) send({ type: 'load', index: lastIndex }, 60000).catch(() => {}); }
    function send(msg, ms) {
      const id = ++seq;
      return new Promise((res, rej) => {
        const timer = ms ? setTimeout(() => {
          if (!pending.has(id)) return;
          pending.delete(id);
          rej(new Error('timeout'));
          fail(new Error('timeout'));
          restart();
        }, ms) : null;
        pending.set(id, { res, rej, timer });
        w.postMessage(Object.assign({ id }, msg));
      });
    }
    spawn();
    return {
      load(index) { lastIndex = index; return send({ type: 'load', index }, 60000); },
      run(sql) { return send({ type: 'run', sql }, limit); },
      restart
    };
  }
  (root.SER = root.SER || {}).db = { createDb };
})(typeof self !== 'undefined' ? self : this);
