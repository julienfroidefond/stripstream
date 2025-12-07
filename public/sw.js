// StripStream Service Worker - Version 1
// Architecture: Cache-as-you-go for images and static resources only
// API data caching is handled by ServerCacheService on the server

const VERSION = "v1";
const STATIC_CACHE = `stripstream-static-${VERSION}`;
const IMAGES_CACHE = `stripstream-images-${VERSION}`;
const DATA_CACHE = `stripstream-data-${VERSION}`;
const RSC_CACHE = `stripstream-rsc-${VERSION}`;
const BOOKS_CACHE = "stripstream-books"; // Never version this - managed by DownloadManager

const OFFLINE_PAGE = "/offline.html";
const PRECACHE_ASSETS = [OFFLINE_PAGE, "/manifest.json"];

// ============================================================================
// Utility Functions - Request Detection
// ============================================================================

function isNextStaticResource(url) {
  return url.includes("/_next/static/");
}

function isImageRequest(url) {
  return url.includes("/api/komga/images/");
}

function isApiDataRequest(url) {
  return url.includes("/api/komga/") && !isImageRequest(url);
}

function isNextRSCRequest(request) {
  const url = new URL(request.url);
  return url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
}

// Removed: shouldCacheApiData - API data is no longer cached by SW
// API data caching is handled by ServerCacheService on the server

// ============================================================================
// Cache Strategies
// ============================================================================

/**
 * Cache-First: Serve from cache, fallback to network
 * Used for: Images, Next.js static resources
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
 * Used for: API data, RSC payloads
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start network request (don't await)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

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
 * Navigation Strategy: Network-First with SPA fallback
 * Used for: Page navigations
 */
async function navigationStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);

  try {
    // Try network first
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
      const cachesToDelete = cacheNames.filter(
        (name) =>
          name.startsWith("stripstream-") && name !== BOOKS_CACHE && !name.endsWith(`-${VERSION}`)
      );

      await Promise.all(cachesToDelete.map((name) => caches.delete(name)));

      if (cachesToDelete.length > 0) {
        // eslint-disable-next-line no-console
        console.log("[SW] Deleted old caches:", cachesToDelete);
      }

      await self.clients.claim();
      // eslint-disable-next-line no-console
      console.log("[SW] Activated and claimed clients");
    })()
  );
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

  // Route 1: Images → Cache-First with ignoreSearch
  if (isImageRequest(url.href)) {
    event.respondWith(cacheFirstStrategy(request, IMAGES_CACHE, { ignoreSearch: true }));
    return;
  }

  // Route 2: Next.js RSC payloads → Stale-While-Revalidate
  if (isNextRSCRequest(request)) {
    event.respondWith(staleWhileRevalidateStrategy(request, RSC_CACHE));
    return;
  }

  // Route 3: API data → Network only (no SW caching)
  // API data caching is handled by ServerCacheService on the server
  // This avoids double caching and simplifies cache invalidation
  if (isApiDataRequest(url.href)) {
    // Let the request pass through to the network
    // ServerCacheService will handle caching server-side
    return;
  }

  // Route 4: Next.js static resources → Cache-First with ignoreSearch
  if (isNextStaticResource(url.href)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE, { ignoreSearch: true }));
    return;
  }

  // Route 5: Navigation → Network-First with SPA fallback
  if (request.mode === "navigate") {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Route 6: Everything else → Network only (no caching)
  // This includes: API auth, preferences, and other dynamic content
});
