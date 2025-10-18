const CACHE_NAME = "stripstream-cache-v1";
const IMAGES_CACHE_NAME = "stripstream-images-v1";
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
      caches.open(IMAGES_CACHE_NAME),
    ])
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== IMAGES_CACHE_NAME)
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

// Fonction pour vérifier si c'est une image (couvertures ou pages de livres)
const isImageResource = (url) => {
  return (
    (url.includes("/api/v1/books/") && (url.includes("/pages") || url.includes("/thumbnail") || url.includes("/cover"))) ||
    (url.includes("/api/komga/images/") && (url.includes("/series/") || url.includes("/books/")) && url.includes("/thumbnail"))
  );
};

// Stratégie Cache-First pour les images
const imageCacheStrategy = async (request) => {
  const cache = await caches.open(IMAGES_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      return response;
    }
    // Si 404, retourner une réponse vide sans throw (pas d'erreur console)
    if (response.status === 404) {
      return new Response("", {
        status: 404,
        statusText: "Not Found",
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
    // Pour les autres erreurs, throw
    throw new Error(`Network response error: ${response.status}`);
  } catch (error) {
    // Erreurs réseau (offline, timeout, etc.)
    console.warn("Image fetch failed:", error);
    return new Response("", {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
};

self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non GET
  if (event.request.method !== "GET") return;

  // Ignorer les ressources webpack
  if (isWebpackResource(event.request.url)) return;

  // Gérer les images avec Cache-First
  if (isImageResource(event.request.url)) {
    event.respondWith(imageCacheStrategy(event.request));
    return;
  }

  // Pour les ressources statiques de Next.js et les autres requêtes : Network-First
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
