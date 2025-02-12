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

// Stratégie de cache différente selon le type de requête
self.addEventListener("fetch", (event) => {
  // Pour les requêtes API, on utilise "Network First" avec un timeout
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      Promise.race([
        fetch(event.request.clone())
          .then((response) => {
            // Ne mettre en cache que les réponses réussies
            if (response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // En cas d'erreur réseau, essayer le cache
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Si pas de cache, renvoyer une erreur appropriée
              return new Response(JSON.stringify({ error: "Hors ligne" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              });
            });
          }),
        // Timeout après 5 secondes
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)).catch(
          () => {
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return new Response(JSON.stringify({ error: "Timeout" }), {
                status: 504,
                headers: { "Content-Type": "application/json" },
              });
            });
          }
        ),
      ])
    );
  } else {
    // Pour les autres ressources, on garde la stratégie "Cache First"
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((response) => {
            // Mettre en cache la nouvelle réponse
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return response;
          })
          .catch(() => {
            // Si la requête échoue et que c'est une page, renvoyer la page hors ligne
            if (event.request.mode === "navigate") {
              return caches.match(OFFLINE_PAGE);
            }
            return new Response("Hors ligne", { status: 503 });
          });
      })
    );
  }
});
