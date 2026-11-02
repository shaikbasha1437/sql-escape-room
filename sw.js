/* SQL Escape Room service worker: network-first for app files, per-file cache, offline fallback.
   Bump CACHE on each release; old caches are removed on activate. */
const CACHE = 'sql-escape-room-v1';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './vendor/codemirror.js', './vendor/sql-wasm.js', './vendor/sql-wasm.wasm',
  './js/rng.js', './js/world.js', './js/chapters.js', './js/check.js', './js/errors.js', './js/progress.js', './js/engine.js',
  './js/modal.js', './js/dbclient.js', './js/editor.js', './js/audio.js', './js/share.js', './js/worker.js', './js/app.js'
];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  // Cache each file on its own so one failed request can't break install.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((a) => c.add(new Request(a, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('sql-escape-room-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // no-cache: always revalidate with the server, so a new release shows up on the next visit.
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html').then((i) => i || caches.match('./')) : undefined))
    .then((r) => r || Response.error())));
});
