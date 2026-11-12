# Stripstream — Architecture Reference

Consolidated system reference for the current codebase. Every fact below was checked against the working tree (commit `3c772f9`, 2026-10-16). Stack: Next.js 16 App Router, React 19, TypeScript strict, Prisma 7 + SQLite (`@prisma/adapter-better-sqlite3`), NextAuth v5 (beta). This document replaces the older dated architecture notes that were removed in the docs overhaul. For the two-repo layout (this reader + the Stripstream Librarian backend), see [`ecosystem.md`](./ecosystem.md).

## 1. Multi-provider abstraction

Stripstream is a comic-reader front end; it does **not** own the library. Each user talks to one of two backends at a time:

- **Komga** — Spring API, HTTP Basic auth (`src/lib/providers/komga/komga.provider.ts`).
- **Stripstream Librarian** — custom API, bearer token (`src/lib/providers/stripstream/stripstream.provider.ts`; request policy at `src/lib/providers/stripstream/stripstream.transport-policy.ts`). The backend is a separate repository ([`julienfroidefond/stripstream-librarian`](https://github.com/julienfroidefond/stripstream-librarian), Rust/axum + PostgreSQL), usually cloned as a sibling directory; Stripstream consumes its read-scoped Client API. See [`ecosystem.md`](./ecosystem.md).

### The interface

`IMediaProvider` (`src/lib/providers/provider.interface.ts`) is the composition of two contracts:

- `MediaProviderCore` — what every backend must provide:
  - collections — `getLibraries`, `getLibraryById`, `getSeries`, `getSeriesById`, `getBooks`, `getBook`, `getReadSeries`, `getNextBook`;
  - home feeds — the individual section methods (`getHomeContinueReadingData`, `getHomeOngoingSeries`, `getHomeLatestSeries`, `getHomeRecentlyRead`); `src/lib/home/feed-registry.ts` owns each row feed's loader and page rule, and both the page and `loadHomeFeed` consume it;
  - read progress — `getReadProgress`, `saveReadProgress`, `resetReadProgress`;
  - admin/utility — `scanLibrary` (returns a `{ jobId, progressSupported }` handle), `getScanStatus` (follows that job, or `unavailable` when the backend cannot report it), `getRandomBook`;
  - reading statistics — `getReadingStats`;
  - connection test — `testConnection`;
  - URL builder that returns a local proxy URL — `getBookThumbnailUrl`.
- `ProviderCapabilities` — the optional features a backend declares explicitly. Each key holds the capability contract or `null`; it is never inferred from the connection type. `createProviderCapabilities(overrides)` builds the all-null baseline, and a provider implements a capability on itself (`capabilities = createProviderCapabilities({ search: this })`).

| Capability | Contract | Komga | Stripstream |
| --- | --- | --- | --- |
| `readingLists` | `getReadingLists`, `getReadingListDetail` | `null` | yes |
| `search` | `search` | yes | yes |
| `ratings` | `getSeriesRating`, `setSeriesRating`, `deleteSeriesRating` | `null` | yes |
| `shelf` | `getShelvedSeries`, `isShelved`, `shelveSeries`, `unshelveSeries` | `null` | yes |
| `missingBooks` | `getMissingBooks` | `null` | yes |
| `discovery` | `getRelatedSeries`, `getRecommendations` | `null` | yes |
| `favorites` | `getFavorites`, `isFavorite`, `addToFavorites`, `removeFromFavorites` | `null` (local SQLite store) | yes |

An absent capability is a first-class state, not a silently empty result: pages and feeds hide the feature or return the empty collection, server actions fail with their dedicated code (`SERIES_RATING_NOT_SUPPORTED`, `SERIES_SHELF_NOT_SUPPORTED`) and capability-gated API routes return `PROVIDER_CAPABILITY_NOT_SUPPORTED`. The shared `NormalizedReadingList` / `NormalizedReadingListDetail` models carry displayable preview-cover URLs, so client components never import a provider adapter.

Concrete implementations:

| Backend | Provider | Capabilities | Adapter / client |
| --- | --- | --- | --- |
| Komga | `src/lib/providers/komga/komga.provider.ts` (`class KomgaProvider implements IMediaProvider`) | `search` | `src/lib/providers/komga/komga.adapter.ts` |
| Stripstream | `src/lib/providers/stripstream/stripstream.provider.ts` | all seven | `src/lib/providers/stripstream/stripstream.adapter.ts`, `src/lib/providers/stripstream/stripstream.client.ts` |

Both backends normalize into shared types in `src/lib/providers/types.ts`; rating helpers live in `src/lib/providers/ratings.ts`.

**One provider transport.** Every provider request — JSON reads/mutations and media bytes — goes through `ProviderTransport` (`src/lib/providers/provider-transport.ts`), which owns URL assembly, auth headers, Next cache options, one retry, the 15 s timeout, HTTP/network error mapping and JSON parsing (`request<T>()`). `response()` opens a raw byte stream for images and source files with the same URL/auth/timeout/error policy, plus per-call `Accept`, conditional validators, `304` acceptance and `cache: "no-store"`; media transports never call `fetch` directly. Each provider supplies only a policy (`komga.transport-policy.ts`, `stripstream.transport-policy.ts`): Komga uses `/api/v1` + Basic auth, retries DNS/cold-start once with no delay and caches POST reads; Stripstream uses Bearer auth, retries five DNS/socket codes after 500 ms and does not cache POSTs. Read-progress mutations still re-wrap transport failures in `BOOK_PROGRESS_*` so the user-facing action code is unchanged.

`NormalizedBook` keeps the series reference explicit: `seriesId` is the provider series id (never a title) and is `null` when the endpoint omits it; `seriesName` is the title and only a fallback. `matchSeries` (`src/lib/resume/identity.ts`) applies the id-first rule, `resolveBookSeries` (`src/lib/resume/series-pool.ts`) is the single network fallback for name-only rows, and `getSeriesById` never receives a series name. Stripstream's first-book-id fallback remains for legacy search URLs.

`NormalizedBook.media` is the reader's media contract: each adapter emits `pageUrlTemplate` and `thumbnailUrlTemplate` with a `{page}` token, and the reader fills it through `resolveBookMediaUrl` (`src/lib/providers/book-media.ts`). Templates are 1-based; the Komga transport owns the conversion to Komga's zero-based API (`src/lib/media/komga-paths.ts`). Never derive page URLs from `thumbnailUrl`.

### Factory and connection resolution

Server code must request the active provider through `getProvider()` (`src/lib/providers/provider.factory.ts`):

```ts
const provider = await getProvider();
```

The factory delegates connection selection to `@/lib/connections` (`resolveActiveConnection`) and construction to `createProvider(connection)`. It returns `null` when there is no authenticated user or no usable config. **Never bypass this** — constructing `KomgaProvider`/`StripstreamProvider` directly breaks multi-config support.

`createProvider(connection)` (`src/lib/providers/provider.factory.ts`) is now the only application constructor: it dynamically imports the matching provider and passes the URL plus **decrypted** credentials. Connection tests go through the same factory via `testConnection(connection)` (`src/lib/connections/probe.ts`), so there is no parallel `fetch` + `Authorization` path.

### Server URL validation

Provider URLs are user-configured by design (self-hosted Komga/Librarian). `normalizeServerUrl()` (`src/utils/server-url.ts`) is applied on save, on connection tests and in both provider constructors: it requires `http(s)`, rejects embedded credentials, query strings and fragments, and refuses cloud metadata endpoints (`169.254.0.0/16`, `100.100.100.200`, `fd00:ec2::254`, `metadata.google.internal`). Localhost and private LAN ranges stay allowed — they are the normal deployment.

The residual SSRF surface (an authenticated user chooses which server the instance contacts) is intentional; every `fetch` whose URL derives from a provider is annotated with a `codeql[js/request-forgery]` suppression comment.

### Active connection and multi-config per user

A user can hold multiple `KomgaConfig` and `StripstreamConfig` rows (`prisma/schema.prisma`). The migration `prisma/migrations/20260429000000_multi_config/migration.sql` rebuilt both tables: it renamed existing single configs to "Default" and replaced `@unique(userId)` with `@unique(userId, name)`, preserving rows via `INSERT ... SELECT`.

The active selection is **per browser**, not global: httpOnly cookies `stripstream-active-provider`, `stripstream-active-komga-config`, `stripstream-active-stripstream-config` (`src/lib/connections/active.ts`) are resolved by `getActiveConnection()`, which validates the cookie's config id against the user's rows and falls back to the user's first config. `setActiveConnection()` writes the cookies; the settings actions reach it through `activateConnection()` (`src/lib/connections/manage.ts`).

### One connection module

All connection paths live under `src/lib/connections/`, with `index.ts` as the only public seam:

- `active.ts` — per-browser cookie selection (`getActiveConnection`, `setActiveConnection`).
- `resolve.ts` — selection, decryption, fallback, ad-hoc connection builders, `resolveActiveConnection`, `resolveConnectionForProvider`, `getStoredConnection` and `requireConnectionForProvider`.
- `manage.ts` — `listConnections`, `saveConnection`, `deleteConnection`, `activateConnection`, plus cache invalidation.
- `probe.ts` — the shared 5/30 s connection-test budget and `testConnection` / `testStoredConnection` through the provider factory.
- `types.ts` — resolved-connection and summary types.

The fallback is uniform: the requested provider's active config, otherwise its first config; Stripstream then falls back to `STRIPSTREAM_URL` / `STRIPSTREAM_TOKEN`, Komga has no environment fallback. A provider-specific request (`resolveConnectionForProvider("komga" | "stripstream")`) therefore still finds that provider's bytes when the other provider is selected. `getStoredConnection` deliberately does **not** fall back, so "test this config" never tests another one. Credentials are decrypted in `resolve.ts`; mutations encrypt in `manage.ts`. Settings actions, `getProvider`, the Komga image/book/series services and the Stripstream image/file routes all consume this module; `ConfigDBService` and `stripstream-config-resolver` no longer exist.

> Legacy note: the `User.activeProvider` / `activeKomgaConfigId` / `activeStripstreamConfigId` columns still exist in `prisma/schema.prisma:19-21` but are not read by current application code — the cookie resolver above is the live mechanism.

### Favorites scoping

`Favorite` is scoped per `(userId, komgaConfigId | stripstreamConfigId, seriesId)`: the two mutually exclusive unique constraints are declared at `prisma/schema.prisma:110-111`, and `prisma/migrations/20260505000000_dedupe_favorites/migration.sql` deleted orphans, deduped per `(userId, seriesId)` (preferring the active config) and remapped survivors — the migration is explicitly idempotent. `FavoriteService` resolves the active `(provider, configId)` pair once (`src/lib/services/favorite.service.ts`) and picks an internal `FavoriteStore`: when `provider.capabilities.favorites` is present, `createBackendStore` delegates to that contract; otherwise Komga keeps `createKomgaStore`, which reads/writes SQLite scoped to `komgaConfigId`. Reads degrade (`false` / `[]`), writes throw (`ADD_ERROR` / `DELETE_ERROR`), and only a confirmed provider `null` prunes a Komga row. SQLite favorites are not cached; Stripstream favorite fetches are tagged `FAVORITES_CACHE_TAG` in the provider. This is why favorites do not leak across configs.

## 2. Server-first data flow

- Pages and layouts under `src/app/**/page.tsx` are React Server Components. The home page (`src/app/page.tsx`) resolves the provider server-side and fans out feed promises; other examples: `src/app/libraries/[libraryId]/page.tsx`, `src/app/series/[seriesId]/page.tsx`, `src/app/books/[bookId]/page.tsx`, `src/app/reading-lists/[id]/page.tsx`, `src/app/ratings/page.tsx` (read series → rating cards, Stripstream only, with search/filter/sort/pagination driven by URL search params and resolved server-side).
- **Page gateway.** `loadSurface` (`src/lib/surfaces/load-surface.ts`) is the single entry resolver for data-backed pages: it resolves the active provider and preferences once, then returns `ready`, `anonymous-empty`, `unavailable` or `error`. The pure core is `loadSurfaceWithDependencies` (`src/lib/surfaces/surface-loader.ts`); `load-surface.ts` only wires the real Next dependencies and `unstable_rethrow`. `SurfaceBoundary` (`src/components/ui/SurfaceBoundary.tsx`) owns the terminal for all four states: each page supplies its `ready` renderer and only the terminal overrides it actually needs (`unavailable`, `anonymousEmpty`, `error`). The default error terminal uses the code resolved by the loader, so pages no longer repeat their `fallbackCode` branch. Options encode the page policy: `missingProvider: "unavailable"` renders the home welcome instead of redirecting, `anonymous: "empty"` skips the in-progress fetch, `requireCapability: "ratings"` gates ratings with the `unsupported-capability` reason, and the reading-list detail maps unavailable to `notFound()`. Next control-flow errors (redirects, not-found, dynamic bailout) are rethrown before the loader maps a business error.
- Mutations are Next.js server actions in `src/app/actions/` — 14 files: `admin.ts`, `auth.ts`, `books.ts`, `config.ts`, `favorites.ts`, `home.ts`, `library.ts`, `password.ts`, `preferences.ts`, `ratings.ts`, `read-progress.ts`, `refresh.ts`, `series-shelf.ts`, `stripstream-config.ts`.
- **Action runner.** `runAction` / `runProviderAction` (`src/lib/actions/action-runner.ts`) is the single wrapper for server actions that return an `ActionResult`: session/rate-limit gates, optional anonymous short-circuit, provider resolution, one invalidation after success, and error mapping. `ActionError` carries a stable `ErrorCode`, an optional user message and partial data (for example `updated`/`total` after a partial series update). Successes return `code: "OK"`; failures return `success: false` plus the error code. The provider mutations and both config action files use the runner; `getScanStatus` deliberately stays outside it because it degrades to `unavailable` instead of failing.
- Client components (`"use client"`) are reserved for browser-only concerns: event handlers, refs, effects, DOM APIs. Do not add client-side `fetch` to internal APIs where a server action exists.
- **Resume state.** The home hero, the continue-reading feed and the in-progress page share one policy under `src/lib/resume/`: `mergeResumeBooks` merges `onDeck`/`ongoingBooks`, `matchSeries` owns series identity (id first, then normalized title, with the library tiebreak for homonyms), and `buildResumeEntries` returns book + series + progress. `loadContinueReading` returns only the new slice as ready-to-render entries; the hero no longer matches series or computes percentages. `resolveBookSeries` / `resolveSeriesPool` resolve missing series through the provider with the same comparison. A book whose series is not in the pool stays in the feed with `series: null`; each surface decides whether it can render it. Terms: [`GLOSSARY.md`](../GLOSSARY.md).
- **Home feed registry.** `loadHomeFeedPage` (`src/lib/home/feed-registry.ts`) is the single owner of each row feed's loader and page rule. Probe feeds ask the provider for `offset + pageSize + 1`, so `hasMore` needs no count query; collection feeds (favorites, reading lists) are sliced to the same bounded page instead of being serialized whole. `src/app/page.tsx` and `loadHomeFeed` both call the registry, so the initial render and "load more" share one contract. `FeedRow` is typed by the `HomeFeedItem<F>` map in `src/lib/home/feed-page.ts`: each row declares its feed id and receives items checked against that feed, with no cast. The hero reuses `useFeedPagination` for its own carousel. `loadContinueReading` also returns one page, never a cumulative list; `paginateFeed` is the shared slicing rule, including the extra probe item used to compute `hasMore`.
- **Paginated grids.** `usePaginatedGrid` (`src/hooks/usePaginatedGrid.ts`) is the single controller behind the library series grid and the series book grid: it owns URL search params, the default unread filter, the navigation transition and dimming, the flip content key and the typed display preferences (page size, compact, view/list, unread). `PaginatedSeriesGrid` supplies the series data, its sort/missing filters and the series card renderer; `PaginatedBookGrid` supplies the book data and missing-volume entries. `BookGrid` and `BookList` only choose the layout: both render `BookCard` (`src/components/series/BookCard.tsx`), which owns the missing placeholder, the reading status, the actions and the single `router.refresh()` policy after a read/unread mutation. Both grids persist preferences through `PreferencesContext`; neither calls the preferences server action directly.
- **Preference writes.** `PreferencesWriter` (`src/lib/preferences/preferences-writer.ts`) is the only client-side writer for `UserPreferences`; `PreferencesContext` only adapts the server action, the toast policy and the server snapshot. Every surface calls `updatePreferences(patch, { feedback, coalesce })`: the writer applies the patch optimistically (deep-merging `displayMode` and `background`), coalesces continuous updates, serializes server calls, rolls back to the last confirmed snapshot on failure, ignores responses that arrive after an auth reset and emits one feedback event per batch. `feedback` is `silent` for runtime reader writes, `errors` for sliders and `all` for discrete settings. `flushPreferences()` commits the last slider value on `onCommit`, `pagehide`, visibility loss and unmount.
- **Series mutations.** `SeriesMutationsProvider` (`src/contexts/SeriesMutationsContext.tsx`) is the single client-side protocol for favorite and shelf changes: it owns the optimistic override (paired with the server value it observed, so a refresh naturally takes over), the per-series pending lock, rollback on failure, the toast (including the shelf undo action), the `favoritesChanged` notification and the one `router.refresh()` per successful mutation. `SeriesHeader` and `InProgressContent` only read `isFavorite` / `isShelved` and call `toggleFavorite` / `setShelf`; the in-progress list derives its favorite set with `useFavoriteSet`. `SidebarFavoritesView` consumes the notification through `subscribeToFavoriteChanges` (`src/lib/series/favorite-events.ts`) and applies the same delta locally, so it no longer refreshes the router itself.
- **Refresh surfaces.** `RefreshSurface` (`src/components/common/RefreshSurface.tsx`) is the single client lifecycle for a manual refresh, keyed by a `{ scope, id }` pair from `RefreshScope`: it remounts its cycle when that pair changes, invalidates through `revalidateForRefresh(scope, id)`, owns the pending lock and pull-to-refresh, and calls `router.refresh()` once per cycle. The generic `RefreshButton` only reads `useRefreshSurface()`; home, library and series mount the same surface, replacing `LibraryClientWrapper` / `SeriesClientWrapper` and their wrapper-specific `RefreshProvider` props. Mutation-triggered refreshes stay with their owners (`SeriesMutationsProvider`, `BookCard`, bulk read-status in `SeriesHeader`). The reader's book refresh stays on its own data-fetch path because it re-fetches reader data instead of re-rendering the route.
- **Exception — media streams.** The route handlers under `src/app/api/` exist to stream bytes to the browser: the ten media routes under `src/app/api/komga/...` and `src/app/api/stripstream/...`, the NextAuth handler `src/app/api/auth/[...nextauth]/route.ts`, and the two search proxies (`src/app/api/provider/search/route.ts`, `src/app/api/stripstream/search/route.ts`). They exist so `<img src=...>` works with credentials kept server-side. The ten media routes are thin declarations over `createMediaRoute` (`src/lib/media/media-route.ts`): the route supplies a provider, a `MediaRef` and a `MEDIA_POLICIES` entry; the adapter owns authentication, response headers, 304 handling, status mapping and logging. `MediaRef` is provider-neutral; each provider transport (`komga.transport.ts`, `stripstream.transport.ts`) resolves the active connection once, builds a `ProviderTransport` from the matching policy, translates the ref into a provider path and opens the byte stream through `ProviderTransport.response()`. Komga pages are coalesced by a key built from the resolved `configId` and the validator fingerprint (never the raw cookie); identical concurrent thumbnail requests use `requestDeduplicationService` (`src/lib/services/request-deduplication.service.ts`) and the buffered payload is rebuilt into one `Response` per caller. `media-route-core.ts` is the Next-free testable core. Route-by-route documentation lives in `docs/api.md`.
- **Image backpressure.** Upstream image fetches pass through `imageRequestLimiter` (6 in flight, `src/lib/services/image-request-limiter.ts`), with deadlines shared by both transports (`src/lib/media/media-fetch.ts`): 20 s for Komga pages, 60 s for Stripstream pages/files, 12 s for covers/thumbnails. The Wall can request dozens of covers at once; without this gate a single-instance deployment and the provider collapse into timeouts that leave `<img>` elements pending forever. On the client, `useCoverLoaded` retries with a jittered backoff and, for visible covers, arms a watchdog that relaunches a stalled request; `failed` renders a title fallback instead of a black tile.
- **Wall preloading.** `wallPreloadUrls` (`src/lib/wall-cover.ts`) selects the covers at the centre of the initial composition; `WallExperience` emits `preload(..., { as: "image" })` during render (SSR included), so covers start downloading while the client JS hydrates. Visible tiles load eagerly, margin tiles stay lazy.
- **Wall gestures.** `WallExperience` is now only the composition (tiles, plaque, filters, keyboard). `useWallGestures` (`src/components/wall/useWallGestures.ts`) owns the native pointer state machine, wheel handling, pinch rebasing and iOS touch guards: the wall follows the finger 1:1 from the first pixel, a second finger rebases the gesture on the two-finger midpoint, and the point under the midpoint stays anchored while the scale follows the distance ratio. It reads the latest camera API through an internal ref so listeners attach once and a drag is never lost when the zoom bounds change, and it only depends on the camera methods it actually calls (`WallGestureCamera`). It reports the first accepted pointer and the last release through `onPanStart` / `onPanEnd`. Geometry and release-velocity sampling are pure functions in `src/lib/wall-gesture.ts`; zoom bounds and click-guard state live in `src/lib/wall-pinch.ts`. The whole `.wall-stage` is `touch-action: none`, except `[data-wall-ui]` descendants (filter sheet, HUD, plaque) which keep native scrolling. Because iOS standalone Safari can still zoom the viewport, a non-passive `touchmove` (two fingers) and WebKit `gesturestart`/`gesturechange` listeners cancel the native zoom before it moves the page. WebKit's synthetic `click`/`dblclick` after a drag or a two-finger pinch are ignored for 420/500 ms so the camera neither focuses a cover nor resets, and a finger left after the pinch continues the pan without a jump. Momentum applies a signed velocity measured over the last 120 ms with an exponential friction (`MOMENTUM_FRICTION`) in `src/lib/wall-momentum.ts`. Playwright/Chromium does not exercise the iOS pinch/native-zoom path (synthetic click after pinch, standalone viewport behaviour); the pure pinch geometry, clamp bounds, velocity sampling, click-guard decisions, camera framing and the hook wiring (pan, tap, ignored UI, pinch, wheel, listener cleanup) are unit-tested, but real-device iOS validation remains manual.
- **Wall phases.** `useWallPhase` (`src/components/wall/useWallPhase.ts`) is the single owner of `idle | pan | focus | plaque | sheet`, the plaque reveal timer and the lifetime of the pressed cover. The transition table and the reveal-delay rule are pure in `src/lib/wall-phase.ts`; the hook only adds React state, the timer and the `pressFocusedTile` hand-off. `WallExperience` derives `data-panning`, `data-focusing`, `data-plaque` and `data-sheet` from the phase instead of combining booleans, and `WallTile` receives `tiltAllowed` rather than reading `data-panning`/`data-plaque` from the DOM. A pan cancels the plaque and the pending flight; a settle moves `focus` to `plaque` (anchored panel) or `sheet` (mobile bottom sheet).
- **Wall filters.** The filter panel narrows the already-loaded `WallItem[]` client-side, by library and by reading state. `filterWallItems`/`isWallItemComplete` (`src/lib/wall-filter.ts`) treat a series as finished when `bookCount > 0 && booksReadCount >= bookCount`; a finished series is hidden only when the user enables the corresponding toggle. If a filter change empties the wall, the panel closes and the wall renders an empty overlay with a "show all" reset instead of a blank canvas (which also keeps the reset reachable above the mobile filter sheet). The filter session (`useWallFilters`, `src/components/wall/useWallFilters.ts`) is the single owner of the library list, selection, restore/write gate, visible items, composition seed (`selectionKey`), panel close on empty and the one-shot entrance skip; `WallExperience` only renders the panel. A `WallFilterStorage` adapter makes the hydration sequence testable with fake storage. Both choices persist per user in `localStorage` (`wall-libraries`, `wall-hide-read`).

## 3. Caching model

Provider reads use Next.js caching. Komga uses `unstable_cache(...)` at five sites: the four home feeds in `src/lib/providers/komga/komga.provider.ts` and the shared cached-POST wrapper in `src/lib/providers/provider-transport.ts`. `FavoriteService` no longer caches: SQLite reads are direct, Stripstream reads go through the provider. The **Stripstream provider does not use `unstable_cache`** — it passes `next: { revalidate, tags }` through the same transport, which forwards the options to fetch.

Tags and per-id tag builders live in `src/constants/cacheConstants.ts`. Providers ask the `cacheTags` vocabulary for an entity (`cacheTags.seriesBooks(id)`, `cacheTags.librarySeries(id)`, …), so renaming a tag breaks at compile time instead of silently orphaning entries:

| Tag constant | Tag value | Scope |
| --- | --- | --- |
| `HOME_CACHE_TAG` | `home-data` | global home feed |
| `LIBRARY_SERIES_CACHE_TAG` | `library-series` | library series listing |
| `SERIES_BOOKS_CACHE_TAG` | `series-books` | books of a series |
| `FAVORITES_CACHE_TAG` | `favorites` | favorites |
| `SERIES_RATING_CACHE_TAG` | `series-rating` | series ratings |
| `SERIES_SHELF_CACHE_TAG` | `series-shelf` | current reader's shelf state |
| `RATINGS_LIST_CACHE_TAG` | `ratings-list` | read series listed on `/ratings` |
| `STATS_CACHE_TAG` | `reading-stats` | reading statistics |
| `SERIES_RELATED_CACHE_TAG` | `series-related` | related series (TTL only) |
| `SERIES_RECOMMENDATIONS_CACHE_TAG` | `series-recommendations` | recommendations (TTL only) |

Per-id tags narrow invalidation: `cacheTags.librarySeries(id)`, `cacheTags.libraryBooks(id)`, `cacheTags.seriesBooks(id)`, `cacheTags.seriesRating(id)`, `cacheTags.seriesShelf(id)`, `cacheTags.seriesRelated(id)`. Prefer the narrow per-id tag when touching data: the global tag invalidates the whole scope and degrades the hit rate. The `series-related` and `series-recommendations` entries are TTL-only — no mutation invalidates them deliberately. A tag without a producing read is dead weight: do not invalidate one.

### TTLs

The constants are per provider: `CACHE_TTL_LONG = 300`, `CACHE_TTL_MED = 120`, `CACHE_TTL_SHORT = 30` seconds (`src/lib/providers/komga/komga.provider.ts`; the identical trio is at `src/lib/providers/stripstream/stripstream.provider.ts`).

| Read | TTL | Anchor |
| --- | --- | --- |
| `getLibraries()` | 300 s (5 min) | `komga.provider.ts:193-195` |
| `getSeries()` (library series listing) | 120 s (2 min), tags `library-series` + `library-series:${libraryId}` | `komga.provider.ts:229-230` |
| Home feeds (continue reading, ongoing, latest, recently read) | 120 s (2 min), tag `HOME_CACHE_TAG` | the `getHome*` methods in `komga.provider.ts` and `stripstream.provider.ts` |
| `getBook()` / `getSeriesById()` | 30 s / 120 s | `komga.provider.ts:301,311` |

### Invalidation

Server actions do not assemble tag lists themselves: they call a recipe from `src/lib/cache/invalidation.ts`. Each recipe is the single owner of the mapping “what changed → which cache entries and routes depend on it”:

| Recipe | Called by | Invalidates |
| --- | --- | --- |
| `invalidateReadProgress(seriesId?)` | `actions/read-progress.ts` | home, library series, ratings list, stats, `series-books:${id}` (global `series-books` when the series is unknown) |
| `invalidateSeriesRating(seriesId)` | `actions/ratings.ts` | `series-rating:${id}`, ratings list |
| `invalidateSeriesShelf(seriesId, libraryId?)` | `actions/series-shelf.ts` | home, `series-shelf:${id}`, the library's series list, and the matching routes |
| `invalidateFavorites()` | `actions/favorites.ts` | favorites, home |
| `invalidateConnectionChange()` | `actions/config.ts`, `actions/stripstream-config.ts` | home, library series, series books, favorites; `/settings` and `/` |
| `invalidateForRefresh(scope, id)` | `actions/refresh.ts` (thin wrapper) | only the requested scope; `series` also targets `series-books:${id}` so a list first cached from another route is refreshed |

Recipes call `updateTag(...)`, plus `revalidatePath(...)` where a route payload is affected. `updateTag` immediately expires the tagged entries so the action's own re-render sees fresh data (Next.js 16 read-your-writes semantics). The module imports `next/cache` and must only be imported from Server Actions / Route Handlers, never during render.

> Historical note: pre-overhaul documentation described `revalidateTag(tag, "max")`. The current code has **no `revalidateTag` call site** — the only remaining textual mention is a stale comment at `src/components/series/SeriesHeader.tsx:63`. Do not reintroduce `revalidateTag` blindly; follow the recipes above.

`force-dynamic` was deliberately removed from the image proxy routes so the handlers' `Cache-Control` headers take effect. The source of truth is `MEDIA_POLICIES` (`src/lib/media/policies.ts`): private/no-store for source files, one year for Komga reader pages, 30 days immutable for Komga images and Stripstream thumbnails, one day for Stripstream pages. `ProviderTransport.response()` returns the upstream headers untouched; the media adapter re-applies the policy at the route boundary. Do not reintroduce `force-dynamic` there. `force-dynamic` remains intentional on the settings/admin/account pages (`src/app/settings/page.tsx:9`, `src/app/admin/page.tsx:7`, `src/app/account/page.tsx:7`).

## 4. Error model

- All thrown domain errors are `AppError` (`src/utils/errors.ts:4-20`), carrying an `ErrorCode` plus optional message params.
- Codes are declared in `src/constants/errorCodes.ts:3-112`, grouped per domain: `AUTH`, `KOMGA`, `STRIPSTREAM`, `CONFIG`, `LIBRARY`, `SERIES`, `BOOK`, `FAVORITE`, `PREFERENCES`, `UI`, `IMAGE`, `HOME`, `MIDDLEWARE`, `CLIENT`, `ADMIN`.
- Provider HTTP errors map to status-aware codes via `codeForHttpStatus(status, codes)` (`src/utils/http-error.ts:16-22`): 401 → `UNAUTHORIZED`, 403 → `FORBIDDEN`, 404 → `NOT_FOUND`, 5xx → `SERVER_ERROR`, otherwise `HTTP_ERROR`. `isConnectionError()` (`http-error.ts:39-47`) detects network failures so they can be logged as warnings.
- User-facing messages are localized under `errors.${code}` in `src/i18n/messages/en/common.json` (block at `:387`) and `src/i18n/messages/fr/common.json` (`:390`). Add keys to **both** locales.
- Server actions return an `ActionResult` through the action runner: `ActionError` maps to its code and optional partial `actionData`, `AppError` maps to its code, and anything else maps to the action's fallback code/message. A failed action never runs its invalidation callback; a partial mutation that wrote some rows invalidates explicitly before throwing `ActionError`.
- Home tolerance: the home page fans out each feed as its own promise with an individual `.catch(...)` (`src/app/page.tsx:67-84`), so one failing feed renders empty instead of breaking the page. `KomgaProvider.getHomeContinueReadingData` uses `Promise.allSettled` over its two Komga calls and throws only when *every* call rejects (`src/lib/providers/komga/komga.provider.ts:481-521`); partial results degrade to empty lists.
- Credential-touching connection tests go through the runner's ordered `requireUser` + `rateLimit` gates (`testKomgaConnection` in `src/app/actions/config.ts`; `testStripstreamConnection` in `src/app/actions/stripstream-config.ts`). Keep that pattern for similar actions.

## 5. Reader

The reader lives in `src/components/reader/` (entry `BookReader.tsx`, page wiring `ClientBookPage.tsx` / `ClientBookWrapper.tsx`). Key hooks in `src/components/reader/hooks/`:

- `useReaderState.ts` — orchestrates page state across the book session.
- `usePageNavigation.ts` — applies the pure page-move policy (`src/lib/reader/page-navigation.ts`): initial page, previous/next landing (single or double page), start bump, end-of-book fallback and guarded jumps. It only applies decisions to React state, the read-progress session and the router.
- `useReadProgressSession.ts` — binds a mounted book to `ReadProgressSession` (`src/lib/reader/read-progress-session.ts`). The session owns the trackable cursor, the 500 ms debounce, immediate last-page completion, serialized writes and the unmount flush; it calls `updateReadProgress(bookId, page, completed, seriesId)` through an injected adapter so the `series-books:${seriesId}` tag can be invalidated granularly. Anonymous mode is a single gate in the session; the write sequence is unit-tested without React.
- `useImageLoader.ts` — owns the whole page-image lifetime. It receives `currentPage` / `shouldShowDoublePage`, prefetches visible and upcoming pages, retries with exponential backoff, tracks `AbortController`s, evicts outside the window and prefetches the next book. `BlobUrlRegistry` (`blobUrlRegistry.ts`) is the synchronous source of truth for live blob URLs; React state only feeds rendering through `getPageImage(pageNum)`, and replacement, eviction and unmount each revoke a URL exactly once. Eviction key computation lives in `imageEviction.ts` (`computeEvictionKeys`), which preserves `next-*` keys, and the same `prefetchKey(key, url)` path is used for current- and next-book prefetch.
- Display helpers: `useTouchNavigation.ts`, `useDoublePageMode.ts`, `useFullscreen.ts`, `useReadingDirection.ts`, `useOrientation.ts`, `useThumbnails.ts`. The reader always fits the page; the former width/height/original modes and the persisted `readerFitMode` value are no longer read.

Keyboard: `useReaderState` decodes every keypress through `resolveReaderShortcut` (`keyboardShortcuts.ts`, pure and unit-tested) and executes the returned action. Arrows stay spatial (inverted when `isRTL`), while `PageUp`/`PageDown`/`Espace`/`Maj + Espace`/`Home`/`End` keep a logical meaning ("next" is the next page whatever the direction). Letters toggle fullscreen (`F`, only when the API exists), double page (`D`), thumbnails (`T`), info (`I`) and reading direction (`R`); `?` opens `ReaderShortcutsDialog.tsx`, which lists the same mapping — keep the two in sync. The resolver returns nothing while an `input`/`textarea`/`select`/`contenteditable` has focus, while a modifier is held, and leaves `Espace` to the focused control so buttons keep working; when the info or shortcuts dialog is open the handler yields to Radix so `Échap` closes the dialog instead of the book.

Eviction and blob revocation are mandatory when navigating; otherwise memory grows unbounded on long books. The loader owns that policy: `useReaderState` only passes the current page and the double-page predicate, and must not reintroduce a second prefetch/eviction effect.

## 6. LocalStorage scoping

Anything user-specific stored in `localStorage` must be scoped by the signed-in user, otherwise two accounts on the same device share state. `buildStorageKey(scope, key)` (`src/lib/storage.ts`) namespaces every key as `stripstream:<userId>:<key>`. The scope is the user id resolved on the server in `src/app/layout.tsx` (`getCurrentUser`) and read in client components through `useUserScope()` (`src/contexts/UserScopeContext.tsx`) — never guessed client-side; public pages fall back to the `anonymous` scope. Current consumers: `pwa-install-dismissed` (`src/components/ui/InstallPWA.tsx`), the Wall filters `wall-libraries` / `wall-hide-read` (`src/components/wall/useWallFilters.ts`) and the per-row carousel view modes (`recommendations-view-mode`, `home-<feed>-view-mode`, `home-reading-lists-view-mode`, `series-related-view-mode`) through `useCarouselViewMode` (`src/hooks/useCarouselViewMode.ts`). i18n language detection now reads only the `NEXT_LOCALE` cookie (`src/i18n/i18n.ts`), which the server can read too, so hydration stays stable. Read progress and reading direction are persisted server-side through server actions (`src/app/actions/read-progress.ts`, `src/app/actions/preferences.ts`), so they never live in localStorage.

## 7. i18n

`react-i18next` is initialized in `src/i18n/i18n.ts` (`initReactI18next` + `i18next-browser-languagedetector`). Namespaces are JSON dictionaries in `src/i18n/messages/en/common.json` and `src/i18n/messages/fr/common.json`. Add every user-facing key to both locales; error copy lives under `errors.${ERROR_CODE}`. Language detection reads the `NEXT_LOCALE` cookie only (no `navigator`/`localStorage` lookup), so the client and the server (`src/app/layout.tsx`, `src/proxy.ts`) always agree and hydration stays stable.

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

`checkRateLimit(key, { limit, windowMs })` in `src/utils/rate-limit.ts:30-53` is an in-memory, per-process `Map` (`:13`). It resets on every redeploy and is not shared across instances (documented in the file header, `:1-6`). That is acceptable for the current single-instance SQLite-bound deployment; if the app scales horizontally it must move to a shared store. Connection tests use the action runner's native `rateLimit` gate (limit 5 / 30 s) with the key and budget exported by `src/lib/connections/probe.ts` (`connectionTestRateLimitKey`, `CONNECTION_TEST_RATE_LIMIT`), so both config action files share one budget per provider/user. Auth flows use `ERROR_CODES.AUTH.RATE_LIMITED` through the same primitive.

## 10. PWA / offline state

The app is installable as a PWA shell only: `public/manifest.json` is linked from the root metadata (`src/app/layout.tsx`) and `InstallPWA` renders the install prompt (`src/components/ui/InstallPWA.tsx`, mounted from `src/components/layout/ClientLayout.tsx`). iOS ignores the manifest for its launch screen, so the root layout also declares one `apple-touch-startup-image` link per supported device and orientation from `SPLASH_SCREENS` (`src/constants/splashScreens.ts`). That list reads `src/constants/splashScreens.json`, which `scripts/generate-icons.js` (`pnpm icons`) uses to render `public/images/splash/*.png`; the two must stay in step. Offline reading and the Service Worker were removed: there is no `public/sw.js`, no Cache Storage usage, and no book-download feature. All pages, API data, and images are fetched from the network (Next.js / native HTTP caching only).

## 11. Known limitations / open issues

### (a) Provider credentials are encrypted at rest

- The Komga `authHeader` and the Stripstream `token` are stored with an AES-256-GCM envelope (`enc:v1:<iv>:<tag>:<ciphertext>`) produced by `src/lib/credentials.ts`. The key comes from `CREDENTIALS_ENCRYPTION_KEY` (32 bytes base64 or 64 hex characters). Encryption happens at the write boundary (`src/app/actions/config.ts` and `src/app/actions/stripstream-config.ts`, both through `src/lib/connections/manage.ts`); decryption happens in `src/lib/connections/resolve.ts` before a provider or probe receives the connection.
- Legacy plaintext rows keep working: a value without the `enc:v1:` prefix is returned as-is. `pnpm encrypt-credentials` migrates them idempotently (it skips already-encrypted rows); in production run it inside the container (`docker exec <container> ./node_modules/.bin/tsx scripts/encrypt-credentials.ts`, the runner image has no pnpm). It is a script rather than a Prisma migration on purpose: migrations are plain SQL run in environments that may not hold the key (CI, container boot, fresh clone), and SQLite cannot compute AES-256-GCM. See `ENV.md`.
- Without `CREDENTIALS_ENCRYPTION_KEY`, writes fall back to plaintext with a logged warning so an upgrade never bricks the app, but reading an already-encrypted row fails loudly (`CREDENTIALS_MISSING_ENCRYPTION_KEY`) instead of failing silently.
- Residual limitation: the key lives in the process environment next to the database, so an attacker with full host access can read both. Losing or rotating the key makes stored credentials unreadable — they must be re-entered in the settings.
- Status: **mitigated** (previously: plaintext, open).

### (b) localStorage keys are not scoped per user

`buildStorageKey(scope, key)` (`src/lib/storage.ts`) now namespaces every user-specific key as `stripstream:<userId>:<key>`. The scope is the user id resolved server-side in `src/app/layout.tsx` and exposed to client components through `UserScopeProvider` (`src/contexts/UserScopeContext.tsx`), so `pwa-install-dismissed` (`src/components/ui/InstallPWA.tsx`), `recommendations-view-mode` (`src/components/home/RecommendationsRow.tsx`) and the Wall filters `wall-libraries` / `wall-hide-read` (`src/components/wall/useWallFilters.ts`) no longer leak across accounts; i18n detection reads the cookie only (`src/i18n/i18n.ts`). See §6.

- Status: **resolved** (previously: keys shared across accounts, open).

### (c) Unit-test coverage is partial

Vitest runs the unit suite (`pnpm test:unit`; config `vitest.config.ts`; tests colocated as `src/**/*.test.ts`). Default environment is `node` for pure logic; files that need a DOM opt in per-file with a `// @vitest-environment jsdom` docblock (plus `@testing-library/react`). It currently covers the reader eviction helper (`src/components/reader/hooks/imageEviction.ts`), the page-image lifetime (`src/components/reader/hooks/useImageLoader.ts` and `blobUrlRegistry.ts`: visible-page fetch, single/double mode, dedupe, eviction, unmount revocation, next-book prefetch, retry), the page-turn helper (`src/components/reader/hooks/pageTurn.ts`), the pure page-move policy (`src/lib/reader/page-navigation.ts`: initial page, single/double landing, start bump, end fallback, jumps), the reader navigation/double-page hooks (`src/components/reader/hooks/usePageNavigation.ts`, `useDoublePageMode.ts`), the read-progress session (`src/lib/reader/read-progress-session.ts`: debounce, completion, flush, serialization, anonymous gate), the preferences writer (`src/lib/preferences/preferences-writer.ts`: optimistic merge, nested patches, coalescing, serialization, rollback, flush, auth reset) and its context adapter (`src/contexts/PreferencesContext.tsx`: action result, toast policy, silent failures), the series mutation protocol (`src/contexts/SeriesMutationsContext.tsx`: optimism, rollback, pending lock, shelf undo, sidebar synchronization) and its event adapter (`src/lib/series/favorite-events.ts`), the refresh surface (`src/components/common/RefreshSurface.tsx`: scope invalidation, one route refresh, pending lock, shared in-flight cycle) and its generic button (`src/components/common/RefreshButton.tsx`), the reader keyboard resolver (`src/components/reader/hooks/keyboardShortcuts.ts`), the action runner (`src/lib/actions/action-runner.ts`), the page-surface gateway (`src/lib/surfaces/surface-loader.ts`), the media route core (`src/lib/media/media-route-core.ts`: 304/cache headers, nested 404, empty thumbnail failure, unauthenticated short-circuit, provider status mapping), the provider transport and both request policies (`src/lib/providers/provider-transport.test.ts`: URL/auth, retry differences, empty bodies, error codes, cached POSTs, byte responses), the media transports (`src/lib/media/komga.transport.test.ts`, `stripstream.transport.test.ts`: zero-based pages, cover preferences, first-book resolution, deduplication, file streaming), the Wall phase table and plaque delay (`src/lib/wall-phase.ts`), the Wall gesture/camera hooks, the Wall filter session (`src/components/wall/useWallFilters.test.ts`: restore, write gate, StrictMode, storage failure, empty-panel close), the error helpers (`src/utils/errors.ts`, `src/utils/image-errors.ts`), the generic utilities (`src/lib/utils.ts`), the toast reducer (`src/components/ui/use-toast.ts`), `src/lib/pageSize.ts`, `src/lib/storage.ts`, `src/lib/providers/scan-status.ts`, `src/utils/http-error.ts`, `src/utils/rate-limit.ts`, `src/lib/providers/ratings.ts`, the connection module (`src/lib/connections/resolve.ts`, `manage.ts`, `probe.ts`, with mocked Prisma/factory), the credential encryption helpers (`src/lib/credentials.ts`, `src/lib/credentials-migration.ts`) and both provider adapters (Komga + Stripstream normalization). Heavier browser flows that require real paint (page-turn animation, reader gestures) remain exercised through the Playwright E2E suite under `tests/`. The minimum quality gate is `pnpm lint` (0 warnings) + `pnpm typecheck` + `pnpm test:unit`; E2E (`pnpm test:e2e`) is run separately.

### (d) Minor open backlog (last codebase audit)

- **Reader page bounds** — resolved by the pure page-move policy (`src/lib/reader/page-navigation.ts`): initial page clamping, empty page lists and double-page steps at both ends are unit-tested; `usePageNavigation` only applies the decisions.
- **Unstable list keys in skeletons** — `src/components/skeletons/RouteSkeletons.tsx:7,107` still renders `key={index}`; replace with stable keys.
- **Unlogged `Promise.allSettled` rejections** — `src/app/settings/page.tsx:22-30` silently ignores rejected branches, and `KomgaProvider.getHomeContinueReadingData` degrades partial failures to empty arrays without logging the reasons (`src/lib/providers/komga/komga.provider.ts:489-499`). Add `logger.warn` on rejected results.
- **`AbortController` cleanup** — `useImageLoader` relies on the trailing `.finally()` to delete controllers/promises (`src/components/reader/hooks/useImageLoader.ts:266-270`); there is no defensive `try/catch` inside the cleanup, so a catastrophic throw before it would leak entries in the tracking maps.

### (e) Library scan progress depends on the backend

`scanLibrary` only reports progress when the backend exposes a job handle, and `getScanStatus` follows it through a pure mapper (`src/lib/providers/scan-status.ts`, unit-tested). Constraints:

- **Komga 1.24.1** has no task-status endpoint (`TaskController` only exposes `DELETE /tasks`, admin, and the queue counters are admin-only per-type SSE events), so `getScanStatus` returns `unavailable` and the UI shows "scan started, progress unavailable" instead of inventing a completion.
- **Stripstream Librarian** returns an index job from `POST /libraries/{id}/scan`, but the job routes (`GET /index/jobs/{id}`) live on its admin API: a `read`-scoped token gets a `403`, which degrades to `unavailable` for the client and to an explicit "administrator access required" toast on the scan itself.
- Status: **mitigated** — the previous fixed `setTimeout(5 s)` + unconditional "scan complete" toast were replaced by bounded polling (2 s interval, 10 min ceiling, 3 consecutive `unavailable` stop the loop).

## 12. Motion

All motion runs on **GSAP 3.15**; framer-motion has been removed. One language is shared site-wide: scenes tilt toward the viewer, covers fly in from depth, title words flip in 3D (`SplitText`, split at play time), lines rise in a short cascade, with `back.out` overshoot.

- **Engine setup**: `src/lib/gsap.ts` registers `ScrollTrigger`, `CustomEase` and `SplitText`, defines the named curves `projection` / `out` / `focus` (`--ease-projection` mirrors `projection` in CSS), and exports `useGsapEffect`. Use it instead of `@gsap/react`'s `useGSAP`: it runs the effect in a `gsap.context` and, on every dependency change as well as on unmount, calls the returned cleanup and kills the context's animations. `useGSAP` defers cleanup to unmount when `dependencies` are set, which left conditional `repeat: -1` loops running forever.
- **Shared primitives** (`src/components/motion/index.tsx`): `StaggerGroup`/`StaggerItem` (scroll reveal; items added later start their own wave), `Magnetic`, `CountUp`, `ProgressFill`, `ScrollProgress`, `useBannerScene` (library/series banners: unroll, 3D entrance, ScrollTrigger exit) `usePresence`, which replaces `AnimatePresence` by keeping an element mounted until its exit timeline completes. Paginated grids keep their cards keyed by id: `usePaginatedGrid` captures their layout on a compact/sort/filter action (`useGridFlip`) and, when the shown content changes, `useGridFlipPlayback` slides each surviving card to its new place with GSAP `Flip` while new cards play their own entrance. Grids dim only while a content-replacing navigation is pending (`useTransition`); compact and page-size changes slide without dimming. Action feedback lives in `src/lib/celebrate.ts` (`pop`, `nudge`, `drop`, `burst`). Radix dialogs, toasts and tab panels use CSS keyframes (`animate-dialog-in|out`, `animate-toast-in-*`, `animate-tab-in`) so unmounting still waits for the exit.
- **Where it is used**: route template (`src/app/template.tsx`), home hero and spotlight carousels, section headers (`src/components/ui/section.tsx`), `HomeWelcome`, login, sticky header, sidebar `NavButton` (FLIP of the active background), reader (thumbnail strip, end-of-series modal, info dialog), and the Wall. `ProjectionBackdrop` fades in with a CSS animation.
- **Wall camera**: `useWallCamera` (`src/components/wall/useWallCamera.ts`) owns the `MotionNumber`s (`x` / `y` / `scale`, `src/lib/motion-value.ts`), the canvas ref, the stage `ResizeObserver`, the legal zoom floor, the initial framing and the momentum loop. Gestures only call its API; the canvas still follows the values through `useCameraStyle`, outside React. `useWallPhase` owns the interaction phase and the plaque timer; the transition table lives in `src/lib/wall-phase.ts`. The pure framing/zoom/anchor geometry lives in `src/lib/wall-camera.ts` and is tested directly. The wall opens with a dolly-in; the plaque swings out from its cover (sheet slides up on mobile) and the filter panel tilts in from its corner.
- **Initial states live in CSS**, not in JS, so the server HTML never flashes the final state before hydration: `[data-stagger-item]`, `[data-hero-intro]`, `[data-hero-backdrop]`, `[data-hero-fly]`, `[data-hero-item]`, `[data-spotlight-shell|backdrop|content]`, `[data-spot-fly|item]`, `[data-section-header]`, `[data-banner-unroll]`, `[data-login]` (`src/styles/globals.css`). The route wrapper `[data-route-enter]` is the exception: it starts translated but fully opaque, so the server-streamed skeleton is visible before hydration on a slow iOS PWA launch; its slide still plays once GSAP mounts. Each GSAP timeline removes its attribute and clears inline props on completion. `@media (prefers-reduced-motion: reduce)` and `@media (scripting: none)` force the visible state.
- **Reduced motion is checked twice**: `usePrefersReducedMotion()` drives render-time decisions, and every GSAP callback also calls `prefersReducedMotion()` because the external-store snapshot can still be the server value during the first hydration pass.
- **Hero depth**: the intro animates `transform` on the section and the flying cover, so mouse tilt and the scroll pop-up only start once `introDone` is set. Scroll depth is written to `--hero-progress` and mouse tilt to `--tilt-x`/`--tilt-y`; CSS consumes them through the individual `translate`/`scale` properties, which compose with GSAP's `transform`.
- **Spotlight slides** mark their cover, title and lines with `useSpotlightStaging()` (`src/components/ui/spotlight-carousel.tsx`). The carousel plays the same 3D entrance as the hero once, on first reveal; later slide changes only use the `DirectionalSlide` card throw, so the content never replays its cascade.
- **Carousel swaps** go through `DirectionalSlide` (`src/components/ui/directional-slide.tsx`): the entering slide stays in flow, the outgoing slide is absolute and `inert` and is thrown toward the viewer while the entering one rises from depth, and pointer capture is only taken once a horizontal drag is confirmed so buttons keep their click target. Slides are keyed by id; a spotlight slide only plays its entrance cascade on the carousel's first reveal (`useSpotlightStaging`).

## Where to look

- Provider abstraction: `src/lib/providers/`
- Resume state: `src/lib/resume/`
- Server actions: `src/app/actions/`
- Data model and migrations: `prisma/schema.prisma`, `prisma/migrations/`
- Error codes and copy: `src/constants/errorCodes.ts`, `src/i18n/messages/{fr,en}/common.json`
- Reader: `src/components/reader/`
- Motion: `src/lib/gsap.ts`, `src/components/motion/index.tsx`, `src/lib/motion-value.ts`, `src/components/ui/directional-slide.tsx`
- Environment: `ENV.md`; API surface: `docs/api.md`; agent guide: `AGENTS.md`.
