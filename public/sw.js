// StripStream Service Worker - v3.1
// Strategy: static assets + images only. HTML/RSC are never cached to prevent stale-page white screens.

// Bump this when a deployed client bundle must no longer be served from the
// static cache (for example after a reader layout correction).
const VERSION = "v3.1";
const STATIC_CACHE = `stripstream-static-${VERSION}`;
const IMAGES_CACHE = `stripstream-images-${VERSION}`;
const BOOKS_CACHE = "stripstream-books"; // Never version — managed by DownloadManager

const OFFLINE_PAGE = "/offline.html";
const IMAGES_CACHE_MAX_ENTRIES = 500;

// ============================================================================
// Request Detection
// ============================================================================

function isNextStaticResource(url) {
  return url.includes("/_next/static/");
}

function isImageRequest(url) {
  return url.includes("/api/komga/images/") || url.includes("/api/stripstream/images/");
}

function isBookPageRequest(url) {
  return (
    (url.includes("/api/komga/images/books/") || url.includes("/api/komga/books/")) &&
    url.includes("/pages/")
  );
}

function shouldCacheResponse(response) {
  if (!response || !response.ok) return false;
  const cacheControl = response.headers.get("Cache-Control") || "";
  return !/no-store|private/i.test(cacheControl);
}

async function getOfflineFallbackResponse() {
  const staticCache = await caches.open(STATIC_CACHE);
  const offlinePage = await staticCache.match(OFFLINE_PAGE);
  if (offlinePage) return offlinePage;
  return createInlineOfflineResponse();
}

function createInlineOfflineResponse() {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Hors ligne - StripStream</title><style>:root{--bg:#060b16;--panel:rgba(15,23,42,.72);--panel-strong:rgba(15,23,42,.9);--line:rgba(99,102,241,.28);--text:#e2e8f0;--muted:#94a3b8;--primary:#4f46e5;--primary-2:#06b6d4}*{box-sizing:border-box}body{margin:0;padding:0;font-family:"Segoe UI","SF Pro Text",-apple-system,BlinkMacSystemFont,sans-serif;background:radial-gradient(78% 45% at 0% 0%,rgba(79,70,229,.28),transparent 60%),radial-gradient(52% 35% at 100% 8%,rgba(6,182,212,.22),transparent 65%),radial-gradient(40% 26% at 54% 100%,rgba(236,72,153,.17),transparent 72%),var(--bg);color:var(--text);min-height:100vh}.header{position:sticky;top:0;z-index:20;height:64px;border-bottom:1px solid var(--line);background:rgba(6,11,22,.75);backdrop-filter:blur(10px)}.header-inner{height:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0 1rem}.brand{display:flex;align-items:center;gap:.75rem}.menu-btn{width:2.25rem;height:2.25rem;border-radius:999px;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.6);color:var(--text);font-size:1rem}.brand-title{font-size:1.05rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;background:linear-gradient(90deg,var(--primary),var(--primary-2),#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent}.brand-subtitle{font-size:.6rem;text-transform:uppercase;letter-spacing:.25em;color:rgba(226,232,240,.75);margin-top:.2rem}.pill{display:inline-flex;align-items:center;border-radius:999px;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.62);color:var(--muted);padding:.45rem .7rem;font-size:.78rem}.layout{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:calc(100vh - 64px)}.sidebar{border-right:1px solid var(--line);background:var(--panel);backdrop-filter:blur(10px);padding:1rem}.section{border:1px solid rgba(148,163,184,.25);background:rgba(15,23,42,.4);border-radius:.9rem;padding:.7rem;margin-bottom:.8rem}.section h2{margin:.25rem .45rem .6rem;font-size:.67rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(148,163,184,.95)}.nav-link{appearance:none;width:100%;border:1px solid transparent;border-radius:.65rem;background:transparent;color:var(--text);text-align:left;padding:.62rem .78rem;margin:.14rem 0;font-size:.93rem}.nav-link.active{border-color:rgba(79,70,229,.45);background:rgba(79,70,229,.16)}.main{display:flex;align-items:center;justify-content:center;padding:1.5rem}.card{width:min(720px,100%);border:1px solid rgba(148,163,184,.3);border-radius:1.2rem;background:var(--panel-strong);box-shadow:0 25px 60px -35px rgba(2,6,23,.92);padding:1.5rem}.status{display:inline-flex;align-items:center;gap:.45rem;color:#fecaca;background:rgba(127,29,29,.3);border:1px solid rgba(248,113,113,.35);border-radius:999px;padding:.35rem .7rem;font-size:.82rem;margin-bottom:1rem}h1{margin:0 0 .7rem;font-size:clamp(1.35rem,2.4vw,1.95rem);line-height:1.24}p{margin:0;color:var(--muted);line-height:1.6}.actions{display:flex;gap:.7rem;margin-top:1.35rem}.btn{appearance:none;border:1px solid transparent;border-radius:.65rem;padding:.7rem 1rem;font-size:.9rem;cursor:pointer}.btn-primary{background:var(--primary);color:#fff}.btn-secondary{background:rgba(15,23,42,.45);border-color:rgba(148,163,184,.35);color:var(--text)}.hint{margin-top:1rem;font-size:.82rem;color:rgba(148,163,184,.95)}@media (max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}.main{min-height:calc(100vh - 64px);padding:1rem}.actions{flex-direction:column}}</style></head><body><header class="header"><div class="header-inner"><div class="brand"><button class="menu-btn" type="button" aria-label="Menu">☰</button><img src="/images/logostripstream.png" alt="StripStream logo" style="width:38px;height:38px;border-radius:8px;object-fit:cover;border:1px solid rgba(148,163,184,.35);box-shadow:0 0 18px rgba(34,211,238,.35)"/><div><div class="brand-title">StripStream</div><div class="brand-subtitle">comic reader</div></div></div><span class="pill">Mode hors ligne</span></div></header><div class="layout"><aside class="sidebar"><div class="section"><h2>Navigation</h2><button class="nav-link active" type="button">Accueil</button><button class="nav-link" type="button">Telechargements</button></div><div class="section"><h2>Compte</h2><button class="nav-link" type="button">Mon compte</button><button class="nav-link" type="button">Preferences</button></div></aside><main class="main"><div class="card"><div class="status">● Hors ligne</div><h1>Cette page n'est pas disponible hors ligne.</h1><p>Reconnecte-toi pour continuer la lecture. Les livres telechargés restent accessibles depuis l'ecran de telechargements.</p><div class="actions"><button class="btn btn-primary" onclick="window.location.reload()">Reessayer</button><button class="btn btn-secondary" onclick="window.history.back()">Retour</button></div></div></main></div><script>window.addEventListener("online",()=>{window.location.reload()})</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

// ============================================================================
// Client Communication
// ============================================================================

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage(message));
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
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// ============================================================================
// Cache Strategies
// ============================================================================

async function cacheFirstStrategy(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, options);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (options.ignoreSearch) {
      const fallback = await cache.match(request, { ignoreSearch: false });
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (shouldCacheResponse(response)) {
        await cache.put(request, response.clone());
        if (options.maxEntries) trimCache(cacheName, options.maxEntries);
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await fetchPromise;
  if (response) return response;

  throw new Error("Network failed and no cache available");
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
        await cache.add(OFFLINE_PAGE);
        await cache.add("/manifest.json");
      } catch (error) {
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
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE, IMAGES_CACHE, BOOKS_CACHE];
      const toDelete = cacheNames.filter(
        (name) => name.startsWith("stripstream-") && !currentCaches.includes(name)
      );
      await Promise.all(toDelete.map((name) => caches.delete(name)));
      if (toDelete.length > 0) {
        // eslint-disable-next-line no-console
        console.log("[SW] Deleted old caches:", toDelete);
      }
      await self.clients.claim();
      notifyClients({ type: "SW_ACTIVATED", version: VERSION });
    })()
  );
});

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener("message", async (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "GET_CACHE_STATS": {
      try {
        const [staticSize, imagesSize, booksSize] = await Promise.all([
          getCacheSize(STATIC_CACHE),
          getCacheSize(IMAGES_CACHE),
          getCacheSize(BOOKS_CACHE),
        ]);
        const [staticCache, imagesCache, booksCache] = await Promise.all([
          caches.open(STATIC_CACHE),
          caches.open(IMAGES_CACHE),
          caches.open(BOOKS_CACHE),
        ]);
        const [staticKeys, imagesKeys, booksKeys] = await Promise.all([
          staticCache.keys(),
          imagesCache.keys(),
          booksCache.keys(),
        ]);
        event.source.postMessage({
          type: "CACHE_STATS",
          payload: {
            static: { size: staticSize, entries: staticKeys.length },
            images: { size: imagesSize, entries: imagesKeys.length },
            books: { size: booksSize, entries: booksKeys.length },
            total: staticSize + imagesSize + booksSize,
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
        if (cacheType === "all" || cacheType === "static") cachesToClear.push(STATIC_CACHE);
        if (cacheType === "all" || cacheType === "images") cachesToClear.push(IMAGES_CACHE);
        // BOOKS_CACHE is never cleared here — managed by DownloadManager

        await Promise.all(
          cachesToClear.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            await Promise.all(keys.map((key) => cache.delete(key)));
          })
        );
        event.source.postMessage({ type: "CACHE_CLEARED", payload: { caches: cachesToClear } });
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
      event.source.postMessage({ type: "SW_VERSION", payload: { version: VERSION } });
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
            return { url: request.url, size };
          })
        );
        entries.sort((a, b) => b.size - a.size);
        event.source.postMessage({ type: "CACHE_ENTRIES", payload: { cacheType, entries } });
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
// Fetch Handler
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Route 1: Book pages → manual cache only (DownloadManager), never auto-cache
  if (isBookPageRequest(url.href)) {
    event.respondWith(
      (async () => {
        const booksCache = await caches.open(BOOKS_CACHE);
        const cached = await booksCache.match(request);
        if (cached) return cached;
        return fetch(request);
      })()
    );
    return;
  }

  // Route 2: Next.js static resources → cache-first (content-addressed, safe)
  if (isNextStaticResource(url.href)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE, { ignoreSearch: true }));
    return;
  }

  // Route 3: Images (thumbnails, covers) → stale-while-revalidate
  if (isImageRequest(url.href)) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, IMAGES_CACHE, {
        maxEntries: IMAGES_CACHE_MAX_ENTRIES,
      })
    );
    return;
  }

  // Route 4: Navigation → network only, offline fallback if network fails
  // HTML and RSC payloads are intentionally NOT cached to avoid stale-page white screens after deploys.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => getOfflineFallbackResponse()));
    return;
  }

  // Everything else → network only
});
