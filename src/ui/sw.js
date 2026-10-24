// ==========================================================================
// CAPVOYAGE - SERVICE WORKER (PWA & Cache Hors-Ligne)
// ==========================================================================
// Stratégie NETWORK-FIRST pour les fichiers de l'application :
// le réseau fait foi dès qu'il est disponible, le cache ne sert que hors-ligne.
// (L'ancienne stratégie cache-first continuait de servir un app.js cassé
// après correction, rendant l'interface inerte.)
//
// Mises à jour (ADR-009) :
// - l'installation ne peut plus échouer à cause d'un seul fichier (précache tolérant) ;
// - à l'activation d'une nouvelle version, les fenêtres ouvertes dont le code est trop ancien
//   pour gérer la mise à jour elles-mêmes sont rechargées une fois.

const CACHE_PREFIX = 'capvoyage-cache-';
const CACHE_NAME = CACHE_PREFIX + 'v10';
const PING_TIMEOUT_MS = 1500;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/icons.js',
  '/manifest.webmanifest',
  '/fonts/public-sans-v21-latin.woff2',
  '/fonts/atkinson-hyperlegible-v12-latin-400.woff2',
  '/fonts/atkinson-hyperlegible-v12-latin-700.woff2',
  '/fonts/atkinson-hyperlegible-v12-latin-400-italic.woff2',
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
  '/domain/IcsService.js',
  '/domain/SyncQueue.js',
  '/domain/NowService.js',
  '/domain/ContactImport.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Chaque fichier est précaché isolément : un échec réseau ne doit jamais empêcher
      // l'installation (sinon l'ancienne version resterait active indéfiniment).
      // cache: 'reload' contourne le cache HTTP du navigateur pour précharger des versions fraîches.
      await Promise.allSettled(ASSETS_TO_CACHE.map(async (url) => {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`);
        await cache.put(url, response);
      }));
    }).then(() => self.skipWaiting())
  );
});

// Demande à une fenêtre si son code sait gérer les mises à jour (réponse PONG) ; sinon elle est « muette ».
function isClientResponsive(client) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), PING_TIMEOUT_MS);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      resolve(true);
    };
    try {
      client.postMessage({ type: 'PING' }, [channel.port2]);
    } catch (err) {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

// Recharge une fois les fenêtres au code trop ancien pour gérer elles-mêmes la mise à jour.
// ATTENTION : ne jamais l'attendre dans waitUntil() de l'activation. Une navigation n'est servie
// qu'une fois le Service Worker activé : attendre `navigate()` ici bloquerait la page indéfiniment.
async function reloadMuteClients() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(windows.map(async (client) => {
    if (!(await isClientResponsive(client))) {
      try { await client.navigate(client.url); } catch (err) { /* fenêtre fermée entre-temps */ }
    }
  }));
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const ours = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    const isUpgrade = ours.some((key) => key !== CACHE_NAME);
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
    // Mise à jour d'une version déjà installée (et non première installation)
    if (isUpgrade) reloadMuteClients().catch(() => {});
  })());
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
