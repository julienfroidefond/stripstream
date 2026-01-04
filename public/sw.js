// StripStream Service Worker - Version 2
// Architecture: SWR (Stale-While-Revalidate) for all resources

const VERSION = "v2";
const STATIC_CACHE = `stripstream-static-${VERSION}`;
const API_CACHE = `stripstream-api-${VERSION}`;
const IMAGES_CACHE = `stripstream-images-${VERSION}`;
const RSC_CACHE = `stripstream-rsc-${VERSION}`;
const BOOKS_CACHE = "stripstream-books"; // Never version this - managed by DownloadManager

const OFFLINE_PAGE = "/offline.html";
const PRECACHE_ASSETS = [OFFLINE_PAGE, "/manifest.json"];

// Cache size limits
const IMAGES_CACHE_MAX_SIZE = 100 * 1024 * 1024; // 100MB
const IMAGES_CACHE_MAX_ENTRIES = 500;

// ============================================================================
// Utility Functions - Request Detection
// ============================================================================

function isNextStaticResource(url) {
  return url.includes("/_next/static/");
}

function isNextRSCRequest(request) {
  const url = new URL(request.url);
  return url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
}

function isApiRequest(url) {
  return url.includes("/api/komga/") && !url.includes("/api/komga/images/");
}

function isImageRequest(url) {
  return url.includes("/api/komga/images/");
}

function isBookPageRequest(url) {
  // Book pages: /api/komga/images/books/{id}/pages/{num} or /api/komga/books/{id}/pages/{num}
  // These are handled by manual download (DownloadManager) - don't cache via SWR
  return (
    (url.includes("/api/komga/images/books/") || url.includes("/api/komga/books/")) &&
    url.includes("/pages/")
  );
}

function isBooksManualCache(url) {
  // Check if this is a request that should be handled by the books manual cache
  return url.includes("/api/komga/images/books/") && url.includes("/pages");
}

// ============================================================================
// Client Communication
// ============================================================================

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// ============================================================================
// Cache Management
// ============================================================================

async function getCacheSize(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  let totalSize = 0;

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.clone().blob();
      totalSize += blob.size;
    }
  }

  return totalSize;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxEntries) {
    // Remove oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
    // eslint-disable-next-line no-console
    console.log(`[SW] Trimmed ${toDelete.length} entries from ${cacheName}`);
  }
}

// ============================================================================
// Cache Strategies
// ============================================================================

/**
 * Cache-First: Serve from cache, fallback to network
 * Used for: Next.js static resources (immutable)
 */
async function cacheFirstStrategy(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, options);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed - try cache without ignoreSearch as fallback
    if (options.ignoreSearch) {
      const fallback = await cache.match(request, { ignoreSearch: false });
      if (fallback) return fallback;
    }
    throw error;
  }
}

/**
 * Stale-While-Revalidate: Serve from cache immediately, update in background
 * Used for: API calls, images
 */
async function staleWhileRevalidateStrategy(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start network request (don't await)
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        // Clone response for cache
        const responseToCache = response.clone();

        // Check if content changed (for notification)
        if (cached && options.notifyOnChange) {
          try {
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
              // For JSON APIs, compare content
              if (options.isJson) {
                const oldText = await cachedResponse.text();
                const newText = await response.clone().text();
                if (oldText !== newText) {
                  notifyClients({
                    type: "CACHE_UPDATED",
                    url: request.url,
                    timestamp: Date.now(),
                  });
                }
              }
            }
          } catch {
            // Ignore comparison errors
          }
        }

        // Update cache
        await cache.put(request, responseToCache);

        // Trim cache if needed (for images)
        if (options.maxEntries) {
          trimCache(cacheName, options.maxEntries);
        }
      }
      return response;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.log("[SW] Network request failed:", request.url, error.message);
      return null;
    });

  // Return cached version immediately if available
  if (cached) {
    return cached;
  }

  // Otherwise wait for network
  const response = await fetchPromise;
  if (response) {
    return response;
  }

  throw new Error("Network failed and no cache available");
}

/**
 * Network-First: Try network, fallback to cache
 * Used for: Page navigations
 */
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed - try cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Try to serve root page for SPA client-side routing
    const rootPage = await cache.match("/");
    if (rootPage) {
      return rootPage;
    }

    // Last resort: offline page
    const offlinePage = await cache.match(OFFLINE_PAGE);
    if (offlinePage) {
      return offlinePage;
    }

    throw error;
  }
}

// ============================================================================
// Service Worker Lifecycle
// ============================================================================

self.addEventListener("install", (event) => {
  // eslint-disable-next-line no-console
  console.log("[SW] Installing version", VERSION);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.addAll(PRECACHE_ASSETS);
        // eslint-disable-next-line no-console
        console.log("[SW] Precached assets");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[SW] Precache failed:", error);
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  // eslint-disable-next-line no-console
  console.log("[SW] Activating version", VERSION);

  event.waitUntil(
    (async () => {
      // Clean up old caches, but preserve BOOKS_CACHE
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE, API_CACHE, IMAGES_CACHE, RSC_CACHE, BOOKS_CACHE];

      const cachesToDelete = cacheNames.filter(
        (name) => name.startsWith("stripstream-") && !currentCaches.includes(name)
      );

      await Promise.all(cachesToDelete.map((name) => caches.delete(name)));

      if (cachesToDelete.length > 0) {
        // eslint-disable-next-line no-console
        console.log("[SW] Deleted old caches:", cachesToDelete);
      }

      await self.clients.claim();
      // eslint-disable-next-line no-console
      console.log("[SW] Activated and claimed clients");

      // Notify clients that SW is ready
      notifyClients({ type: "SW_ACTIVATED", version: VERSION });
    })()
  );
});

// ============================================================================
// Message Handler - Client Communication
// ============================================================================

self.addEventListener("message", async (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "GET_CACHE_STATS": {
      try {
        const [staticSize, apiSize, imagesSize, booksSize] = await Promise.all([
          getCacheSize(STATIC_CACHE),
          getCacheSize(API_CACHE),
          getCacheSize(IMAGES_CACHE),
          getCacheSize(BOOKS_CACHE),
        ]);

        const staticCache = await caches.open(STATIC_CACHE);
        const apiCache = await caches.open(API_CACHE);
        const imagesCache = await caches.open(IMAGES_CACHE);
        const booksCache = await caches.open(BOOKS_CACHE);

        const [staticKeys, apiKeys, imagesKeys, booksKeys] = await Promise.all([
          staticCache.keys(),
          apiCache.keys(),
          imagesCache.keys(),
          booksCache.keys(),
        ]);

        event.source.postMessage({
          type: "CACHE_STATS",
          payload: {
            static: { size: staticSize, entries: staticKeys.length },
            api: { size: apiSize, entries: apiKeys.length },
            images: { size: imagesSize, entries: imagesKeys.length },
            books: { size: booksSize, entries: booksKeys.length },
            total: staticSize + apiSize + imagesSize + booksSize,
          },
        });
      } catch (error) {
        event.source.postMessage({
          type: "CACHE_STATS_ERROR",
          payload: { error: error.message },
        });
      }
      break;
    }

    case "CLEAR_CACHE": {
      try {
        const cacheType = payload?.cacheType || "all";
        const cachesToClear = [];

        if (cacheType === "all" || cacheType === "static") {
          cachesToClear.push(STATIC_CACHE);
        }
        if (cacheType === "all" || cacheType === "api") {
          cachesToClear.push(API_CACHE);
        }
        if (cacheType === "all" || cacheType === "images") {
          cachesToClear.push(IMAGES_CACHE);
        }
        if (cacheType === "all" || cacheType === "rsc") {
          cachesToClear.push(RSC_CACHE);
        }
        // Note: BOOKS_CACHE is not cleared by default, only explicitly

        await Promise.all(
          cachesToClear.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            await Promise.all(keys.map((key) => cache.delete(key)));
          })
        );

        event.source.postMessage({
          type: "CACHE_CLEARED",
          payload: { caches: cachesToClear },
        });
      } catch (error) {
        event.source.postMessage({
          type: "CACHE_CLEAR_ERROR",
          payload: { error: error.message },
        });
      }
      break;
    }

    case "SKIP_WAITING": {
      self.skipWaiting();
      break;
    }

    case "GET_VERSION": {
      event.source.postMessage({
        type: "SW_VERSION",
        payload: { version: VERSION },
      });
      break;
    }

    case "GET_CACHE_ENTRIES": {
      try {
        const cacheType = payload?.cacheType;
        let cacheName;

        switch (cacheType) {
          case "static":
            cacheName = STATIC_CACHE;
            break;
          case "api":
            cacheName = API_CACHE;
            break;
          case "images":
            cacheName = IMAGES_CACHE;
            break;
          case "books":
            cacheName = BOOKS_CACHE;
            break;
          default:
            throw new Error("Invalid cache type");
        }

        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        const entries = await Promise.all(
          keys.map(async (request) => {
            const response = await cache.match(request);
            let size = 0;
            if (response) {
              const blob = await response.clone().blob();
              size = blob.size;
            }
            return {
              url: request.url,
              size,
            };
          })
        );

        // Sort by size descending
        entries.sort((a, b) => b.size - a.size);

        event.source.postMessage({
          type: "CACHE_ENTRIES",
          payload: { cacheType, entries },
        });
      } catch (error) {
        event.source.postMessage({
          type: "CACHE_ENTRIES_ERROR",
          payload: { error: error.message },
        });
      }
      break;
    }
  }
});

// ============================================================================
// Fetch Handler - Request Routing
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { method } = request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (method !== "GET") {
    return;
  }

  // Route 1: Book pages (handled by DownloadManager) - Check manual cache only, no SWR
  if (isBookPageRequest(url.href)) {
    event.respondWith(
      (async () => {
        // Check the manual books cache
        const booksCache = await caches.open(BOOKS_CACHE);
        const cached = await booksCache.match(request);
        if (cached) {
          return cached;
        }

        // Not in cache - fetch from network without caching
        // Book pages are large and should only be cached via manual download
        return fetch(request);
      })()
    );
    return;
  }

  // Route 2: Next.js RSC payloads → Stale-While-Revalidate
  if (isNextRSCRequest(request)) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, RSC_CACHE, {
        notifyOnChange: false,
      })
    );
    return;
  }

  // Route 3: Next.js static resources → Cache-First with ignoreSearch
  if (isNextStaticResource(url.href)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE, { ignoreSearch: true }));
    return;
  }

  // Route 4: API requests (JSON) → SWR with notification
  if (isApiRequest(url.href)) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, API_CACHE, {
        notifyOnChange: true,
        isJson: true,
      })
    );
    return;
  }

  // Route 5: Image requests (thumbnails, covers) → SWR with cache size management
  // Note: Book pages are excluded (Route 1) and only use manual download cache
  if (isImageRequest(url.href)) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, IMAGES_CACHE, {
        maxEntries: IMAGES_CACHE_MAX_ENTRIES,
      })
    );
    return;
  }

  // Route 6: Navigation → Network-First with SPA fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Route 7: Everything else → Network only (no caching)
});
