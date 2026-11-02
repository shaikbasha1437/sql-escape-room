// The app shell: modal stack behaviour (Back/Esc/dirty prompts), service worker asset list, and
// files the static site needs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createModalStack } = require('../js/modal.js');
const root = path.join(__dirname, '..');

function fakeHistory() {
  const entries = [null]; let i = 0; const listeners = [];
  return {
    get state() { return entries[i]; },
    pushState(s) { entries.length = i + 1; entries.push(s); i++; },
    go(n) { i = Math.max(0, Math.min(entries.length - 1, i + n)); setTimeout(() => listeners.forEach((f) => f()), 0); },
    back() { this.go(-1); },
    onpop(f) { listeners.push(f); }
  };
}
function modal(id, log, dirty) { return { id, show: () => log.push('show ' + id), hide: () => log.push('hide ' + id), isDirty: dirty }; }

test('modal stack: open pushes history, close pops it', async () => {
  const H = fakeHistory(); const log = []; const s = createModalStack({ history: H }); H.onpop(s.onPopState);
  s.open(modal('a', log)); s.open(modal('b', log));
  assert.strictEqual(s.size, 2); assert.strictEqual(H.state.depth, 2);
  await s.close('b');
  assert.strictEqual(s.size, 1); assert.strictEqual(H.state.depth, 1);
  await s.close('a');
  assert.strictEqual(s.size, 0); assert.strictEqual(H.state, null);
  assert.deepStrictEqual(log, ['show a', 'show b', 'hide b', 'hide a']);
});
test('modal stack: browser Back closes only the top sheet', async () => {
  const H = fakeHistory(); const log = []; const s = createModalStack({ history: H }); H.onpop(s.onPopState);
  s.open(modal('a', log)); s.open(modal('b', log));
  H.back(); await new Promise((r) => setTimeout(r, 5));
  assert.strictEqual(s.size, 1); assert.strictEqual(s.top().id, 'a');
});
test('modal stack: a dirty sheet asks before closing, and declining keeps it open', async () => {
  const H = fakeHistory(); const log = []; let answer = false; let asked = 0;
  const s = createModalStack({ history: H, confirm: () => { asked++; return answer; } }); H.onpop(s.onPopState);
  s.open(modal('note', log, () => true));
  assert.strictEqual(await s.requestClose('note'), false);
  H.back(); await new Promise((r) => setTimeout(r, 5));
  assert.strictEqual(s.size, 1, 'Back declined keeps the sheet');
  assert.strictEqual(H.state.serModal, 'note', 'history entry restored');
  answer = true;
  assert.strictEqual(await s.requestClose('note'), true);
  assert.strictEqual(s.size, 0); assert.strictEqual(asked, 3);
});
test('modal stack: closing a lower sheet closes the ones above it', async () => {
  const H = fakeHistory(); const log = []; const s = createModalStack({ history: H }); H.onpop(s.onPopState);
  s.open(modal('a', log)); s.open(modal('b', log)); s.open(modal('c', log));
  await s.close('a');
  assert.strictEqual(s.size, 0); assert.strictEqual(H.state, null);
  assert.deepStrictEqual(log.slice(3), ['hide c', 'hide b', 'hide a']);
});
test('service worker caches every script, style and asset the page loads', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const list = JSON.parse('[' + sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].replace(/'/g, '"') + ']');
  const refs = Array.from(html.matchAll(/(?:src|href)="([^"#:]+)"/g)).map((m) => './' + m[1]);
  for (const r of refs) assert.ok(list.includes(r), 'sw caches ' + r);
  for (const a of list) if (a !== './') assert.ok(fs.existsSync(path.join(root, a)), a + ' exists');
  // the worker's importScripts are cached too
  const w = fs.readFileSync(path.join(root, 'js/worker.js'), 'utf8');
  for (const m of w.match(/importScripts\(([^)]*)\)/)[1].matchAll(/'([^']+)'/g)) assert.ok(list.includes('./' + path.posix.join('js', m[1])), 'sw caches ' + m[1]);
  assert.match(sw, /const CACHE = 'sql-escape-room-v\d+'/);
  assert.match(sw, /cache: 'no-cache'/, 'network-first revalidates');
});
test('static site basics: relative paths, .nojekyll, manifest, license', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(!/(?:src|href)="\//.test(html), 'no absolute paths (works under /sql-escape-room/)');
  assert.ok(fs.existsSync(path.join(root, '.nojekyll')));
  const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.strictEqual(man.start_url, './');
  for (const i of man.icons) assert.ok(fs.existsSync(path.join(root, i.src)), i.src);
  assert.match(fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'), /MIT License/);
});
test('README keeps spoilers out; solutions live in SOLUTIONS.md', () => {
  const C = require('../js/chapters.js');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const culprit = C.SUSPECTS.find((s) => s.culprit).name;
  assert.ok(!readme.includes(culprit), 'README never names the culprit');
  for (const code of ['2741', '6644', 'LANTERN', 'B-0417']) assert.ok(!readme.includes(code), 'README hides ' + code);
  const sol = fs.readFileSync(path.join(root, 'SOLUTIONS.md'), 'utf8');
  for (const ch of C.CHAPTERS) for (const p of ch.puzzles) assert.ok(sol.includes(p.solution.trim().split('\n')[0].slice(0, 30)), 'SOLUTIONS has ' + p.id);
});
test('no immigration or visa language anywhere in the shipped files', () => {
  const files = ['index.html', 'README.md', 'SOLUTIONS.md', 'js/chapters.js', 'js/app.js', 'js/world.js'];
  for (const f of files) assert.ok(!/\b(visa|F-1|OPT|immigration)\b/.test(fs.readFileSync(path.join(root, f), 'utf8')), f);
});
