# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 9** (lockfile-pinned). All commands run from repo root.

| Command | Use |
|---|---|
| `pnpm dev` | Local dev server (Next 16 App Router) |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | ESLint — must pass with **0 warnings** |
| `pnpm typecheck` | `tsc --noEmit`, strict |
| `pnpm init-db` | Init SQLite schema + admin user |
| `pnpm reset-admin-password` | Reset default admin password |
| `pnpm icons` | Regenerate PWA icons + splash screens |
| `prisma migrate dev --name <n>` | Create + apply a new migration |

No automated test runner is installed. Minimum quality gate per change: `pnpm lint && pnpm typecheck`. For UI work, smoke-test the affected route (home / libraries / series / reader) in dev before declaring done.

## Architecture

### Multi-provider abstraction (the core pattern)

Stripstream is a comic reader frontend. It does **not** own the library — it talks to one of two backends per user:
- **Komga** (Spring API, basic auth)
- **Stripstream Librarian** (custom API, bearer token)

`src/lib/providers/provider.interface.ts` defines `IMediaProvider` (libraries, series, books, read progress, search, URL builders). Two concrete impls: `komga/komga.provider.ts`, `stripstream/stripstream.provider.ts`. Server code requests the active provider via:

```ts
const provider = await getProvider(); // src/lib/providers/provider.factory.ts
```

The factory reads `User.activeProvider` + `activeKomgaConfigId` / `activeStripstreamConfigId` from Prisma and returns the right impl. **Never bypass this** — direct calls to provider classes break multi-config support.

A user can hold multiple `KomgaConfig` and `StripstreamConfig` rows; only one of each type is active at a time. `Favorite` is scoped per `(userId, komgaConfigId|stripstreamConfigId, seriesId)` so favorites don't leak across configs.

### Server-first data flow

Pages (`src/app/**/page.tsx`) and layouts are React Server Components. They fetch via the provider, pass serialized normalized props to client components. Mutations live in `src/app/actions/*.ts` (Next.js server actions). Client components (`"use client"`) are reserved for browser-only concerns: event handlers, refs, effects. **Don't introduce client-side `fetch` to internal APIs when a server action would do.**

Image streams are an exception: `/api/komga/...` and `/api/stripstream/images/...` proxy thumbnails and pages so the browser can `<img src=...>` them with auth handled server-side.

### Caching with granular tags

Server provider methods wrap reads in `unstable_cache(...)` with tags from `src/constants/cacheConstants.ts` plus per-id tags:
- `HOME_CACHE_TAG` — global home
- `LIBRARY_SERIES_CACHE_TAG` + `library-series:${libraryId}`
- `SERIES_BOOKS_CACHE_TAG` + `series-books:${seriesId}`
- `FAVORITES_CACHE_TAG`

Mutations call `revalidateTag(tag, "max")` (Next 16 requires the second arg). Touch only the narrow per-id tag when possible — the global tag invalidates everything for that scope and tanks hit rate. `force-dynamic` was deliberately removed from image routes; do not reintroduce it without a specific reason.

### Errors

All thrown errors should be `AppError` from `src/utils/errors.ts`, with a code from `src/constants/errorCodes.ts` and a localized message keyed by `errors.${code}` in `src/i18n/messages/{fr,en}/common.json`. Provider errors are status-aware: use `codeForHttpStatus(status, codes)` from `src/utils/http-error.ts` to map 401/403/404/5xx onto provider-specific codes (`KOMGA_UNAUTHORIZED`, `STRIPSTREAM_NOT_FOUND`, etc.). `getHomeData` uses `Promise.allSettled` and only throws past a failure threshold so the home stays usable when one provider is down.

Test-connection actions (`testKomgaConnection`, `testStripstreamConnection`) are gated by `requireUserId()` + `checkRateLimit` (`src/utils/rate-limit.ts`) — keep that pattern when adding similar credential-touching actions.

### Reader (`src/components/reader/`)

The reader is the most stateful surface. Key hooks in `src/components/reader/hooks/`:
- `useReaderState` — orchestrates page state across the book session
- `usePageNavigation` — prev/next, syncs `read-progress` server action with `seriesId` to allow granular cache invalidation
- `useImageLoader` — concurrent prefetch + retry with exponential backoff + LRU-style window eviction (`computeEvictionKeys` in `imageEviction.ts`); same `prefetchKey(key, url)` is used for current and next-book pages
- `useTouchNavigation`, `useDoublePageMode`, `useFitMode`, `useFullscreen`, `useReadingDirection`

The reader holds blob URLs for fetched pages — eviction is mandatory when navigating, otherwise memory grows unbounded on long books.

### LocalStorage scoping

Anything user-specific stored in `localStorage` must be scoped (otherwise user A and user B on the same device share state). `ClientOfflineBookService` scopes per origin extracted from `book.thumbnailUrl`. Other keys (e.g. reading direction) are still global today — note this when adding new client storage.

### i18n

`react-i18next` with namespaces under `src/i18n/messages/{fr,en}/common.json`. Add a key in **both** locales when introducing user-facing copy. Error messages live under `errors.${ERROR_CODE}`.

## Conventions

- **TypeScript strict** (no `any` without `eslint-disable` justification)
- **2-space indent**, ESLint + Prettier enforce style; gate is `pnpm lint && pnpm typecheck`
- Components `PascalCase.tsx`, hooks `useThing.ts`, services `*.service.ts`
- Use existing primitives in `src/components/ui/` before adding new ones; Radix is wired up for dialog, dropdown, collapsible, radio-group, toast
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `perf:`)
- The `<img>` lint rule is intentionally disabled for cover components (`book-cover`, `series-cover`, `BookGrid`, `BookList`, `GlobalSearch`, `cover-client`) because their `src` is already a thumbnailed proxy URL — `next/image` would just add an optimizer round-trip. Don't switch them to `next/image`.

## Where to look

- `project-intelligence/audit-2026-04-30.md` — audit + status of fixed/pending items
- `prisma/schema.prisma` — data model (multi-config + favorites scoping)
- `src/lib/providers/` — provider abstraction (start here for backend questions)
- `src/app/actions/` — all server-side mutations
- `src/i18n/messages/{fr,en}/common.json` — copy + error messages
- `ENV.md` — environment variables (DB, NextAuth, Komga concurrency)
- `AGENTS.md` — repository guidelines (server-first, RSC defaults, commit/PR style)
