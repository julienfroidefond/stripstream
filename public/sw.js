const CACHE_NAME = "stripstream-cache-v3";
const IMAGES_CACHE_NAME = "stripstream-images-v3";
const OFFLINE_PAGE = "/offline.html";

const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/images/icons/icon-192x192.png",
  "/images/icons/icon-512x512.png",
];

// Fonction pour obtenir l'URL de base sans les query params
const getBaseUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
  } catch {
    return url;
  }
};

// Installation du service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(IMAGES_CACHE_NAME),
    ])
  );
});

// Fonction pour nettoyer les doublons dans un cache
const cleanDuplicatesInCache = async (cacheName) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  // Grouper par URL de base
  const grouped = {};
  for (const key of keys) {
    const baseUrl = getBaseUrl(key.url);
    if (!grouped[baseUrl]) {
      grouped[baseUrl] = [];
    }
    grouped[baseUrl].push(key);
  }
  
  // Pour chaque groupe, garder seulement la version la plus récente
  const deletePromises = [];
  for (const baseUrl in grouped) {
    const versions = grouped[baseUrl];
    if (versions.length > 1) {
      // Trier par query params (version) décroissant
      versions.sort((a, b) => {
        const aVersion = new URL(a.url).searchParams.get('v') || '0';
        const bVersion = new URL(b.url).searchParams.get('v') || '0';
        return Number(bVersion) - Number(aVersion);
      });
      // Supprimer toutes sauf la première (plus récente)
      for (let i = 1; i < versions.length; i++) {
        deletePromises.push(cache.delete(versions[i]));
      }
    }
  }
  
  await Promise.all(deletePromises);
};

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Supprimer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== IMAGES_CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
      // Nettoyer les doublons dans les caches actuels
      cleanDuplicatesInCache(CACHE_NAME),
      cleanDuplicatesInCache(IMAGES_CACHE_NAME),
    ])
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

// Fonction pour nettoyer les anciennes versions d'un fichier
const cleanOldVersions = async (cacheName, request) => {
  const cache = await caches.open(cacheName);
  const baseUrl = getBaseUrl(request.url);
  
  // Récupérer toutes les requêtes en cache
  const keys = await cache.keys();
  
  // Supprimer toutes les requêtes qui ont la même URL de base
  const deletePromises = keys
    .filter(key => getBaseUrl(key.url) === baseUrl)
    .map(key => cache.delete(key));
  
  await Promise.all(deletePromises);
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
      .then(async (response) => {
        // Mettre en cache les ressources statiques de Next.js et les pages
        if (
          response.ok &&
          (isNextStaticResource(event.request.url) || event.request.mode === "navigate")
        ) {
          const responseToCache = response.clone();
          const cache = await caches.open(CACHE_NAME);
          
          // Nettoyer les anciennes versions avant de mettre en cache la nouvelle
          if (isNextStaticResource(event.request.url)) {
            try {
              await cleanOldVersions(CACHE_NAME, event.request);
            } catch (error) {
              console.warn("Error cleaning old versions:", error);
            }
          }
          
          // Mettre en cache la nouvelle version
          try {
            await cache.put(event.request, responseToCache);
          } catch (error) {
            console.warn("Error caching response:", error);
          }
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
