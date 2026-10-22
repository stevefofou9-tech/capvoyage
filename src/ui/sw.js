// ==========================================================================
// CAPVOYAGE - SERVICE WORKER (PWA & Cache Hors-Ligne)
// ==========================================================================

const CACHE_NAME = 'capvoyage-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest',
  '/domain/TripService.js',
  '/domain/ActivityService.js',
  '/domain/BudgetEngine.js',
  '/domain/ContactService.js',
  '/domain/TodoService.js',
  '/domain/AuthService.js',
  '/domain/ReminderService.js',
  '/domain/StorageService.js',
  '/domain/ActivityTemplates.js',
  '/domain/GeographyData.js',
  '/domain/IcsService.js'
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
  // Ignorer les requêtes d'API externes ou non-GET
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('https://api.frankfurter.app') || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Renvoi de la ressource en cache avec mise à jour en arrière-plan
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

