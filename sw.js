const CACHE = 'pd-v78';
const ARCHIVOS = ['./', 'index.html', 'transportes.html', 'admin.html', 'manifest-transportes.json', 'manifest-admin.json', 'comun.js', 'pdf.js', 'pdfgen.html', 'pdf_tr.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'logo.png', 'marca.png',
  'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js'];

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
  // red primero (siempre versiones consistentes); sin senal usa la copia guardada
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
        return r;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
  );
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.titulo || 'Parte diario', { body: d.texto || 'Aún no has enviado el parte de hoy.', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'parte-5pm', renotify: true, data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
