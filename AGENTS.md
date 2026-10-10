# Repository Guidelines

Canonical guide for engineers and coding agents working on Stripstream. Claude Code should follow this file too.

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages (`page.tsx`), layouts, the 11 `route.ts` handlers, and server actions under `src/app/actions/`.
- `src/components/`: UI and feature components (`home/`, `reader/`, `layout/`, `ui/`).
- `src/lib/`: shared services (`services/`), media providers (`providers/`), auth, logger, utilities.
- `src/lib/providers/`: the media-provider abstraction (interface, factory, Komga + Stripstream implementations).
- `src/hooks/`, `src/contexts/`, `src/types/`, `src/constants/`: reusable runtime logic, typing, and cache/error constants.
- `src/i18n/messages/{en,fr}/`: translation dictionaries, including `common.json`.
- `src/utils/`: error types, HTTP error mapping, rate limiting.
- `prisma/`: SQLite schema, migrations, and seed artifacts.
- `public/`: static files and PWA shell assets.
- `scripts/`: maintenance scripts (DB init, admin password reset, icon generation).
- `tests/`: Playwright E2E suite, organized by user-facing area.
- `docs/`: architecture, API, and Komga references.

## Build, Test, and Development Commands
Use `pnpm` (lockfile and `packageManager` are configured for it). All commands run from repo root.
- `pnpm dev`: start local dev server (Next 16 App Router).
- `pnpm build`: create production build.
- `pnpm start`: run production server.
- `pnpm lint`: run ESLint across the repo. Must pass with 0 warnings.
- `pnpm typecheck` or `pnpm -s tsc --noEmit`: strict TypeScript checks.
- `pnpm init-db`: seed the admin user (run after applying migrations).
- `pnpm reset-admin-password`: reset admin credentials.
- `pnpm icons`: regenerate PWA icons and splash screens.
- `pnpm prisma migrate deploy`: apply pending migrations (or `pnpm prisma migrate dev --name <n>` while developing).

## Testing Guidelines
Playwright E2E is the only automated test suite. There is no unit-test runner.
- `pnpm test:e2e`: build `.next-e2e` then run the full suite (`setup`, then `read-only`, then `mutating`).
- `pnpm test:e2e:read-only`: run only read-only journeys (plus the `setup` dependency).
- `pnpm test:e2e:mutating`: run only mutating journeys (plus `setup` and `read-only` dependencies).
- `pnpm test:e2e:ui`: interactive UI mode.
- `pnpm test:e2e:run`, `test:e2e:build`, `test:e2e:report`, `test:e2e:timings`: rerun without rebuilding, build only, open the last report, and parse a JSON report.
- Prerequisite once per machine: `pnpm exec playwright install chromium`.
- `tests/README.md` is the reference for projects, execution order, auth state, the read-only runtime proof, and E2E environment variables.
- Minimum quality gate for every change: `pnpm lint` (0 warnings) and `pnpm typecheck`.
- For UI changes, smoke-test the affected routes (home, libraries, series, reader) in both themes.

## Architecture

### Multi-provider abstraction (the core pattern)
Stripstream is a comic reader frontend and does **not** own the library. It talks to one of two backends per user:
- **Komga** (Spring API, basic auth)
- **Stripstream Librarian** (custom API, bearer token)

`src/lib/providers/provider.interface.ts` defines `IMediaProvider` (libraries, series, books, read progress, search, URL builders). Two concrete implementations live in `komga/komga.provider.ts` and `stripstream/stripstream.provider.ts`. Server code requests the active provider via:

```ts
const provider = await getProvider(); // src/lib/providers/provider.factory.ts
```

The factory resolves the per-browser active connection through `getActiveConnection(userId)` (`src/lib/active-connection.ts:24-67`), which reads the httpOnly cookies `stripstream-active-provider` and the matching config cookie, validates the id against the user's rows, and falls back to the user's first config. The `User.activeProvider` / `activeKomgaConfigId` / `activeStripstreamConfigId` columns are legacy and are not read by app code (only written by `tests/global-setup.ts`). **Never bypass this**. Direct calls to provider classes break multi-config support.

A user can hold multiple `KomgaConfig` and `StripstreamConfig` rows; only one of each type is active at a time. `Favorite` is scoped per `(userId, komgaConfigId|stripstreamConfigId, seriesId)` so favorites do not leak across configs.

### Server-first data flow
Pages (`src/app/**/page.tsx`) and layouts are React Server Components. They fetch through the provider and pass serialized normalized props to client components. Mutations live in `src/app/actions/*.ts` (Next.js server actions). Client components (`"use client"`) are reserved for browser-only concerns: event handlers, refs, effects. **Do not introduce client-side `fetch` to internal APIs when a server action would do.**

Image streams are the exception: `/api/komga/...` and `/api/stripstream/images/...` proxy thumbnails and pages so the browser can use `<img src=...>` with auth handled server-side.

### Caching with granular tags
The **Komga** provider (and favorites) wrap reads in `unstable_cache(...)` with tags from `src/constants/cacheConstants.ts` plus per-id tags. The **Stripstream** provider caches through fetch options (`next: { revalidate, tags }`) in `src/lib/providers/stripstream/stripstream.client.ts`. Tag scopes:
- `HOME_CACHE_TAG` for the global home feed.
- `LIBRARY_SERIES_CACHE_TAG` + `library-series:${libraryId}`.
- `SERIES_BOOKS_CACHE_TAG` + `series-books:${seriesId}`.
- `BOOK_CACHE_TAG` for single-book reads.
- `SERIES_RATING_CACHE_TAG` for series ratings.
- `FAVORITES_CACHE_TAG`.

This list covers the main scopes; see `docs/architecture.md` §3 for the full tag table and TTLs.

Mutations invalidate caches with `updateTag(...)` from `next/cache` (plus `revalidatePath(...)` where a route needs it). The call sites live in `src/app/actions/`: `favorites.ts`, `read-progress.ts`, `ratings.ts`, `config.ts`, `stripstream-config.ts`, and `refresh.ts`. Touch only the narrow per-id tag when possible: the global tag invalidates everything for that scope and tanks hit rate. `revalidateTag` is historical only; there is no call site in `src/` (the lone textual mention is a stale comment in `src/components/series/SeriesHeader.tsx`). `force-dynamic` was deliberately removed from image routes; do not reintroduce it without a specific reason.

### Errors
All thrown errors should be `AppError` from `src/utils/errors.ts`, with a code from `src/constants/errorCodes.ts` and a localized message keyed by `errors.${code}` in `src/i18n/messages/{fr,en}/common.json`. Provider errors are status-aware: use `codeForHttpStatus(status, codes)` from `src/utils/http-error.ts` to map 401/403/404/5xx onto provider-specific codes (`KOMGA_UNAUTHORIZED`, `STRIPSTREAM_NOT_FOUND`, etc.). `getHomeContinueReadingData` uses `Promise.allSettled` and only throws past a failure threshold so the home stays usable when one provider is down (`getHomeData` itself uses `Promise.all`).

Test-connection actions (`testKomgaConnection`, `testStripstreamConnection`) are gated by `requireUserId()` + `checkRateLimit` from `src/utils/rate-limit.ts`. Keep that pattern when adding similar credential-touching actions.

### Reader (`src/components/reader/`)
The reader is the most stateful surface. Key hooks in `src/components/reader/hooks/`:
- `useReaderState`: orchestrates page state across the book session.
- `usePageNavigation`: prev/next, syncs the `read-progress` server action with `seriesId` for granular cache invalidation.
- `useImageLoader`: concurrent prefetch + retry with exponential backoff + LRU-style window eviction (`computeEvictionKeys` in `imageEviction.ts`); the same `prefetchKey(key, url)` is used for current and next-book pages.
- `useTouchNavigation`, `useDoublePageMode`, `useFitMode`, `useFullscreen`, `useReadingDirection`.

The reader holds blob URLs for fetched pages. Eviction is mandatory when navigating, otherwise memory grows unbounded on long books.

### LocalStorage scoping
Anything user-specific stored in `localStorage` must be scoped, otherwise user A and user B on the same device share state.

**Known limitation**: thumbnail URLs are relative proxy paths (`/api/komga/...`), so the resolved origin is always the current Stripstream deployment. Two accounts on the *same* Stripstream share the unscoped localStorage keys `pwa-install-dismissed` (`src/components/ui/InstallPWA.tsx:16`) and `recommendations-view-mode` (`src/components/home/RecommendationsRow.tsx:35`). Read progress and reading direction are persisted server-side (`src/app/actions/read-progress.ts`, `src/components/reader/hooks/useReadingDirection.ts:11`), so they no longer live in localStorage. See `docs/architecture.md` §6 and §11(b).

### i18n
`react-i18next` with namespaces under `src/i18n/messages/{fr,en}/common.json`. Add a key in **both** locales when introducing user-facing copy. Error messages live under `errors.${ERROR_CODE}`.

### Prisma migrations on SQLite
SQLite's `ALTER TABLE` only supports adding columns and renaming. Anything else (changing a constraint, dropping a column, switching `@unique` shape) requires the **manual rebuild pattern** used by `20260429000000_multi_config` and `20260505000000_dedupe_favorites`:

```sql
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_x" (...);          -- new shape
INSERT INTO "new_x" SELECT ... FROM "x";
DROP TABLE "x";
ALTER TABLE "new_x" RENAME TO "x";
-- recreate indexes
PRAGMA foreign_keys=ON;
```

Do not let Prisma auto-generate when changing constraints; it will lose data. Hand-write the SQL, preserve rows in `INSERT ... SELECT`, and make the migration idempotent so re-runs in dev/prod are no-ops. Migrations are applied automatically via `prisma migrate deploy` on prod boot.

After creating or changing `.env`/`DATABASE_URL`, run `pnpm prisma generate` so the generated client and standalone scripts such as `scripts/init-db.mjs` read the new value. This matters on a fresh clone: `pnpm install` runs `prisma generate` in its postinstall hook before `.env` exists, so the client must be regenerated once the file is created.

### PWA / offline
Offline reading and the service worker were removed. There is **no** `public/sw.js`, no Cache Storage usage, and no book-download feature. All pages, API data, and images are fetched from the network (Next.js/native HTTP caching only).

The web app manifest (`public/manifest.json`) and `InstallPWA` are kept so the app can still be installed as a PWA shell, but nothing is cached for offline use.

### Rate limiting
`checkRateLimit` from `src/utils/rate-limit.ts` is **in-memory per process**, so it resets on every redeploy and is not shared across instances. Acceptable for the current SQLite-bound mono-instance deployment; if we ever scale horizontally, this needs to move to a shared store.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts/.tsx`) with React function components; strict mode (no `any` without an `eslint-disable` justification).
- Architecture priority: **server-first**. Default to React Server Components (RSC) for pages and feature composition.
- Data mutations: prefer **Server Actions** (`src/app/actions/`) over client-side fetch patterns.
- Client components (`"use client"`): use only for browser-only concerns (event handlers, local UI state, effects, DOM APIs).
- Data fetching: do it on the server first (`page.tsx`, server components, services in `src/lib/services`), then pass serialized props down.
- Indentation: 2 spaces; keep imports grouped and sorted logically. ESLint + Prettier enforce style.
- Components/hooks/services: `PascalCase.tsx` for components, `useThing.ts` for hooks, `camelCase` for functions, `*.service.ts` for service modules.
- Styling: Tailwind utility classes; prefer existing `src/components/ui` primitives before creating new ones. Radix is wired up for dialog, dropdown, collapsible, radio-group, and toast.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `perf:`).
- The `<img>` lint rule is intentionally disabled for cover components (`book-cover`, `series-cover`, `BookGrid`, `BookList`, `GlobalSearch`, `cover-client`) because their `src` is already a thumbnailed proxy URL and `next/image` would just add an optimizer round-trip. Do not switch them to `next/image`.
- Quality gates: `pnpm lint` (0 warnings) and `pnpm typecheck` must pass before merge.

## Commit & Pull Request Guidelines
- Follow the Conventional Commit style seen in history: `fix: ...`, `refactor: ...`, `feat: ...`, `docs: ...`.
- Keep subjects imperative and specific (e.g. `fix: reduce header/home spacing overlap`).
- PRs should include:
  - short problem/solution summary,
  - linked issue (if any),
  - screenshots or a short video for UI updates,
  - verification steps/commands run.

## CI/CD
GitHub Actions is the single deployment path (the former Gitea pipeline has been retired).
- `.github/workflows/ci.yml` — PR-only quality gate: `pnpm install --frozen-lockfile`, `pnpm lint`,
  `pnpm typecheck`, `pnpm build`. Its `Quality (lint · typecheck · build)` check is required on `main`.
- `.github/workflows/deploy.yml` — on push to `main` (or manual dispatch) it builds the image on a
  GitHub-hosted runner and pushes `latest`, `<version>` and `<version>-<sha>` to Docker Hub
  (`julienfroidefond32/stripstream`, registry cache tag `buildcache`), then deploys on the self-hosted
  `mac-mini` runner: `docker pull` + `./scripts/stack.sh up stripstream` from
  `/Users/julienfroidefond/Sites/docker-stack`. Commits prefixed `chore|docs|style|test|ci|build`
  skip the build (same types the auto-bump hook ignores).
- The version comes from `package.json` (auto-bumped by `.husky/post-commit` from the Conventional
  Commit type); the short SHA is appended to the image tag.
- `.github/dependabot.yml` — dependency automation (npm/pnpm, GitHub Actions, Docker). Minor/patch
  updates are grouped by family and auto-merged once the `Quality` check passes, via
  `.github/workflows/dependabot-auto-merge.yml`; majors and the framework/runtime deps (`next`,
  `react`, `react-dom`, `@prisma/client`, `prisma`, `sharp`) stay manual. Dependabot replaces the
  former Renovate setup — do not re-add `renovate.json` alongside it, or you will get duplicate PRs.

## Security & Configuration Tips
- Never commit secrets; use `.env` based on `.env.example`.
- Validate Komga and auth-related config through settings flows before merging.
- Prefer server-side data fetching/services for sensitive operations.
- Credential-touching server actions must stay gated by `requireUserId()` and `checkRateLimit`.

## Where to look
- `docs/architecture.md`: consolidated system reference and known limitations.
- `docs/api.md`: current route handlers and server actions.
- `src/lib/providers/`: provider abstraction. Start here for backend questions.
- `src/app/actions/`: all server-side mutations.
- `prisma/schema.prisma`: data model (multi-config + favorites scoping).
- `prisma/migrations/`: examples of the SQLite manual rebuild pattern.
- `src/i18n/messages/{fr,en}/common.json`: copy and error messages.
- `ENV.md`: environment variables (SQLite, NextAuth, Komga concurrency).
- `tests/README.md`: E2E suite reference.
