/* "Case solved" share card: a 1200x630 PNG drawn on a canvas. It never names the culprit. */
(function (root) {
  'use strict';
  function wrap(ctx, text, x, y, max, lh) {
    const words = text.split(' '); let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t; }
    if (line) ctx.fillText(line, x, y);
    return y + lh;
  }
  function draw(d) {
    const W = 1200; const H = 630;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(W * 0.3, H * 0.2, 40, W * 0.5, H * 0.5, W * 0.8);
    g.addColorStop(0, '#3b2717'); g.addColorStop(0.55, '#170f14'); g.addColorStop(1, '#07060a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // shelves
    x.globalAlpha = 0.08; x.fillStyle = '#ffd9a0';
    for (let i = 0; i < 9; i++) x.fillRect(0, 70 + i * 66, W, 3);
    x.globalAlpha = 1;
    x.strokeStyle = 'rgba(255,210,122,.55)'; x.lineWidth = 3; x.strokeRect(28, 28, W - 56, H - 56);
    x.fillStyle = '#ffd27a'; x.font = '600 26px ui-monospace, Menlo, Consolas, monospace';
    x.fillText(d.solved ? 'CASE FILE \u2014 SOLVED' : 'CASE FILE \u2014 IN PROGRESS', 70, 100);
    x.fillStyle = '#f6ead7'; x.font = '700 72px Georgia, "Times New Roman", serif';
    x.fillText(d.title, 70, 190);
    x.fillStyle = '#cdbba3'; x.font = '28px Georgia, serif';
    wrap(x, d.subtitle, 70, 240, W - 140, 38);
    const stats = [['Rooms escaped', d.rooms + ' / ' + d.total], ['Stars', d.stars + ' / ' + d.maxStars], ['Case time', d.time], ['Queries run', String(d.queries)]];
    stats.forEach((s, i) => {
      const bx = 70 + i * 270; const by = 330;
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(bx, by, 250, 130);
      x.strokeStyle = 'rgba(255,210,122,.25)'; x.lineWidth = 1.5; x.strokeRect(bx, by, 250, 130);
      x.fillStyle = '#ffd27a'; x.font = '700 46px ui-monospace, Menlo, Consolas, monospace'; x.fillText(s[1], bx + 20, by + 70);
      x.fillStyle = '#b9a790'; x.font = '22px system-ui, sans-serif'; x.fillText(s[0], bx + 20, by + 108);
    });
    x.fillStyle = '#f6ead7'; x.font = '26px ui-monospace, Menlo, Consolas, monospace';
    const stars = '\u2605'.repeat(Math.round(d.stars / Math.max(1, d.total))) + '\u2606'.repeat(3 - Math.round(d.stars / Math.max(1, d.total)));
    x.fillText('Culprit: \u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588   ' + stars, 70, 530);
    x.fillStyle = '#8f7f6c'; x.font = '22px system-ui, sans-serif';
    x.fillText('SQL Escape Room \u00b7 solved with real SQL \u00b7 ' + d.url, 70, 572);
    return c;
  }
  const toBlob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));
  async function download(d) {
    const blob = await toBlob(draw(d));
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sql-escape-room-case.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return blob;
  }
  async function share(d) {
    const blob = await toBlob(draw(d));
    const file = new File([blob], 'sql-escape-room-case.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'SQL Escape Room', text: 'I escaped ' + d.rooms + ' of ' + d.total + ' rooms in SQL Escape Room. ' + d.url }); return true; }
    return false;
  }
  (root.SER = root.SER || {}).share = { draw, download, share };
})(typeof self !== 'undefined' ? self : this);
