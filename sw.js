const CACHE = 'pd-v1';
const ARCHIVOS = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const red = fetch(e.request)
        .then(r => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, copia));
          }
          return r;
        })
        .catch(() => hit);
      return hit || red;
    })
  );
});
