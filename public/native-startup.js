// Native apps use installed assets; retire service workers left by older builds.
(function () {
  if (!window.__TAURI_INTERNALS__ && !window.__TAURI__) return;
  if (!('serviceWorker' in navigator)) return;
  var cleanupKey = 'embroidery-native-worker-cleanup-v1';
  if (sessionStorage.getItem(cleanupKey)) return;
  sessionStorage.setItem(cleanupKey, 'done');
  var controlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    return Promise.all(registrations.filter(function (registration) {
      return new URL(registration.scope).origin === location.origin;
    }).map(function (registration) { return registration.unregister(); }));
  }).then(function () {
    if (!window.caches) return;
    return caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key.indexOf('embrodery-') === 0; })
        .map(function (key) { return caches.delete(key); }));
    });
  }).then(function () { if (controlled) location.reload(); })
    .catch(function (error) { console.warn('Native startup cache cleanup failed', error); });
})();
