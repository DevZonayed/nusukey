/* NusukKey service worker: the app shell lives on the phone, so a repeat visit opens instantly (even offline).
   Fonts are cache-first; the page, script and config are stale-while-revalidate (shown at once, refreshed in
   the background). API calls are not touched: the page keeps its own small copy of the newest codes. */
const V = 'nk-v9';
const SHELL = ['./', 'index.html', 'app.js', 'config.js', 'favicon.svg', 'manifest.webmanifest',
  'fonts/inter.woff2', 'fonts/geist-mono.woff2', 'fonts/purno-regular.woff2', 'fonts/purno-bold.woff2', 'fonts/ruqaa-inshallah.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/admin.html')) return;
  if (url.pathname.includes('/fonts/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put(req, cp)); return res; })));
    return;
  }
  const key = req.mode === 'navigate' ? './' : req;
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(key, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then((res) => { if (res.ok) c.put(key, res.clone()); return res; }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  }));
});
