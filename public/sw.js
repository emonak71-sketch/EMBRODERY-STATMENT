// Network-only service worker: application shell may be served by the browser,
// but API/business records are never cached or replayed while disconnected.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || /supabase|\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\/|\/functions\/v1\//i.test(url.href)) {
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith(fetch(request));
});
