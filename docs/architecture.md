# Stripstream — Architecture Reference

Consolidated system reference for the current codebase. Every fact below was checked against the working tree (commit `65420bf63bb7cbf481f18a1278da8de0005c8458`, 2026-09-11). Stack: Next.js 16 App Router, React 19, TypeScript strict, Prisma 6 + SQLite, NextAuth v5 (beta). This document replaces the older dated architecture notes that were removed in the docs overhaul.

## 1. Multi-provider abstraction

Stripstream is a comic-reader front end; it does **not** own the library. Each user talks to one of two backends at a time:

- **Komga** — Spring API, HTTP Basic auth (`src/lib/providers/komga/komga.provider.ts`).
- **Stripstream Librarian** — custom API, bearer token (`src/lib/providers/stripstream/stripstream.provider.ts`; bearer header at `src/lib/providers/stripstream/stripstream.client.ts:52,178`).

### The interface

`IMediaProvider` is defined at `src/lib/providers/provider.interface.ts:23-80`. It covers:

- collections — `getLibraries`, `getLibraryById`, `getSeries`, `getSeriesById`, `getBooks`, `getBook`, `getNextBook`, `getMissingBooks`;
- home feeds — `getHomePrimaryData`, `getHomeDeferredData`, `getHomeData`, and the individual section methods;
- read progress — `getReadProgress`, `saveReadProgress`, `resetReadProgress`;
- series ratings — Stripstream-only; Komga returns `null` / not-supported (`provider.interface.ts:51-54`);
- admin/utility — `scanLibrary`, `getRandomBook`;
- related/recommended series — `getRelatedSeries`, `getRecommendations`;
- favorites — `getFavorites`, `isFavorite`, `addToFavorites`, `removeFromFavorites`;
- search — `search`;
- connection test — `testConnection`;
- URL builders that return local proxy URLs — `getBookThumbnailUrl`, `getSeriesThumbnailUrl`, `getBookPageUrl` (`provider.interface.ts:76-79`).

Concrete implementations:

| Backend | Provider | Adapter / client |
| --- | --- | --- |
| Komga | `src/lib/providers/komga/komga.provider.ts` (`class KomgaProvider implements IMediaProvider`) | `src/lib/providers/komga/komga.adapter.ts` |
| Stripstream | `src/lib/providers/stripstream/stripstream.provider.ts` | `src/lib/providers/stripstream/stripstream.adapter.ts`, `src/lib/providers/stripstream/stripstream.client.ts` |

Both backends normalize into shared types in `src/lib/providers/types.ts`; rating helpers live in `src/lib/providers/ratings.ts`.

### Factory

Server code must request the active provider through `getProvider()` (`src/lib/providers/provider.factory.ts:8-36`):

```ts
const provider = await getProvider();
```

The factory resolves the current user, resolves the active connection, dynamically imports the matching provider and instantiates it with the connection's URL and credentials. It returns `null` when there is no authenticated user or no usable config. **Never bypass this** — constructing `KomgaProvider`/`StripstreamProvider` directly breaks multi-config support.

Direct construction still exists in a few places and is the exception, not the pattern: `new KomgaProvider` appears only in `src/lib/providers/provider.factory.ts:32`; `new StripstreamProvider` appears in the factory itself (`src/lib/providers/provider.factory.ts:24,65`, the latter for the reading-list detail helper) and in the Stripstream connection-test actions `testStripstreamConnection` (`src/app/actions/stripstream-config.ts:71`) and `testStripstreamConfigById` (`src/app/actions/stripstream-config.ts:204`). The Komga-side connection tests (`testKomgaConnection`, `testKomgaConfigById` in `src/app/actions/config.ts`) bypass the factory too, with raw `fetch` calls (`testKomgaConnection` fetches the caller-supplied server at `src/app/actions/config.ts:85`; `testKomgaConfigById` fetches the stored config at `src/app/actions/config.ts:232`).

### Active connection and multi-config per user

A user can hold multiple `KomgaConfig` and `StripstreamConfig` rows (`prisma/schema.prisma`). The migration `prisma/migrations/20260429000000_multi_config/migration.sql` rebuilt both tables: it renamed existing single configs to "Default" and replaced `@unique(userId)` with `@unique(userId, name)`, preserving rows via `INSERT ... SELECT`.

The active selection is **per browser**, not global: httpOnly cookies `stripstream-active-provider`, `stripstream-active-komga-config`, `stripstream-active-stripstream-config` (`src/lib/active-connection.ts:5-7`) are resolved by `getActiveConnection()` (`src/lib/active-connection.ts:24-67`), which validates the cookie's config id against the user's rows and falls back to the user's first config. `setActiveConnection()` (`src/lib/active-connection.ts:69-88`) writes the cookies; the settings actions call it (`src/app/actions/config.ts:257`, `src/app/actions/stripstream-config.ts:226`).

> Legacy note: the `User.activeProvider` / `activeKomgaConfigId` / `activeStripstreamConfigId` columns still exist in `prisma/schema.prisma:19-21` but are not read by current application code — the cookie resolver above is the live mechanism.

### Favorites scoping

`Favorite` is scoped per `(userId, komgaConfigId | stripstreamConfigId, seriesId)`: the two mutually exclusive unique constraints are declared at `prisma/schema.prisma:110-111`, and `prisma/migrations/20260505000000_dedupe_favorites/migration.sql` deleted orphans, deduped per `(userId, seriesId)` (preferring the active config) and remapped survivors — the migration is explicitly idempotent. `FavoriteService` resolves the active `(provider, configId)` pair (`src/lib/services/favorite.service.ts:75-80`); Komga favorites are read/written in SQLite with `FAVORITES_CACHE_TAG` caching (`favorite.service.ts:23-59`), while Stripstream favorites are delegated to the provider API (`favorite.service.ts:85-88, 99-103, 148-152, 189-191`). This is why favorites do not leak across configs.

## 2. Server-first data flow

- Pages and layouts under `src/app/**/page.tsx` are React Server Components. The home page (`src/app/page.tsx`) resolves the provider server-side and fans out feed promises; other examples: `src/app/libraries/[libraryId]/page.tsx`, `src/app/series/[seriesId]/page.tsx`, `src/app/books/[bookId]/page.tsx`, `src/app/reading-lists/[id]/page.tsx`.
- Mutations are Next.js server actions in `src/app/actions/` — 13 files: `admin.ts`, `auth.ts`, `books.ts`, `config.ts`, `favorites.ts`, `home.ts`, `library.ts`, `password.ts`, `preferences.ts`, `ratings.ts`, `read-progress.ts`, `refresh.ts`, `stripstream-config.ts`. They run server-side, use `getProvider()`, and invalidate caches (see §3).
- Client components (`"use client"`) are reserved for browser-only concerns: event handlers, refs, effects, DOM APIs. Do not add client-side `fetch` to internal APIs where a server action exists.
- **Exception — media streams.** The 11 route handlers under `src/app/api/` exist to stream bytes to the browser: the Komga image proxies under `src/app/api/komga/images/...` (thumbnails, first page, pages), `src/app/api/komga/books/[bookId]/pages/[pageNumber]/route.ts`, the Stripstream mirrors under `src/app/api/stripstream/images/...`, the NextAuth handler `src/app/api/auth/[...nextauth]/route.ts`, and the two search proxies (`src/app/api/provider/search/route.ts`, `src/app/api/stripstream/search/route.ts`). They exist so `<img src=...>` works with credentials kept server-side. Komga streaming is implemented in `src/lib/services/komga/image.service.ts:19-49`; identical concurrent image requests are coalesced by `requestDeduplicationService` (`src/lib/services/request-deduplication.service.ts`, used at `src/app/api/komga/books/[bookId]/pages/[pageNumber]/route.ts:34-47`). Route-by-route documentation lives in `docs/api.md`.

## 3. Caching model

Provider reads are wrapped in Next.js `unstable_cache(...)`, with **9 call sites** total: 7 in `src/lib/providers/komga/komga.provider.ts:112,415,436,470,512,533,548` and 2 in `src/lib/services/favorite.service.ts:29,44`. The **Stripstream provider does not use `unstable_cache`** — it caches through fetch options (`next: { revalidate, tags }`) assembled in `src/lib/providers/stripstream/stripstream.client.ts:100-107`. Tags come from `src/constants/cacheConstants.ts:1-6`:

| Tag constant | Tag value | Scope |
| --- | --- | --- |
| `HOME_CACHE_TAG` | `home-data` | global home feed |
| `LIBRARY_SERIES_CACHE_TAG` | `library-series` | library series listing |
| `SERIES_BOOKS_CACHE_TAG` | `series-books` | books of a series |
| `FAVORITES_CACHE_TAG` | `favorites` | favorites |
| `BOOK_CACHE_TAG` | `book` | single book |
| `SERIES_RATING_CACHE_TAG` | `series-rating` | series ratings |

Per-id tags narrow invalidation: `library-series:${libraryId}` (`src/lib/providers/komga/komga.provider.ts:225-226`), `series-books:${seriesId}` (`src/app/actions/read-progress.ts:18`), `series-rating:${seriesId}` (`src/app/actions/ratings.ts:16`), plus `series-recommendations` and `series-related:${seriesId}` (`src/lib/providers/stripstream/stripstream.provider.ts:541,577`). Prefer the narrow per-id tag when touching data: the global tag invalidates the whole scope and degrades the hit rate.

### TTLs

The constants are per provider: `CACHE_TTL_LONG = 300`, `CACHE_TTL_MED = 120`, `CACHE_TTL_SHORT = 30` seconds (`src/lib/providers/komga/komga.provider.ts:36-38`; the identical trio is at `src/lib/providers/stripstream/stripstream.provider.ts:38-40`).

| Read | TTL | Anchor |
| --- | --- | --- |
| `getLibraries()` | 300 s (5 min) | `komga.provider.ts:191` |
| `getSeries()` (library series listing) | 120 s (2 min), tag `library-series:${libraryId}` | `komga.provider.ts:225-226` |
| Home sections (continue reading, ongoing, latest, recently read, reading lists, primary/deferred wrappers) | 120 s (2 min), tag `HOME_CACHE_TAG` | `komga.provider.ts:418,439,507,528,543,558`; `stripstream.provider.ts:329,343,354,365,376` |
| Single-book / estimate lookups | 30 s | `komga.provider.ts:297,313,355,360` |

### Invalidation

Server actions call `updateTag(...)` from `next/cache` (six action files: `read-progress.ts:14-21`, `config.ts:47-52`, `stripstream-config.ts:41-46`, `favorites.ts:9-11`, `ratings.ts:16`, `refresh.ts:15-28`), optionally together with `revalidatePath(...)`. `updateTag` immediately expires the tagged entries so the action's own re-render sees fresh data (Next.js 16 read-your-writes semantics).

> Historical note: pre-overhaul documentation described `revalidateTag(tag, "max")`. The current code has **no `revalidateTag` call site** — the only remaining textual mention is a stale comment at `src/components/series/SeriesHeader.tsx:63`. Do not reintroduce `revalidateTag` blindly; follow the `updateTag` call sites above.

`force-dynamic` was deliberately removed from the image proxy routes so the handlers' `Cache-Control` headers take effect (`src/app/api/komga/books/[bookId]/pages/[pageNumber]/route.ts:54` sets `public, max-age=31536000`; `src/lib/services/komga/image.service.ts:41` uses `public, max-age=..., immutable`; the Stripstream page route uses `max-age=86400` at `src/app/api/stripstream/images/books/[bookId]/pages/[pageNumber]/route.ts:41`). Do not reintroduce it there. `force-dynamic` remains intentional on the settings/admin/account pages (`src/app/settings/page.tsx:9`, `src/app/admin/page.tsx:7`, `src/app/account/page.tsx:7`).

## 4. Error model

- All thrown domain errors are `AppError` (`src/utils/errors.ts:4-20`), carrying an `ErrorCode` plus optional message params.
- Codes are declared in `src/constants/errorCodes.ts:3-112`, grouped per domain: `AUTH`, `KOMGA`, `STRIPSTREAM`, `CONFIG`, `LIBRARY`, `SERIES`, `BOOK`, `FAVORITE`, `PREFERENCES`, `UI`, `IMAGE`, `HOME`, `MIDDLEWARE`, `CLIENT`, `ADMIN`.
- Provider HTTP errors map to status-aware codes via `codeForHttpStatus(status, codes)` (`src/utils/http-error.ts:16-22`): 401 → `UNAUTHORIZED`, 403 → `FORBIDDEN`, 404 → `NOT_FOUND`, 5xx → `SERVER_ERROR`, otherwise `HTTP_ERROR`. `isConnectionError()` (`http-error.ts:39-47`) detects network failures so they can be logged as warnings.
- User-facing messages are localized under `errors.${code}` in `src/i18n/messages/en/common.json` (block at `:387`) and `src/i18n/messages/fr/common.json` (`:390`). Add keys to **both** locales.
- Home tolerance: the home page fans out each feed as its own promise with an individual `.catch(...)` (`src/app/page.tsx:42-53`), so one failing feed renders empty instead of breaking the page. `KomgaProvider.getHomeContinueReadingData` uses `Promise.allSettled` over its two Komga calls and throws only when *every* call rejects (`src/lib/providers/komga/komga.provider.ts:469-509`); partial results degrade to empty lists.
- Credential-touching connection tests are gated by `requireUserId()` + `checkRateLimit` — keep that pattern for similar actions (`testKomgaConnection` in `src/app/actions/config.ts`; `testStripstreamConnection` in `src/app/actions/stripstream-config.ts:54-83`).

## 5. Reader

The reader lives in `src/components/reader/` (entry `BookReader.tsx`, page wiring `ClientBookPage.tsx` / `ClientBookWrapper.tsx`). Key hooks in `src/components/reader/hooks/`:

- `useReaderState.ts` — orchestrates page state across the book session.
- `usePageNavigation.ts` — previous/next, end-of-book handling, and debounced read-progress sync through `updateReadProgress(bookId, page, completed, seriesId)` (`:66-78`) so the `series-books:${seriesId}` tag can be invalidated granularly. Page bounds are guarded (`:98`, warning at `:118`) and callers clamp (`:127`, `:142`).
- `useImageLoader.ts` — concurrent prefetch, retry with exponential backoff, `AbortController` tracking, and LRU-style window eviction. Fetched pages are blob URLs (`URL.createObjectURL` at `:174`) that must be revoked (`:119`, `:181-204`, plus the unmount sweep at `:372`). Eviction key computation lives in `imageEviction.ts` (`computeEvictionKeys`), and the same `prefetchKey(key, url)` path is used for current- and next-book prefetch.
- Display helpers: `useTouchNavigation.ts`, `useDoublePageMode.ts`, `useFitMode.ts`, `useFullscreen.ts`, `useReadingDirection.ts`, `useOrientation.ts`, `useThumbnails.ts`.

Eviction and blob revocation are mandatory when navigating; otherwise memory grows unbounded on long books.

## 6. LocalStorage scoping

Anything user-specific stored in `localStorage` must be scoped, otherwise two accounts on the same device share state. The current codebase still has unscoped keys: `pwa-install-dismissed` (`src/components/ui/InstallPWA.tsx:16`) and `recommendations-view-mode` (`src/components/home/RecommendationsRow.tsx:35`); i18n language detection also reads browser storage (`src/i18n/i18n.ts:31`). Read progress and reading direction are persisted server-side through server actions (`src/app/actions/read-progress.ts`, `src/app/actions/preferences.ts`), so those no longer live in localStorage — but there is still no centralized `buildStorageKey(userId, key)` helper. See Known limitations (b).

## 7. i18n

`react-i18next` is initialized in `src/i18n/i18n.ts` (`initReactI18next` + `i18next-browser-languagedetector`). Namespaces are JSON dictionaries in `src/i18n/messages/en/common.json` and `src/i18n/messages/fr/common.json`. Add every user-facing key to both locales; error copy lives under `errors.${ERROR_CODE}`.

## 8. Prisma migrations on SQLite

The datasource is SQLite (`prisma/schema.prisma:8-11`: `provider = "sqlite"`, URL from `DATABASE_URL`). SQLite's `ALTER TABLE` supports only adding columns and renaming — changing constraints, dropping columns, or reshaping a `@unique` requires the manual rebuild pattern used by:

- `prisma/migrations/20260429000000_multi_config/migration.sql` — rebuilds `komgaconfigs` / `stripstreamconfigs` (adds `name`, switches to `@unique(userId, name)`, preserves rows via `INSERT ... SELECT`, recreates indexes) and links favorites to configs.
- `prisma/migrations/20260505000000_dedupe_favorites/migration.sql` — deletes orphan favorites, dedupes per `(userId, seriesId)` preferring the active config, remaps survivors; explicitly idempotent.

Pattern:

```sql
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_x" (...);          -- new shape
INSERT INTO "new_x" SELECT ... FROM "x";
DROP TABLE "x";
ALTER TABLE "new_x" RENAME TO "x";
-- recreate indexes
PRAGMA foreign_keys=ON;
```

Hand-write the SQL, preserve rows, make it idempotent so re-runs are no-ops, and never let `prisma migrate dev` auto-generate destructive DDL. Migrations are applied on production boot via `prisma migrate deploy`.

## 9. Rate limiting

`checkRateLimit(key, { limit, windowMs })` in `src/utils/rate-limit.ts:30-53` is an in-memory, per-process `Map` (`:13`). It resets on every redeploy and is not shared across instances (documented in the file header, `:1-6`). That is acceptable for the current single-instance SQLite-bound deployment; if the app scales horizontally it must move to a shared store. It is used by the provider connection tests (limit 5 / 30 s; `src/app/actions/config.ts:18-19`, `src/app/actions/stripstream-config.ts:18-19,54-69`) and by auth flows (`ERROR_CODES.AUTH.RATE_LIMITED`).

## 10. PWA / offline state

The app is installable as a PWA shell only: `public/manifest.json` is linked from the root metadata (`src/app/layout.tsx:33`) and `InstallPWA` renders the install prompt (`src/components/ui/InstallPWA.tsx`, mounted from `src/components/layout/ClientLayout.tsx:208`). Offline reading and the Service Worker were removed: there is no `public/sw.js`, no Cache Storage usage, and no book-download feature. All pages, API data, and images are fetched from the network (Next.js / native HTTP caching only).

## 11. Known limitations / open issues

### (a) Provider credentials are stored unencrypted

- The Komga `authHeader` is base64-encoded `user:password`, not encrypted: `Buffer.from(...).toString("base64")` in `src/lib/services/config-db.service.ts:28` (same helper in `src/app/actions/config.ts:34-36`). The column is stored as plaintext in SQLite (`prisma/migrations/20260429000000_multi_config/migration.sql`).
- The Stripstream `token` is stored as-is: `src/app/actions/stripstream-config.ts:144` (create) and `:130-134` (update stores/keeps the raw token). There is no encryption layer or key material. A database leak exposes every user's provider credentials.
- Status: **open**. Suggested fix (from the last codebase audit): encrypt both fields with `crypto.subtle` and migrate existing rows.

### (b) localStorage keys are not scoped per user

Several client storage keys are global, so two accounts on the same device/browser share them: `pwa-install-dismissed` (`src/components/ui/InstallPWA.tsx:16`) and `recommendations-view-mode` (`src/components/home/RecommendationsRow.tsx:35`) are the current examples. The standing rule — scope anything user-specific, ideally through a centralized `buildStorageKey(userId, key)` helper — is recorded in `AGENTS.md` → LocalStorage scoping. No per-user/config token is threaded through the client yet.

### (c) No unit-test runner — Playwright E2E only

There is no Vitest/Jest suite and no unit-test runner in `package.json`. The automated suite is Playwright E2E under `tests/` (`pnpm test:e2e`, `pnpm test:e2e:read-only`, `pnpm test:e2e:mutating`; configuration in `playwright.config.ts`; suite reference in `tests/README.md`). The minimum quality gate for changes is `pnpm lint` (0 warnings) + `pnpm typecheck`. Hooks such as `useImageLoader` / `usePageNavigation` and provider normalization remain untested at the unit level.

### (d) Minor open backlog (last codebase audit)

- **Reader page bounds** — `usePageNavigation` now guards and clamps page numbers (`src/components/reader/hooks/usePageNavigation.ts:98,118,127,142`); the remaining risk is untested edge cases (empty page list, double-page on the last page). Partially mitigated.
- **Unstable list keys in skeletons** — `src/components/skeletons/RouteSkeletons.tsx:7,107` still renders `key={index}`; replace with stable keys.
- **Unlogged `Promise.allSettled` rejections** — `src/app/settings/page.tsx:22-30` silently ignores rejected branches, and `KomgaProvider.getHomeContinueReadingData` degrades partial failures to empty arrays without logging the reasons (`src/lib/providers/komga/komga.provider.ts:489-499`). Add `logger.warn` on rejected results.
- **`ConfigDBService.getConfig()` misnaming** — the generic name returns only the active **Komga** config (`src/lib/services/config-db.service.ts:59-82`); rename to `getActiveKomgaConfig()` or make it polymorphic.
- **`AbortController` cleanup** — `useImageLoader` relies on the trailing `.finally()` to delete controllers/promises (`src/components/reader/hooks/useImageLoader.ts:269-273`); there is no defensive `try/catch` inside the cleanup, so a catastrophic throw before it would leak entries in the tracking maps.

## Where to look

- Provider abstraction: `src/lib/providers/`
- Server actions: `src/app/actions/`
- Data model and migrations: `prisma/schema.prisma`, `prisma/migrations/`
- Error codes and copy: `src/constants/errorCodes.ts`, `src/i18n/messages/{fr,en}/common.json`
- Reader: `src/components/reader/`
- Environment: `ENV.md`; API surface: `docs/api.md`; agent guide: `AGENTS.md`.
