const CACHE_NAME = "stripstream-cache-v1";
const BOOKS_CACHE_NAME = "stripstream-books";
const COVERS_CACHE_NAME = "stripstream-covers";
const OFFLINE_PAGE = "/offline.html";

const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/images/icons/icon-192x192.png",
  "/images/icons/icon-512x512.png",
];

// Installation du service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(BOOKS_CACHE_NAME),
      caches.open(COVERS_CACHE_NAME),
    ])
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) => name !== CACHE_NAME && name !== BOOKS_CACHE_NAME && name !== COVERS_CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fonction pour vérifier si c'est une ressource webpack
const isWebpackResource = (url) => {
  return (
    url.includes("/_next/webpack") ||
    url.includes("webpack-hmr") ||
    url.includes("webpack.js") ||
    url.includes("webpack-runtime") ||
    url.includes("hot-update")
  );
};

// Fonction pour vérifier si c'est une ressource statique de Next.js
const isNextStaticResource = (url) => {
  return url.includes("/_next/static") && !isWebpackResource(url);
};

// Fonction pour vérifier si c'est une ressource de livre
const isBookResource = (url) => {
  return url.includes("/api/v1/books/") && (url.includes("/pages") || url.includes("/thumbnail"));
};

// Fonction pour vérifier si c'est une image de couverture
const isCoverImage = (url) => {
  const urlParams = new URLSearchParams(url.split("?")[1]);
  const originalUrl = urlParams.get("url") || url;

  return (
    originalUrl.includes("/api/komga/images/") &&
    (originalUrl.includes("/series/") || originalUrl.includes("/books/")) &&
    originalUrl.includes("/thumbnail")
  );
};

// Stratégie de cache pour les images de couverture
const coverCacheStrategy = async (request) => {
  const urlParams = new URLSearchParams(request.url.split("?")[1]);
  const originalUrl = urlParams.get("url") || request.url;
  const originalRequest = new Request(originalUrl, request);

  const cache = await caches.open(COVERS_CACHE_NAME);
  const cachedResponse = await cache.match(originalRequest);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(originalRequest);
    if (response.ok) {
      await cache.put(originalRequest, response.clone());
      return response;
    }
    throw new Error("Network response was not ok");
  } catch (error) {
    console.error("Error fetching cover image", error);
    return new Response("", {
      status: 404,
      statusText: "Not Found",
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
};

// Écouteur pour les messages du client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_COVER") {
    const { url } = event.data;
    if (url && isCoverImage(url)) {
      fetch(url)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(COVERS_CACHE_NAME);
            await cache.put(url, response.clone());
          }
        })
        .catch(() => {
          // Ignorer les erreurs de mise en cache
        });
    }
  }
});

self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non GET
  if (event.request.method !== "GET") return;

  // Ignorer les ressources webpack
  if (isWebpackResource(event.request.url)) return;

  // Gérer les requêtes d'images de couverture
  if (event.request.url.includes("/api/v1/books/") && event.request.url.includes("/cover")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response.ok) {
              return new Response(null, { status: 404 });
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            return new Response(null, { status: 404 });
          });
      })
    );
  }

  // Pour les images de couverture
  if (isCoverImage(event.request.url)) {
    event.respondWith(coverCacheStrategy(event.request));
    return;
  }

  // Pour les ressources de livre
  if (isBookResource(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
    );
    return;
  }

  // Pour les ressources statiques de Next.js et les autres requêtes
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache les ressources statiques de Next.js et les pages
        if (
          response.ok &&
          (isNextStaticResource(event.request.url) || event.request.mode === "navigate")
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        // Si c'est une navigation, renvoyer la page hors ligne
        if (event.request.mode === "navigate") {
          return cache.match(OFFLINE_PAGE);
        }

        return new Response(JSON.stringify({ error: "Hors ligne" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
  );
});
