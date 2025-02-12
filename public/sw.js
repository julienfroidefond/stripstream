const CACHE_NAME = "stripstream-cache-v1";
const OFFLINE_PAGE = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/images/icons/icon-192x192.png",
  "/images/icons/icon-512x512.png",
];

// Installation du service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Stratégie de cache : Network First avec fallback sur le cache
self.addEventListener("fetch", (event) => {
  // Ne pas intercepter les requêtes vers l'API
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la nouvelle réponse
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        return cachedResponse || cache.match(OFFLINE_PAGE);
      })
  );
});
