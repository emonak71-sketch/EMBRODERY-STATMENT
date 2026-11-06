const CACHE_NAME = 'embrodery-v4';
const STATIC_ASSET = /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?)$/i;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const offlinePage = url.pathname === '/owner.html' ? '/owner.html' : ['/download', '/download.html'].includes(url.pathname) ? '/download.html' : '/index.html';
    event.respondWith(fetch(request).then(async response => {
      if (response.ok) {
        await caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(offlinePage)) || Response.error()));
    return;
  }

  if (STATIC_ASSET.test(url.pathname) || url.pathname === '/manifest.json' || url.pathname === '/owner-manifest.json') {
    event.respondWith(fetch(request).then(async response => {
      if (response.ok) {
        await caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error()));
  }
});
