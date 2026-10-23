// FIXTURE : Service Worker v5 d'origine (cache-first), tel qu'installé sur les appareils restés sur une ancienne version.
// ==========================================================================
// CAPVOYAGE - SERVICE WORKER (PWA & Cache Hors-Ligne)
// ==========================================================================

const CACHE_NAME = 'capvoyage-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorer les requÃªtes d'API externes ou non-GET
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('https://api.frankfurter.app') || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Renvoi de la ressource en cache avec mise Ã  jour en arriÃ¨re-plan
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {/* Hors-ligne silencieux */});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

