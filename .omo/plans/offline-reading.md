# offline-reading - Work Plan

## TL;DR (For humans)

**What you'll get**
Reading offline actually works again: install the PWA, tap download on a book, and read every page
with no network on both Komga and Stripstream — including after an app restart. Plus a `/downloads`
manager, an offline indicator on covers, storage controls in Settings, and a service worker that
survives deploys without white screens.

**Why this approach**
The old hand-written service worker was removed (commit `861d5bc`) after hazards: cached RSC caused
deploy white-screens (`5650d98`), the offline cache leaked across accounts (`6abd57a`), and status
polling was costly (`8a1c81d`). We therefore do NOT restore it verbatim. We use **Serwist in
configurator mode** (bundler-agnostic, works with Next 16 Turbopack) but with a **curated runtime
cache** — NOT `defaultCache`, whose RSC/HTML routes reintroduce the white-screen hazard — and we
version every runtime cache so a deploy can never serve the previous build's payloads. The book cache
is scoped per user/config and lives behind an `X-Offline-Scope` request header the reader actually
sends. The removed UI/logic is recovered from `861d5bc^` as reference and modernized.

**What it will NOT do**
No IndexedDB, no server-side zip download (`fflate`), no EPUB/PDF support, no restore of the dead
`useCacheUpdate` hook, no 5s polling, no auto-download of whole libraries. `blob:` URLs are still not
service-worker interceptable; caching happens at the reader's network `fetch`, which is where pages load.

**Effort / Risk**
Large (architecture-scale): 19 implementation todos across 4 waves + 4 final verifiers.
Top risks: (1) stale-RSC white screen after deploy → mitigated by build-versioned runtime caches +
`cleanupOutdatedCaches` + a `SKIP_WAITING` reload prompt; (2) Cache Storage quota on iOS → quota
handling + per-book size guard; (3) the `serwist build` step must run with the same `NEXT_DIST_DIR`
as `next build` (including `.next-e2e`), or the served SW is stale.

**Decisions I made for you**
- I treated this as open-ended and chose defaults; if you had a specific outcome in mind, say so and I
  will switch to asking. Defaults: Serwist configurator mode; curated runtime caching (no `defaultCache`);
  Cache Storage (not IndexedDB); per-book downloads; per-user/config scoping via `X-Offline-Scope`;
  active scope resolved from `getActiveConnection()` (cookie-based), not the legacy Prisma columns;
  event-driven status (no polling); per-page downloads (not the reverted zip path). All reversible.

## Scope

**In scope**
1. Service worker foundation: Serwist configurator setup, curated `src/sw.ts` (versioned runtime caches,
   no RSC/HTML SWR), `/~offline` route handler, registration, middleware + manifest updates, dev toggle,
   `SKIP_WAITING` reload flow.
2. Offline scope plumbing: server-computed scope from `getActiveConnection()`, threaded to the reader and
   download UI via `OfflineProvider`; one shared page-URL module used by both the reader and the downloader.
3. Download engine: per-book page download into Cache Storage, dual-provider URLs, progress, resume,
   explicit cancel, retry, delete, quota handling, route warming for offline-after-restart.
4. Book status store: scoped localStorage, event-driven, no polling.
5. UI: `/downloads` manager, per-book offline button, offline-only gating on covers/lists, Settings
   storage card, sidebar Downloads entry.
6. i18n (FR/EN), E2E coverage, docs reconciliation.

**Out of scope (guardrails, not reductions)**
- IndexedDB, `fflate`/zip server download, EPUB/PDF, `useCacheUpdate`, 5s polling, library-wide auto-download.
- Komga server-side book-file endpoint.
- `defaultCache`'s RSC/HTML (`pages*`) and `others` routes, and its opaque/cross-origin image routes.
- Precaching dynamic app routes that can go stale in unsafe ways (only versioned strategies allowed).

## Verification strategy

- No unit-test framework. Every change is gated by `pnpm lint && pnpm typecheck` (zero warnings).
- Playwright E2E is the executable proof. The offline journey MUST run against the production
  `.next-e2e` build (Playwright `webServer` runs `next start`; Serwist's dev-time behavior does not
  exercise the runtime cache, so offline assertions are only meaningful on a production build).
- Each todo lists an agent-executable acceptance check and a happy + failure QA scenario with an
  evidence path under `.omo/evidence/offline-reading/` (created in Todo 1).
- Final verification wave F1-F4 must all APPROVE before handoff; the user gives the final okay.
- Manual smoke via `pnpm dev` for the reader route in both themes/locales is required for UI todos.

## Execution strategy

Waves are dependency-ordered and self-contained: i18n (Todo 1) lands before any UI that consumes it.
Each todo ends in a focused Conventional Commit. `public/sw.js` stays generated and gitignored.
`pnpm lint && pnpm typecheck && pnpm build` must stay green after every wave; the E2E build path
(`NEXT_DIST_DIR=.next-e2e`) must run `serwist build serwist.config.mjs` too (Todo 16). The runtime cache version `SW_VERSION` is injected at build from the same `BUILD_ID`/revision that drives the precache manifest (`esbuildOptions.define` in Todo 2), so runtime caches rotate automatically on every deploy — there is no manual bump.

---

## Todos

### Wave 0 - Foundation

- [ ] 1. Add FR/EN i18n keys for offline, downloads and storage
  - References: `git show 861d5bc^:src/i18n/messages/en/common.json` and `.../fr/common.json` (removed `settings.cache.*`, `downloads.*`, `sidebar.navigation`, `sidebar.downloads`, `books.status.offline`); current `src/i18n/messages/{en,fr}/common.json`; `src/constants/errorCodes.ts` (`BOOK.DOWNLOAD_CANCELLED` L67), `src/constants/errorMessages.ts:70`; `src/hooks/useTranslate.ts`.
  - Work: create `.omo/evidence/offline-reading/`. Restore the removed blocks in both locales with identical structure; add keys for quota/storage, the offline badge, the per-book button, and the `/~offline` page. Keep the existing `settings.messages.configSaved` convention (do not reintroduce the en-only gap). Add `BOOK.DOWNLOAD_QUOTA_EXCEEDED` to `errorCodes.ts` + `errorMessages.ts` + both locales.
  - Acceptance: both JSON files parse; the new `settings.cache`/`downloads`/`offline` key-path sets are identical between en and fr; `.omo/evidence/offline-reading/` exists.
  - QA happy: run `node -e "const en=require('./src/i18n/messages/en/common.json'),fr=require('./src/i18n/messages/fr/common.json');const keys=o=>[];/* flatten and diff the three subtrees */"` (implement the flattener inline) and exit 0; capture to `.omo/evidence/offline-reading/task-1-i18n.md`.
  - QA failure: delete one `settings.cache` key from `fr/common.json`, re-run the checker, confirm it exits non-zero, restore; evidence `.omo/evidence/offline-reading/task-1-i18n-failure.md`.
  - Commit: `feat(i18n): add offline and downloads copy`

- [ ] 2. Add Serwist configurator-mode build wiring (deps, scripts, tsconfig, gitignore)
  - References: `package.json` (scripts L5-22 incl. `test:e2e` L15 and `test:e2e:build` L16, deps L24-73); `playwright.config.ts:10` (`e2eDistDir = ".next-e2e"`), `:87` (`next start` webServer), `:97` (`NEXT_DIST_DIR`); `next.config.js` (`distDir: process.env.NEXT_DIST_DIR || ".next"` L26, `output: standalone` L38, Turbopack rules L63-70); `tsconfig.json` (no `types` field today); `Dockerfile:20-21,36` (builder copies only tsconfig/eslint/next/tailwind/postcss, then runs `pnpm build`); `eslint.config.mjs:8-16` (`ignores` does not cover `public/**`); `docs/cache-debug.md`.
  - Work: add devDeps `@serwist/next@^9.5.12`, `@serwist/cli@^9.5.12`, `serwist@^9.5.12`, `esbuild`, and `concurrently` (current major, e.g. `^9`). Create **`serwist.config.mjs`** (must be `.mjs`: this repo is CommonJS and `@serwist/next/config` is ESM-only, so a `.js` file would throw `Unexpected token 'export'` when `read-config` does `await import(configFile)`), exporting `serwist({ swSrc: "src/sw.ts", swDest: "public/sw.js", precachePrerendered: false, additionalPrecacheEntries: [{ url: "/~offline", revision }], esbuildOptions: { define: { "process.env.SW_VERSION": JSON.stringify(revision) } } })` where `revision` is read from `${process.env.NEXT_DIST_DIR || ".next"}/BUILD_ID` (fallback `git rev-parse HEAD`, else `crypto.randomUUID()`), recomputed per build. The same `revision` drives both the precache entry and the runtime cache version so they cannot drift. Do NOT write custom `distDir` glob wiring — the configurator reads `next.config.js.distDir`, which already honors `NEXT_DIST_DIR`. Scripts (always pass the config file explicitly because it is `.mjs`): `dev` -> `concurrently -p none 'serwist build serwist.config.mjs --watch' 'next dev'`; `build` -> `next build && serwist build serwist.config.mjs`; change `test:e2e:build` to `NEXT_DIST_DIR=.next-e2e next build && NEXT_DIST_DIR=.next-e2e serwist build serwist.config.mjs` (do NOT invent an uncalled `build:e2e`). Add `/// <reference lib="webworker" />` locally in `src/sw.ts` (Todo 3) instead of tsconfig globals: do NOT add `"webworker"` to `lib` (conflicts with `dom`) and do NOT replace `compilerOptions.types` (dropping `@types/node` breaks the server code). Add `public/sw*` to `.gitignore`. Also create a MINIMAL valid `src/sw.ts` placeholder now, using Todo 3's exact prologue (`/// <reference lib="webworker" />`; `import { Serwist } from "serwist"`; `import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";`; `declare global { interface WorkerGlobalScope extends SerwistGlobalConfig { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined } }`; `declare const self: ServiceWorkerGlobalScope;` — the `declare const self` is REQUIRED or `self.__SW_MANIFEST` fails TS2339 because the `dom` lib types `self` as `Window & typeof globalThis`), then `new Serwist({ precacheEntries: self.__SW_MANIFEST, skipWaiting: false, clientsClaim: true }).addEventListeners()`. This keeps the Todo 2 commit green; Todo 3 replaces it with the curated implementation. Add `COPY serwist.config.mjs ./` to the Docker builder stage before `RUN pnpm build` (Dockerfile L20-21/L36) or `docker build` fails on the missing config. Add `"public/sw*"` to the `ignores` array in `eslint.config.mjs` (L8-16) so the generated minified SW is not linted.
  - Acceptance: `pnpm install` clean; `pnpm typecheck` passes with the existing `types`/`lib` untouched; `pnpm build` stays green and emits `public/sw.js` (gitignored) built from the `.next` build via the minimal placeholder `src/sw.ts` (Todo 3 replaces it); `NEXT_DIST_DIR=.next-e2e pnpm test:e2e:build` also emits a SW built from `.next-e2e`; `docker build` succeeds with the copied `serwist.config.mjs`; `pnpm lint` does not lint `public/sw.js`.
  - QA happy: run `pnpm build` then `node -e "const s=require('fs').readFileSync('public/sw.js','utf8'); if(!s.includes('precache')) throw new Error('no precache manifest'); console.log('ok', s.length)"` (the versioned runtime caches are asserted in Todo 3); capture to `.omo/evidence/offline-reading/task-2-build.md`.
  - QA failure: temporarily point `swSrc` at a non-existent file in `serwist.config.mjs` and confirm `serwist build serwist.config.mjs` exits non-zero with no stale `public/sw.js` emitted; restore; evidence `.omo/evidence/offline-reading/task-2-build-failure.md`.
  - Commit: `chore(pwa): wire serwist configurator build`

- [ ] 3. Implement `src/sw.ts` with curated, versioned runtime caching and the scoped book route
  - References: librarian Serwist findings (`Serwist`, `precacheOptions.cleanupOutdatedCaches`, `NetworkFirst`, `CacheFirst`, `NetworkOnly`, `ExpirationPlugin`, `fallbacks.entries`); prior SW behavior (`git show 861d5bc^:public/sw.js` v3.3: never cache HTML/RSC; `/_next/static` cache-first; book pages cache-first); `5650d98` (white-screen root cause); page routes `src/app/api/komga/images/books/[bookId]/pages/[pageNumber]/route.ts` and `src/app/api/stripstream/images/books/[bookId]/pages/[pageNumber]/route.ts`; page URL shape from `src/components/reader/hooks/useReaderState.ts:23-33`.
  - Work: create `src/sw.ts` starting with `/// <reference lib="webworker" />` and `declare global { interface WorkerGlobalScope extends SerwistGlobalConfig { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined } }`, `declare const self: ServiceWorkerGlobalScope`. Declare `declare const process: { env: { SW_VERSION?: string } };` and `const SW_VERSION = process.env.SW_VERSION ?? "dev";` — the value is injected by `esbuildOptions.define` (Todo 2), so runtime caches rotate automatically on every build; there is no manual bump. Define versioned cache names `stripstream-pages-${SW_VERSION}`, `stripstream-static-${SW_VERSION}`. Build `runtimeCaching` EXPLICITLY (do NOT spread `defaultCache`):
    1. **Scoped book pages** (first): matcher = same-origin GET whose pathname contains `/images/books/` and `/pages/`; handler function: read `X-Offline-Scope`; if absent return `fetch(request)` (never cache); else open `stripstream-books:${scope}`, return `cache.match(request)` on hit, else `fetch(request)` (network response is NOT stored here — only downloads populate the cache).
    2. **Hashed static**: matcher `/_next/static/`; `CacheFirst` with `stripstream-static-${SW_VERSION}` + `ExpirationPlugin({ maxEntries: 256, maxAgeSeconds: 30d })`.
    3. **Navigations + RSC**: matcher same-origin and (`request.mode === "navigate" || request.headers.get("RSC") === "1" || pathname === "/downloads" || pathname.startsWith("/books/")`); `NetworkFirst` with `stripstream-pages-${SW_VERSION}` + `ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7d })` — NetworkFirst (never SWR) plus a versioned cache is the guard against the `5650d98` failure.
    4. **Everything else same-origin non-`/api/`**: `NetworkOnly` (no opaque/API caching).
    Construct `new Serwist({ precacheEntries: self.__SW_MANIFEST, skipWaiting: false, clientsClaim: true, navigationPreload: true, precacheOptions: { cleanupOutdatedCaches: true }, runtimeCaching, fallbacks: { entries: [{ url: "/~offline", matcher: ({request}) => request.destination === "document" || request.mode === "navigate" }] } })`. Add an `activate` listener that deletes `stripstream-static-*` and `stripstream-pages-*` caches whose suffix !== `SW_VERSION` while preserving all `stripstream-books:*` (user downloads must survive SW upgrades). Add a `message` listener for `GET_CACHE_STATS`, `GET_CACHE_ENTRIES`, `CLEAR_CACHE`, `GET_VERSION` (Serwist registers the `SKIP_WAITING` listener itself because `skipWaiting` is false). Call `serwist.addEventListeners()`.
  - Acceptance: `pnpm typecheck` passes with the local webworker reference and no tsconfig `webworker`/`types` edits; `pnpm build` bundles the SW; `grep` proves there is NO `CacheFirst`/`StaleWhileRevalidate` on any RSC/HTML path and NO import of `defaultCache`.
  - QA happy: build, then `grep -E 'stripstream-pages-|stripstream-books:|X-Offline-Scope|cleanupOutdatedCaches' public/sw.js` returns matches, and `grep -c 'defaultCache' public/sw.js` returns 0; evidence `.omo/evidence/offline-reading/task-3-sw.md`.
  - QA failure: `grep -E 'CacheFirst|StaleWhileRevalidate' public/sw.js` must not be associated with `/pages` or RSC/document matching (run a targeted Node assertion over the emitted routes); if an RSC/HTML cache strategy is present, fail; evidence `.omo/evidence/offline-reading/task-3-sw-failure.md`.
  - Commit: `feat(pwa): add curated versioned service worker`

- [ ] 4. Add the `/~offline` route handler, Serwist registration, and middleware/manifest updates
  - References: `src/app/layout.tsx` (uses `cookies()`/`getCurrentUser()` and DB sidebar components, so pages under it are dynamic); `src/middleware.ts` (public routes L5, matcher L82-94 — it currently matches `/sw.js`); `public/manifest.json` (no `scope`/`id`); `git show 861d5bc^:public/offline.html` (copy/UX reference); `git show 861d5bc^:src/lib/registerSW.ts` (dev-toggle semantics); `src/components/layout/ClientLayout.tsx:208-210`.
  - Work: create `src/app/~offline/route.ts` (NOT a page under the dynamic root layout) returning a self-contained HTML `Response` (`Content-Type: text/html`, `export const dynamic = "force-static"`) with retry/back buttons and FR/EN copy. Add `"/~offline"` and `"/sw.js"` to the middleware bypass so neither is auth-redirected and `/sw.js` is served early-return. Add `scope: "/"` and `id` to `public/manifest.json`. Create `src/components/providers/ServiceWorkerRegistrar.tsx` (client) that wraps children in `SerwistProvider` from `@serwist/next/react` (provider wraps the app; it is not a leaf) with `swUrl="/sw.js"`, plus a **runtime** localStorage gate `stripstream:sw-enabled` (the recovered `registerSW.ts` semantics) so Playwright can seed it per-spec — do NOT rely on `NEXT_PUBLIC_SW_ENABLED` (inlined at build, cannot change for a prebuilt `next start`). Mount it in `src/components/layout/ClientLayout.tsx` around the existing tree near L208-210. Keep `AuthProvider` offline tolerance.
  - Acceptance: `pnpm typecheck` passes; unauthenticated requests to `/sw.js` and `/~offline` are NOT redirected to `/login`; `/~offline` is in the SW precache after build.
  - QA happy: authenticated `request.get("/sw.js")` -> 200 JS content-type and `request.get("/~offline")` -> 200 HTML; evidence `.omo/evidence/offline-reading/task-4-registration.md`.
  - QA failure: unauthenticated `request.get("/sw.js")` must not 302 to `/login`; evidence `.omo/evidence/offline-reading/task-4-registration-failure.md`.
  - Commit: `feat(pwa): register service worker and offline fallback`

### Wave 1 - Offline scope and download engine

- [ ] 5. Add the server offline-scope helper and `OfflineProvider` hydration
  - References: `src/lib/active-connection.ts:24-67` (`getActiveConnection(userId)` reads cookies, NOT the legacy Prisma `activeProvider`/`active*ConfigId` columns); `src/lib/providers/provider.factory.ts:8-44`; `src/lib/auth-utils.ts` (`getCurrentUser`); `src/app/layout.tsx:73-81,108-126`; `prisma/schema.prisma` (legacy User columns L19-21 are NOT the source of truth).
  - Work: create `src/lib/offline/offline-scope.ts` exporting `getOfflineScope(): Promise<string | null>` that calls `getCurrentUser()`, then `getActiveConnection(userId)` and returns `u{userId}:{provider}:{configId ?? "none"}`, or `null` when anonymous. Create `src/contexts/OfflineContext.tsx` (`"use client"`) exposing `{ scope, isOnline }` plus the status-store accessors from Todo 8. In `src/app/layout.tsx`, compute the scope server-side (once) and wrap the provider tree in `<OfflineProvider scope={scope}>`. The reader root (`src/components/reader/BookReader.tsx` or `ClientBookPage.tsx`) MUST render `data-offline-scope={scope ?? undefined}` on an existing container element (no extra layout node) so the QA can observe it; when scope is null the attribute is omitted. Do NOT modify `getReaderData(provider, bookId)` — the reader page/component reads scope from `OfflineProvider`.
  - Acceptance: `pnpm typecheck` passes; scope is derived from cookies (change the active-connection cookie and the scope changes); anonymous users get `null`.
  - QA happy: render the reader for an authenticated user and assert the reader root exposes `data-offline-scope` matching `^u\d+:(komga|stripstream):`; switching the active connection changes the attribute; evidence `.omo/evidence/offline-reading/task-5-scope.md`.
  - QA failure: anonymous mode renders no `data-offline-scope` and no download UI; evidence `.omo/evidence/offline-reading/task-5-scope-failure.md`.
  - Commit: `feat(offline): add cookie-based offline scope`

- [ ] 6. Centralize page URLs and send `X-Offline-Scope` from the reader
  - References: `src/components/reader/hooks/useReaderState.ts:23-33` (`book.thumbnailUrl.replace("/thumbnail", "/pages/N")`); `src/components/reader/hooks/useImageLoader.ts:162-174` (`fetch(url, { cache: "default", signal })` — no header today); `src/components/reader/hooks/useImageLoader.ts:338-365` (`prefetchNextBook`); `src/app/books/[bookId]/page.tsx`.
  - Work: create `src/lib/offline/book-pages.ts` exporting `bookPageUrl(book, pageNumber)` (single source of truth; supports `/api/komga/` and `/api/stripstream/` thumbnail prefixes) and `bookPageUrls(book)`. Update `useReaderState` to use `bookPageUrl` and to read `scope` from `useOfflineContext()`, passing it to `useImageLoader`. In `useImageLoader`, add `headers: { "X-Offline-Scope": scope }` to BOTH the current-book and next-book `fetch` calls (only when `scope` is non-null). Note: `useThumbnails` renders direct `<img>` with no header — offline thumbnails may miss; that is acceptable and documented.
  - Acceptance: `pnpm typecheck` passes; reader page requests carry the header (verified in Playwright request interception); no duplicated `replace("/thumbnail", ...)` remains outside `book-pages.ts`.
  - QA happy: intercept `/api/**/pages/**` during reader navigation and assert every request has `x-offline-scope`; evidence `.omo/evidence/offline-reading/task-6-reader-header.md`.
  - QA failure: with the offline book cache emptied and network offline, a reader page request returns the SW's network failure instead of a false cache hit (no unscoped `apis` cache serves it); evidence `.omo/evidence/offline-reading/task-6-reader-header-failure.md`.
  - Commit: `refactor(reader): centralize page urls and send offline scope`

- [ ] 7. Implement the client book-download service (Cache Storage, dual-provider, resumable, cancelable)
  - References: `git show 861d5bc^:src/components/ui/book-offline-button.tsx` (retry/resume logic); `git show 861d5bc^:src/hooks/useBookOfflineStatus.ts`; `src/lib/offline/book-pages.ts` (Todo 6); `src/lib/reader/getReaderData.ts:94`; `src/constants/errorCodes.ts` + `errorMessages.ts` (Todo 1 adds `DOWNLOAD_QUOTA_EXCEEDED`); page routes above.
  - Work: create `src/lib/offline/book-download.service.ts` (client-only). APIs and explicit semantics:
    - `downloadBook(book, scope, { onProgress, signal })`: open `stripstream-books:${scope}`, fetch each page with `{ headers: { "X-Offline-Scope": scope }, credentials: "same-origin" }`, concurrency 4, retry `[800,1600]`, skip already-cached pages (resume). For each `ok` response, `await cache.put(new Request(new URL(bookPageUrl(book, n), location.origin)), response.clone())` — this downloader is the ONLY writer of the scoped cache (the SW route itself never stores network responses); reject non-`ok` responses without caching. Write the marker key `${bookPageUrl(book, 1).replace(/\/\d+$/, "")}` (i.e. `.../pages`) with a JSON `{count}`. Do NOT send a custom warm message: offline-after-restart relies on the SW navigation/RSC `NetworkFirst` route (`stripstream-pages-${SW_VERSION}`), which `SerwistProvider` populates via its default `cacheOnNavigation` when the book page is opened online — so the E2E must reopen via a document navigation (`page.goto`/`reload`), not a client-side cover click. (The SW fetch route reads the scope from the header; the downloader writes the unscoped URL key, which is safe because matching ignores headers when no `Vary` is set.)
    - Network error / offline mid-download: KEEP already-cached pages and persist `lastDownloadedPage` so a later `downloadBook` resumes.
    - `cancelDownload(book, scope)`: abort in-flight work AND delete any partial pages for that book, reset status to `idle` (explicit; this is distinct from the error path).
    - `deleteBook(bookId, scope)`: delete marker + all `/pages/{n}` entries.
    - `isBookDownloaded(bookId, scope)`, `getBookCacheSize(bookId, scope)`, `getAllBookCaches()`.
    - Guard `navigator.storage.estimate()` and catch `QuotaExceededError` -> `AppError(ERROR_CODES.BOOK.DOWNLOAD_QUOTA_EXCEEDED)`.
  - Acceptance: `pnpm typecheck` passes; a Playwright evaluation of a 10-page fixture download finds 11 cache entries + marker; `cancelDownload` removes partials.
  - QA happy: download the fixture book and assert `caches.open(...).keys()` length is 11 and the status is `available`; evidence `.omo/evidence/offline-reading/task-7-download.md`.
  - QA failure: switch offline after page 5 -> status `error`, `lastDownloadedPage` persisted, resume continues from page 6; separately call `cancelDownload` -> all partial pages removed and status `idle`; evidence `.omo/evidence/offline-reading/task-7-download-failure.md`.
  - Commit: `feat(offline): add cache-storage book download service`

- [ ] 8. Build the event-driven book status store and `useBookOfflineStatus`
  - References: `git show 861d5bc^:src/hooks/useBookOfflineStatus.ts` (5s polling to remove); `src/hooks/useNetworkStatus.ts` (exists at HEAD); `src/contexts/OfflineContext.tsx` (Todo 5).
  - Work: create `src/lib/offline/book-status.store.ts` with scoped localStorage key `stripstream:book-status:{scope}:{bookId}` shape `{ status: "idle"|"downloading"|"available"|"error", progress, timestamp, lastDownloadedPage? }`; emit `window.dispatchEvent(new CustomEvent("stripstream:download-status", { detail }))` on every mutation. Implement `useBookOfflineStatus(bookId)` reading the store + `useOfflineContext()`, checking `isBookDownloaded` once on mount, and subscribing to the custom event — NO `setInterval`. Return `{ status, progress, isAvailableOffline, isChecking, isOnline, isAccessible }`. Implement `useDownloadedBooks()` enumerating the scoped localStorage keys.
  - Acceptance: `pnpm typecheck` passes; `grep -n "setInterval" src/hooks/useBookOfflineStatus.ts` returns nothing.
  - QA happy: download a book and assert the cover badge flips to available without a reload; evidence `.omo/evidence/offline-reading/task-8-status.md`.
  - QA failure: clear the book cache externally, dispatch `stripstream:download-status`, assert the badge flips back within one event tick; evidence `.omo/evidence/offline-reading/task-8-status-failure.md`.
  - Commit: `feat(offline): add event-driven book offline status`

- [ ] 9. Add the `BookOfflineButton` component for both providers
  - References: `git show 861d5bc^:src/components/ui/book-offline-button.tsx`; `src/lib/providers/types.ts` (`NormalizedBook`); `src/components/ui/button.tsx`, `src/components/ui/progress.tsx`; `src/contexts/OfflineContext.tsx`; the service (Todo 7) and store (Todo 8).
  - Work: create `src/components/ui/book-offline-button.tsx` (client) with props `{ book: NormalizedBook; className?: string }`. Reads `scope` from `useOfflineContext()`; states download / downloading (progress) / available (delete) / error (retry); a separate cancel affordance calls `cancelDownload`. Disabled when `scope === null`. Accessibility (`aria-label`, tooltip). Uses i18n keys from Todo 1.
  - Acceptance: `pnpm typecheck` passes; hidden for anonymous; works for both `/api/komga/` and `/api/stripstream/` `thumbnailUrl` prefixes.
  - QA happy: Playwright downloads a Komga fixture and a Stripstream fixture book; both reach available; evidence `.omo/evidence/offline-reading/task-9-button.md`.
  - QA failure: cancel mid-download and assert partial cache cleaned up + status `idle`; evidence `.omo/evidence/offline-reading/task-9-button-failure.md`.
  - Commit: `feat(offline): add per-book offline download button`

### Wave 2 - UI surfaces

- [ ] 10. Add the `/downloads` manager page and skeleton
  - References: `git show 861d5bc^:src/components/downloads/DownloadManager.tsx`, `git show 861d5bc^:src/app/downloads/page.tsx`, `git show 861d5bc^:src/app/downloads/loading.tsx`, `git show 861d5bc^:src/components/skeletons/RouteSkeletons.tsx` (`DownloadsSkeleton`); `src/app/actions/books.ts` (`getBookData`); `src/components/ui/tabs.tsx`, `card.tsx`, `progress.tsx`.
  - Work: restore `src/components/downloads/DownloadManager.tsx` modernized to `useDownloadedBooks()` + the status store (no direct localStorage key iteration), tabs all/downloading/available/error, retry-all, delete, per-book `BookOfflineButton`. Add `src/app/downloads/page.tsx` (`export const dynamic = "force-dynamic"`) and `src/app/downloads/loading.tsx`; restore `DownloadsSkeleton`. Show aggregate storage from `navigator.storage.estimate()`.
  - Acceptance: `pnpm typecheck` passes; `/downloads` renders an empty state for a fresh user; download/delete round-trips.
  - QA happy: download a fixture book, open `/downloads`, assert the card, delete it, assert it disappears; evidence `.omo/evidence/offline-reading/task-10-downloads-page.md`.
  - QA failure: open `/downloads` while offline with a previously downloaded book and assert the list still renders (RSC served from the versioned pages cache); evidence `.omo/evidence/offline-reading/task-10-downloads-failure.md`.
  - Commit: `feat(offline): add downloads manager page`

- [ ] 11. Restore the sidebar Navigation section with a Downloads entry
  - References: `git show 861d5bc^:src/components/layout/Sidebar.tsx` (removed `mainNavItems`/Navigation section); `src/components/layout/Sidebar.tsx` at HEAD; `src/i18n/messages/{en,fr}/common.json` (`sidebar.*`).
  - Work: re-add the "Navigation" section with Home and Downloads (`/downloads`) using the existing `NavButton` and the `Download` lucide icon; leave the rest unchanged.
  - Acceptance: `pnpm lint && pnpm typecheck` pass; the link routes to `/downloads` and highlights active.
  - QA happy: open the sidebar, click Downloads, assert URL `/downloads`; evidence `.omo/evidence/offline-reading/task-11-sidebar.md`.
  - QA failure: anonymous cannot reach `/downloads` via URL (middleware redirects to `/login`); evidence `.omo/evidence/offline-reading/task-11-sidebar-failure.md`.
  - Commit: `feat(offline): add downloads entry to sidebar`

- [ ] 12. Restore offline-only gating on covers and lists
  - References: `git show 861d5bc^:src/components/home/MediaRow.tsx`, `.../series/BookGrid.tsx`, `.../series/BookList.tsx`, `.../ui/book-cover.tsx`, `.../ui/cover-utils.tsx`; HEAD versions of the same files; `useBookOfflineStatus` (Todo 8).
  - Work: re-add `offlineStatus` to `BookCoverProps` and render a non-blocking "Indisponible hors ligne" badge. In `MediaRow`, `BookGrid`, `BookList`, block navigation ONLY when `!isOnline && !isAvailableOffline`; use `cursor-not-allowed` only then (never when online). Re-add `<BookOfflineButton>` where the old code had it (BookList, book-cover controls). Do not dim covers merely for being undownloaded while online.
  - Acceptance: `pnpm typecheck` passes; online every book is clickable; offline only downloaded books are clickable.
  - QA happy: online, open a non-downloaded book from the grid; evidence `.omo/evidence/offline-reading/task-12-gating.md`.
  - QA failure: offline, attempt a non-downloaded book and assert navigation is blocked with the badge; evidence `.omo/evidence/offline-reading/task-12-gating-failure.md`.
  - Commit: `feat(offline): gate book access only when offline and not downloaded`

- [ ] 13. Add the Settings storage/offline card
  - References: `git show 861d5bc^:src/components/settings/CacheSettings.tsx`; `src/components/settings/ClientSettings.tsx` (tab storage key L22, tabs L54-86); `src/components/settings/AdvancedSettings.tsx`; the store (Todo 8) and service (Todo 7).
  - Work: create `src/components/settings/OfflineSettings.tsx` (client): SW supported/ready/version, dev toggle (runtime localStorage gate), total storage used, per-scope downloaded count/size, "clear static cache", "clear all downloads (current scope only)", "reinstall service worker", and a reload prompt when a new version is waiting (`SKIP_WAITING` message). Wire into `ClientSettings.tsx` inside the existing Advanced/Connection tab (or add a 4th `offline` tab persisted with `SETTINGS_TAB_STORAGE_KEY`).
  - Acceptance: `pnpm typecheck` passes; clearing downloads empties only `stripstream-books:{currentScope}` and resets only current-scope status keys.
  - QA happy: two scopes downloaded; clearing scope A leaves scope B intact; evidence `.omo/evidence/offline-reading/task-13-settings.md`.
  - QA failure: reinstall and assert exactly one SW registration for `/sw.js` scope `/`; evidence `.omo/evidence/offline-reading/task-13-settings-failure.md`.
  - Commit: `feat(offline): add storage and service worker settings`

### Wave 3 - Integration, tests, docs

- [ ] 14. Extend PWA + access-control E2E specs
  - References: `tests/public/pwa.spec.ts` (manifest-only at HEAD; the SW/offline test was removed in `861d5bc`); `tests/public/access-control.spec.ts` (removed `/downloads`); `tests/README.md`; `playwright.config.ts:9` (`E2E_SERVER_MODE`, production by default).
  - Work: in `tests/public/pwa.spec.ts` add a test titled `"serves the service worker and offline fallback"` asserting `/manifest.json` has `scope`, `/sw.js` -> 200 JS, `/~offline` -> 200 HTML. Re-add `/downloads` to `protectedRoutes` in `tests/public/access-control.spec.ts`. Seed the runtime SW gate (`stripstream:sw-enabled`) per-spec where needed.
  - Acceptance: `pnpm test:e2e -g "service worker and offline fallback"` and the access-control spec pass.
  - QA happy: run the two specs and capture the summary line; evidence `.omo/evidence/offline-reading/task-14-e2e.md`.
  - QA failure: unauthenticated `/downloads` redirects to `/login`; evidence `.omo/evidence/offline-reading/task-14-e2e-failure.md`.
  - Commit: `test(pwa): cover service worker, fallback and downloads route`

- [ ] 15. Add the offline-reading E2E journey with the deterministic reader fixture
  - References: `tests/README.md` (reader fixture, `E2E_DATABASE_URL`); existing `tests/reader/` specs; `book-download.service`/`book-status.store` (Todos 7-8); Playwright `browserContext.setOffline(true)`.
  - Work: add `tests/reader/offline-reading.spec.ts` titled `"reads a downloaded book offline"`: log in, open the 10-page fixture book, download it, assert `caches.open("stripstream-books:<scope>")` has 11 entries, `context.setOffline(true)`, then `page.goto('/books/${id}')` (a DOCUMENT navigation — a client-side cover click would request an `_rsc` variant that may not be cached) and assert pages render from cache and the offline indicator appears; delete the download and assert the scoped cache is empty.
  - Acceptance: `pnpm test:e2e -g "reads a downloaded book offline"` passes against the production `.next-e2e` build.
  - QA happy: run the spec and capture the pass summary; evidence `.omo/evidence/offline-reading/task-15-offline-e2e.md`.
  - QA failure: with the download removed, going offline and opening the book shows `/~offline` or the blocked badge, never a crash; evidence `.omo/evidence/offline-reading/task-15-offline-e2e-failure.md`.
  - Commit: `test(offline): add offline reading journey`

- [ ] 16. Keep the E2E build and dev workflow green with the service worker
  - References: `package.json:15-16` (`test:e2e`, `test:e2e:build`); `playwright.config.ts:10,25-30,87,97` (webServer runs `next start`; asserts `.next-e2e/BUILD_ID`); `tests/README.md`; `serwist.config.mjs`.
  - Work: confirm `test:e2e:build` runs `serwist build serwist.config.mjs` for `.next-e2e` (Todo 2); the webServer must not rebuild — it only starts the already-built server, so the SW build must precede `pnpm test:e2e`. Document the exact commands in `tests/README.md` and `docs/cache-debug.md`. Confirm `pnpm dev` starts `concurrently` (SW watcher + Next).
  - Acceptance: `pnpm test:e2e` passes end-to-end; `pnpm dev` boots both processes.
  - QA happy: run the full suite and capture the run summary; evidence `.omo/evidence/offline-reading/task-16-e2e-build.md`.
  - QA failure: remove the `serwist build` step from `test:e2e:build`, confirm the PWA/offline specs fail (missing/mismatched `public/sw.js`), then restore; evidence `.omo/evidence/offline-reading/task-16-e2e-build-failure.md`.
  - Commit: `chore(test): keep e2e build compatible with serwist`

- [ ] 17. Harden auth/offline resume and the update flow
  - References: `src/components/providers/AuthProvider.tsx` (SessionResumeGuard L27-72, `cache:"no-store"` session fetch, offline catch L51-53); `src/components/providers/ServiceWorkerRegistrar.tsx` (Todo 4); `src/components/ui/InstallPWA.tsx`; `public/manifest.json`.
  - Work: ensure the offline-reload path serves `/~offline` or the cached shell without a `/login` redirect loop; when a new SW version is waiting, show a non-blocking reload prompt that posts `SKIP_WAITING` and reloads on `controllerchange` (Serwist registers the `SKIP_WAITING` listener because `skipWaiting` is false). Make `InstallPWA` copy accurate for the offline feature.
  - Acceptance: `pnpm typecheck` passes; going offline on a resumed PWA keeps the shell usable (no redirect loop).
  - QA happy: emulate PWA resume with network offline and assert the reader stays usable; evidence `.omo/evidence/offline-reading/task-17-auth-resume.md`.
  - QA failure: an expired session while online still redirects to `/login`; evidence `.omo/evidence/offline-reading/task-17-auth-resume-failure.md`.
  - Commit: `fix(pwa): keep offline resume usable and prompt on update`

- [ ] 18. Final integration pass: scoping, quota and cache cleanup
  - References: all above; `src/constants/cacheConstants.ts`; `src/app/actions/refresh.ts` (`updateTag`); `navigator.storage.estimate()`.
  - Work: verify switching provider/account yields a different scope and cache; verify clearing one scope never touches another; surface `QuotaExceededError` as a localized error; verify the `activate` purge removes only outdated versioned caches while preserving `stripstream-books:*`. Add a bounded per-book size guard (skip download + localized warning above a configurable cap) exposed in `OfflineSettings`.
  - Acceptance: two scopes coexist isolated; the quota path is reachable in a test; after activate only the current `SW_VERSION` runtime caches + current-scope book caches remain.
  - QA happy: two scopes downloaded, isolation asserted; evidence `.omo/evidence/offline-reading/task-18-scoping.md`.
  - QA failure: force a quota error and assert the localized toast + partial cleanup; evidence `.omo/evidence/offline-reading/task-18-scoping-failure.md`.
  - Commit: `fix(offline): enforce scoping, quota and cache cleanup`

- [ ] 19. Reconcile offline documentation with reality
  - References: `README.md` (offline/download claims), `devbook.md:45-58,150-165`, `project-intelligence/decisions-log.md` (ADR-006 L112-125), `project-intelligence/business-domain.md:17,30,42`, `project-intelligence/business-tech-bridge.md:20` (stale `ClientOfflineBookService`), `project-intelligence/living-notes.md:48-58`, `project-intelligence/audit-2026-04-30.md`, `tests/todo.md:18`, `CLAUDE.md:99-103`, `docs/cache-debug.md:135-137`.
  - Work: rewrite ADR-006 to record the switch to Serwist + curated versioned caches + Cache Storage + cookie-based per-user scope (and the white-screen lesson); correct README/devbook feature lists; fix business-domain/tech-bridge service naming; update living-notes; mark offline covered in `tests/todo.md`; refresh `CLAUDE.md` and `docs/cache-debug.md` with the new architecture and `serwist` commands.
  - Acceptance: no remaining claim contradicts the implementation; the stale identifiers below are gone.
  - QA happy: read the updated files and confirm the offline architecture is described identically across README/devbook/ADR; evidence `.omo/evidence/offline-reading/task-19-docs.md`.
  - QA failure: `grep -ri "ClientOfflineBookService" README.md devbook.md project-intelligence docs` returns nothing; evidence `.omo/evidence/offline-reading/task-19-docs-failure.md`.
  - Commit: `docs(offline): reconcile offline architecture and docs`

## Final verification wave

All four run in parallel and must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.

- [ ] F1. Plan compliance audit - verify every implementation todo landed, claims are backed by real command output, and no scoped-out item slipped in.
  - References: this plan's todo rows; `.omo/evidence/offline-reading/`; branch `git log`.
  - Acceptance: every todo maps to files + evidence; `pnpm lint && pnpm typecheck` green; no unreferenced scope additions.
  - QA happy: enumerate todos and match each to evidence; capture `.omo/evidence/offline-reading/f1-compliance.md`.
  - QA failure: fabricate a missing evidence path and confirm the audit fails, then restore; capture `.omo/evidence/offline-reading/f1-compliance-failure.md`.
  - Commit: `chore(offline): no code change - verification record only` (F1-F4 do not modify product code; if a fix is required, it lands under the owning todo's commit).

- [ ] F2. Code quality review - service worker correctness, no RSC/HTML SWR hazard, no cross-scope cache leak, no polling, no dead code.
  - References: `src/sw.ts`, `serwist.config.mjs`, `src/lib/offline/*`, `src/contexts/OfflineContext.tsx`, touched reader/UI components.
  - Acceptance: reviewer signs off on caching safety (`defaultCache` absent, versioned caches, page route header-gated), scope isolation, and quota handling; ESLint 0 warnings.
  - QA happy: run `grep -c defaultCache public/sw.js` (expect 0) and ESLint; capture `.omo/evidence/offline-reading/f2-quality.md`.
  - QA failure: inject a temporary `...defaultCache` spread and confirm the reviewer detects it; capture `.omo/evidence/offline-reading/f2-quality-failure.md`.
  - Commit: `chore(offline): no code change - verification record only`.

- [ ] F3. Real manual QA - install the PWA, download a book on each provider, go offline, read pages, restart, and delete.
  - References: `pnpm build && pnpm start`, Playwright offline spec, both themes/locales.
  - Acceptance: offline page turn works on Komga and Stripstream; no white screen after an offline restart; settings clear/reinstall works.
  - QA happy: capture screenshots to `.omo/evidence/offline-reading/f3-manual-qa.md`.
  - QA failure: force a redeploy while offline and confirm `/~offline`/cached shell renders instead of a white screen; capture `.omo/evidence/offline-reading/f3-manual-qa-failure.md`.
  - Commit: `chore(offline): no code change - verification record only`.

- [ ] F4. Scope fidelity - confirm no IndexedDB/fflate/EPUB/PDF/auto-download/`useCacheUpdate`/polling was added and the full requested scope is covered.
  - References: plan `## Scope` + `## Out of scope (guardrails, not reductions)`; branch `git diff`; dependency diff.
  - Acceptance: guardrail grep returns clean; all in-scope surfaces present.
  - QA happy: run `grep -rn "indexedDB\|fflate\|setInterval" src/ | grep -v test` and confirm no unexpected hits; capture `.omo/evidence/offline-reading/f4-scope.md`.
  - QA failure: add a temporary `setInterval` and confirm the check fails; capture `.omo/evidence/offline-reading/f4-scope-failure.md`.
  - Commit: `chore(offline): no code change - verification record only`.

## Commit strategy

One Conventional Commit per implementation todo, in wave order: `feat(i18n)`, `chore(pwa)`, `feat(pwa)`,
`refactor(reader)`, `feat(offline)`, `test(pwa|offline)`, `chore(test)`, `docs(offline)`, `fix(pwa|offline)`.
F1-F4 are verification records and normally add no product-code commit.
Keep `public/sw.js` generated and gitignored. `SW_VERSION` is build-injected from `BUILD_ID`/revision, so a redeploy rotates the runtime caches automatically; if a build reuses a `BUILD_ID`, force a fresh value. Each commit must keep `pnpm lint && pnpm typecheck && pnpm build` green;
the E2E build uses `NEXT_DIST_DIR=.next-e2e`, and `serwist build serwist.config.mjs` must run with the same variable.

## Success criteria

1. A user can download a book on both Komga and Stripstream, go fully offline, and read every page in
   the reader, including after an app restart.
2. `/~offline` and the cached shell load when offline; no white screen after a redeploy while offline.
3. Downloaded state is per user/config (cookie-based scope); clearing one scope never affects another;
   quota errors are localized.
4. `/downloads`, the cover offline badge, the per-book button, and the Settings storage card all work.
5. `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test:e2e` pass; F1-F4 all APPROVE.
6. No guardrail item was introduced; docs describe the real architecture.
