/* Web Audio: a low ambient drone per room, plus small sound effects. Everything is synthesised
   (no audio files), and nothing plays until the player switches sound on. */
(function (root) {
  'use strict';
  const MOODS = { ember: 55, amber: 58.27, moss: 49, steel: 46.25, cyan: 61.74, violet: 51.91, brass: 43.65, crimson: 41.2 };
  let ctx = null; let master = null; let amb = null;
  const st = { sfx: false, ambient: false, mood: 'ember' };
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    return ctx;
  }
  function tone(freq, t0, dur, type, vol) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, freq) {
    const len = Math.floor(ctx.sampleRate * dur); const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 900;
    const g = ctx.createGain(); g.gain.value = vol || 0.3; s.connect(f); f.connect(g); g.connect(master); s.start(t0);
  }
  const FX = {
    success(t) { [523.25, 659.25, 783.99].forEach((f, i) => tone(f, t + i * 0.09, 0.5, 'sine', 0.16)); },
    error(t) { tone(130.8, t, 0.18, 'square', 0.06); tone(98, t + 0.12, 0.25, 'square', 0.05); },
    unlock(t) { noise(t, 0.12, 0.35, 1800); tone(82.4, t + 0.05, 0.35, 'triangle', 0.3); [392, 523.25, 659.25, 1046.5].forEach((f, i) => tone(f, t + 0.35 + i * 0.12, 0.9, 'sine', 0.12)); },
    hint(t) { tone(880, t, 0.25, 'sine', 0.07); tone(1318.5, t + 0.08, 0.3, 'sine', 0.05); },
    click(t) { tone(1600, t, 0.03, 'square', 0.015); },
    page(t) { noise(t, 0.18, 0.12, 3000); },
    accuse(t) { tone(65.4, t, 1.4, 'sawtooth', 0.09); tone(77.8, t + 0.02, 1.4, 'sawtooth', 0.07); }
  };
  function play(name) { if (!st.sfx || !FX[name] || !ensure()) return; FX[name](ctx.currentTime + 0.01); }
  function stopAmbient() {
    if (!amb) return; const a = amb; amb = null; const t = ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t); a.gain.gain.setTargetAtTime(0, t, 0.4);
    setTimeout(() => a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* ignore */ } }), 2000);
  }
  function startAmbient() {
    if (!ensure()) return; stopAmbient();
    const base = MOODS[st.mood] || 55; const t = ctx.currentTime;
    const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 3; lp.connect(gain);
    const nodes = [];
    [1, 1.5, 2.003].forEach((m, i) => { const o = ctx.createOscillator(); o.type = i ? 'sine' : 'sawtooth'; o.frequency.value = base * m; o.detune.value = (i - 1) * 6; const g = ctx.createGain(); g.gain.value = i ? 0.10 : 0.06; o.connect(g); g.connect(lp); o.start(t); nodes.push(o); });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 140; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); nodes.push(lfo);
    // faint rain-like hiss
    const len = ctx.sampleRate * 2; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0.025; n.connect(bp); bp.connect(ng); ng.connect(gain); n.start(t); nodes.push(n);
    gain.gain.setTargetAtTime(0.5, t, 1.2);
    amb = { gain, nodes };
  }
  function set(opts) {
    if ('sfx' in opts) st.sfx = !!opts.sfx;
    const moodChanged = 'mood' in opts && opts.mood !== st.mood;
    if ('mood' in opts) st.mood = opts.mood;
    if ('ambient' in opts) st.ambient = !!opts.ambient;
    if (st.ambient && (!amb || moodChanged || 'ambient' in opts)) { if (!amb || moodChanged) startAmbient(); } else if (!st.ambient) stopAmbient();
  }
  // Pause the drone while the tab is hidden.
  if (root.document) root.document.addEventListener('visibilitychange', () => { if (!ctx) return; if (root.document.hidden) ctx.suspend(); else if (st.ambient || st.sfx) ctx.resume(); });
  (root.SER = root.SER || {}).audio = { play, set, get state() { return Object.assign({}, st); } };
})(typeof self !== 'undefined' ? self : this);
