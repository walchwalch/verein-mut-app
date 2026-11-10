// Offline-Unterstützung für die Web-Version (in der iPhone-App nicht aktiv)
const V = 'mut-v1';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'img/logo-weiss.png', 'img/favicon.png', 'fonts/montserrat-400.woff2', 'fonts/montserrat-600.woff2', 'fonts/montserrat-800.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.endsWith('/data/feed.json')) { // erst Netz, sonst gespeicherter Stand
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(u.pathname, c)); return r; }).catch(() => caches.match(u.pathname)));
    return;
  }
  // App-Dateien: Netz zuerst (damit Updates ankommen), sonst Speicher
  e.respondWith(fetch(e.request).then(r => { if (r.ok && !u.pathname.includes('/media/')) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
});
