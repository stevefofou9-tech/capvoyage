// ==========================================================================
// CAPVOYAGE - SERVICE WORKER (PWA & Cache Hors-Ligne)
// ==========================================================================
// Stratégie NETWORK-FIRST pour les fichiers de l'application :
// le réseau fait foi dès qu'il est disponible, le cache ne sert que hors-ligne.
// (L'ancienne stratégie cache-first continuait de servir un app.js cassé
// après correction, rendant l'interface inerte.)

const CACHE_NAME = 'capvoyage-cache-v6';
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
      // cache: 'reload' contourne le cache HTTP du navigateur pour précharger des versions fraîches
      return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })));
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
  // Ignorer les requêtes non-GET, externes ou d'API
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Une requête de navigation ne peut pas être recréée avec des options (TypeError)
  const networkFetch = event.request.mode === 'navigate'
    ? fetch(event.request)
    : fetch(event.request, { cache: 'no-cache' });

  event.respondWith(
    networkFetch
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        // Navigation hors-ligne vers une URL non cachée : renvoyer la coquille de l'app
        if (event.request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      }))
  );
});
