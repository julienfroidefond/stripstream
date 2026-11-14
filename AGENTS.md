# Repository Guidelines

Canonical guide for engineers and coding agents working on Stripstream. Claude Code should follow this file too.

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages (`page.tsx`), layouts, the `route.ts` handlers, and server actions under `src/app/actions/`.
- `src/components/`: UI and feature components (`home/`, `reader/`, `layout/`, `ui/`).
- `src/lib/`: server and shared logic, **one folder per domain** — only `utils.ts`, `logger.ts` and `prisma.ts` live at its root. Domains: `actions/` (server-action runner), `auth/` (NextAuth config, session helpers, registration flag, safe redirects, admin bootstrap), `browser/` (keyboard guards, scoped storage, file download), `cache/` (tag vocabulary `tags.ts`, read `profiles.ts`, invalidation recipes), `carousel/`, `collections/` (query contract, page sizes), `connections/` (registry, resolution, credentials encryption, server-URL validation), `home/`, `media/` (routes, transports, image limiter, request deduplication), `motion/` (GSAP setup, motion values, celebrations), `preferences/`, `providers/`, `rate-limit/` (store, client IP), `reader/`, `resume/`, `series/`, `books/`, `services/` (domain services that take the caller identity), `surfaces/`, `wall/` (pure wall policies: camera, focus, pointer machine…). A new module goes into the domain folder it belongs to; do not add files at the root of `src/lib`.
- `src/lib/providers/`: the media-provider abstraction (interface, factory, Komga + Stripstream implementations).
- `src/hooks/`, `src/contexts/`, `src/types/`, `src/constants/`: reusable runtime logic, typing, and app constants (error codes and messages, home sizes, splash screens). Cache tags and profiles live in `src/lib/cache/`.
- `src/i18n/messages/{en,fr}/`: translation dictionaries, including `common.json`.
- `src/utils/`: error types (`AppError`), HTTP and image error mapping.
- `prisma/`: SQLite schema, migrations, and seed artifacts.
- `public/`: static files and PWA shell assets.
- `scripts/`: maintenance scripts (DB init, admin password reset, icon generation).
- `tests/`: Playwright E2E suite, organized by user-facing area. Unit tests are colocated with their source as `src/**/*.test.ts` (Vitest).
- `docs/`: architecture, API, and Komga references.

## Build, Test, and Development Commands
Use `pnpm` (lockfile and `packageManager` are configured for it). All commands run from repo root.
- `pnpm dev`: start local dev server (Next 16 App Router).
- `pnpm build`: create production build.
- `pnpm start`: run production server.
- `pnpm lint`: run ESLint across the repo. Must pass with 0 warnings.
- `pnpm typecheck` or `pnpm -s tsc --noEmit`: strict TypeScript checks.
- `pnpm test:unit`: run the Vitest unit suite (`pnpm test:unit:watch` for watch mode).
- `pnpm init-db`: seed the admin user (run after applying migrations).
- `pnpm reset-admin-password`: reset admin credentials.
- `pnpm icons`: regenerate PWA icons and splash screens.
- `pnpm prisma migrate deploy`: apply pending migrations (or `pnpm prisma migrate dev --name <n>` while developing).
- After creating or changing `.env`/`DATABASE_URL`, run `pnpm prisma generate`: `pnpm install` runs it in `postinstall`, before `.env` exists on a fresh clone, so the client and standalone scripts such as `scripts/init-db.ts` must be regenerated once.

## Testing Guidelines
Two automated suites run side by side: **Vitest** for pure/unit logic and **Playwright** for user-facing E2E.
- `pnpm test:unit`: tests live next to the source as `src/**/*.test.ts` and run in `node` by default (per-file `// @vitest-environment jsdom` opt-in for DOM hooks, with `@testing-library/react`). Config: `vitest.config.ts`.
- Put pure logic (adapters, helpers, parsers, rate-limiters) under unit tests; keep browser-only behaviour in E2E. Heavier browser flows that need real network/paint stay in E2E.
- `pnpm test:e2e`: build `.next-e2e` then run the full suite (`setup`, then `read-only`, then `mutating`). `test:e2e:read-only` / `test:e2e:mutating` run one project plus its dependencies; `test:e2e:run`, `test:e2e:build`, `test:e2e:report`, `test:e2e:timings` rerun without rebuilding, build only, open the last report, and parse a JSON report; `test:e2e:ui` is the interactive mode.
- Prerequisite once per machine: `pnpm exec playwright install chromium`.
- `tests/README.md` is the reference for projects, execution order, auth state, the read-only runtime proof, and E2E environment variables.
- Minimum quality gate for every change: `pnpm lint` (0 warnings), `pnpm typecheck` and `pnpm test:unit`.
- For UI changes, smoke-test the affected routes (home, libraries, series, reader) in both themes.

## Architecture

`docs/architecture.md` is the system reference: provider abstraction, caching and TTLs, error model, reader, localStorage scoping, migrations, rate limiting, PWA state, and known limitations. Read the matching section before changing a surface. This file keeps only the rules that change what you write.

- **Providers — never bypass the factory.** `IMediaProvider` (`src/lib/providers/provider.interface.ts`) has two implementations (Komga, Stripstream); server code gets the active one with `const provider = await getProvider()`. The factory resolves the per-browser connection from the `stripstream-active-provider*` cookies and the user's rows — direct `new KomgaProvider()` / `new StripstreamProvider()` breaks multi-config support. The contract is `MediaProviderCore` plus an explicit `capabilities` declaration (`readingLists`, `search`, `ratings`, `shelf`, `missingBooks`, `discovery`, `favorites`); an absent capability is `null`, so never infer support from the connection type or simulate it with an empty result. Feature-specific data belongs to its capability, not to the core (`getReadSeries` is on `ratings`). A page that declares `requireCapability` receives the capability itself as `context.capability`, typed non-null — consume it instead of re-reading `provider.capabilities`. Mirror core and capability changes in both implementations. Paginated lists share one contract: a 1-based `page` in, `Page<T>` (`{ items, page, totalPages, totalElements }`) out, no cursor; walk several pages with `iteratePages` (`src/lib/providers/pagination.ts`), never an ad hoc loop, and keep `pagination.contract.test.ts` green for both providers. All provider requests — JSON reads/mutations **and media bytes** — go through `ProviderTransport` (`src/lib/providers/provider-transport.ts`): `request()` owns URL, auth, retry, cache and JSON parsing; `response()` opens a raw byte stream with the same URL/auth/timeout/error policy. Provider-specific URL, auth, retry and cache choices live in the matching `*.transport-policy.ts`, not in the provider — never add a direct `fetch` to a provider or a media transport. A user can hold several configs of each type; `Favorite` is scoped per `(userId, configId, seriesId)` so favorites never leak across configs.
- **Connections — one registry, no provider branches.** Everything that differs per provider type for connections lives in two tables: `CONNECTION_DESCRIPTORS` (`src/lib/connections/descriptors.ts`, client-safe: labels, badge, input fields and their validation) and `PROVIDER_DEFINITIONS` (`src/lib/connections/registry.ts`, server: Prisma store, `toConnection`/`encodeSecret` for decryption/encryption, ad hoc test connection, `createProvider`, `loadMediaTransport`, missing-config code) — ADR [0030](docs/adr/0030-provider-registry-for-connections.md). `resolve`/`manage`/`probe`/`active`, `provider.factory` and `media-transport` consume the definition; never write `provider === "komga"` there or in UI code — add a field to the definition or descriptor instead. Adding a provider = its `ProviderType`, its connection/input types in `connections/types.ts`, one descriptor, one definition (plus its provider, transport policy, media transport, Prisma table and catalog codes). Connection server actions are the generic ones of `src/app/actions/connections.ts` (`listConnections`, `saveConnection`, `deleteConnection`, `activateConnection`, `testConnection`), discriminated by `provider`; do not add per-provider actions. Client code merges lists with `toUnifiedConnections` (`src/lib/connections/client.ts`), renders `ConnectionTypeBadge`, and activates only through `useActivateConnection`, which owns the full-reload policy after a switch. Exceptions that still name a provider: the Komga SQLite favorites fallback in `favorite.service.ts` (ADR 0008) and the Komga page-index conversion inside its own media transport.
- **Book media contract.** `NormalizedBook.media` carries `pageUrlTemplate` and `thumbnailUrlTemplate`, both with a `{page}` token (1-based). Adapters build them with `bookPageUrlTemplate` and the reader fills the token through `resolveBookMediaUrl` (`src/lib/providers/book-media.ts`); never rebuild page URLs from `thumbnailUrl`. The Komga transport alone converts 1-based pages to Komga's zero-based API (`src/lib/media/komga-paths.ts`).
- **Media is addressed by kind.** `src/lib/media/media-url.ts` is the only place that knows a media route shape: build every `/api/<provider>/...` URL with `mediaUrl(provider, ref)` (never a string literal), declare each route as `createMediaRoute(provider, kind)` at the path of `MEDIA_ROUTE_PATTERNS[kind]`, and add a new kind to the pattern table, `SERVED_MEDIA_KINDS`, `parseMediaRef` and `MEDIA_POLICIES` together. Cache headers and error shape are per kind (`mediaPolicy`); a provider override needs a reason in `policies.ts`. A response whose bytes depend on anything the URL does not carry (a user preference) must not be `immutable`; every media response stays `private` (ADR 0027).
- **Prefetch budget.** A component that renders a collection (cards, rows, grids, the wall, search results) links through `IntentLink` (`src/components/common/IntentLink.tsx`), never a bare `next/link` `<Link>`: the default prefetches every link entering the viewport, and a 420-tile wall or a 90-card grid once fired ~5 400 RSC requests and got the server blacklisted by the proxy. `IntentLink` prefetches once, on focus, press or a 150 ms hover; the wall tile uses `prefetch={false}` outright. Plain `<Link>` stays for links that appear a bounded number of times per page (ADR [0031](docs/adr/0031-dense-collections-prefetch-on-intent.md)).
- **Server-first.** Pages/layouts are React Server Components that fetch through the provider and pass serialized props down; mutations are server actions in `src/app/actions/`. Use `"use client"` only for browser-only concerns (handlers, refs, effects, DOM) and do not add client-side `fetch` to internal APIs when a server action would do. The only exception is the `/api/...` image/search proxies, which exist so `<img src=...>` works with credentials kept server-side.
- **Caching.** Tag constants and the per-id `cacheTags` builders live in `src/lib/cache/tags.ts`. TTLs and the tags of each provider read come from one producer, `cacheProfile` (`src/lib/cache/profiles.ts`, `CACHE_TTL` + one function per read, e.g. `cacheProfile.books({ seriesId, libraryId })` → `{ revalidate, tags }`): providers pass the profile unchanged to their mechanism — Komga's `unstable_cache(...)` options, or `ProviderTransport.request` options (Stripstream forwards them as `next: { revalidate, tags }`). A provider never declares a TTL, imports a tag constant or `cacheTags`, or assembles a tag list; the same read uses the same profile in both providers (`cache-profile.contract.test.ts`). Invalidate through the recipes in `src/lib/cache/invalidation.ts` (they wrap `updateTag(...)` and `revalidatePath(...)`): a mutation calls the recipe for what it changed instead of recopying a tag list, and no action calls `revalidatePath`/`updateTag` directly. Prefer the narrow per-id tag (`cacheTags.librarySeries(id)`, `cacheTags.seriesBooks(id)`, `cacheTags.seriesRating(id)`): the global tag invalidates a whole scope and tanks the hit rate. `revalidateTag` has no call site — do not reintroduce it on the strength of a stale comment. `force-dynamic` was deliberately removed from image routes; keep it off unless there is a specific reason (settings/admin/account pages still use it intentionally).
- **Errors.** Throw `AppError` (`src/utils/errors.ts`) with a code from `src/constants/errorCodes.ts` and a message keyed `errors.${code}` in both locales. Map provider HTTP failures with `codeForHttpStatus(status, codes)` (`src/utils/http-error.ts`). Home keeps degrading gracefully, and the policy lives in the feed registry (ADR 0026): each entry declares `anonymous`, `initial`, `onFailure: "empty"` and `countsTowardOutage`, `loadHomeFeeds` (`src/lib/home/home-feeds.ts`) returns settled states plus the "everything failed" rule, and hidden feeds are never queried. Pages and actions render or delegate only — no per-feed `.catch`; `loadHomeFeed`/`loadContinueReading` return an `ActionResult`. Inside the provider, `getHomeContinueReadingData` still uses `Promise.allSettled` and throws only when every call fails. Every server action goes through `runAction` / `runProviderAction` (`src/lib/actions/`) and returns `ActionResult`; clients translate `errors.${result.code}`, never the technical `message`. Admin actions declare `requireRole: "admin"` — authorization lives in the runner, not in `AdminService`. Credential-touching actions stay gated by the runner's `requireUser` (or `requireRole`) + `rateLimit`. Never catch around `redirect()`/`notFound()` without `unstable_rethrow`; gate before the `try`.
- **Identity.** Services never read the session: `UserService` / `PreferencesService` take a `userId: number`, `FavoriteService` a `{ userId, provider }` context, and nothing under `src/lib/services/` calls the session helpers of `@/lib/auth/session` (`getCurrentUser`, `getCurrentUserId`, `requireUserId`, `requireAdmin`). The session is resolved by the entry points — the runner (`requireUser` / `requireRole` / `rateLimit` give `execute` a typed `userId: number`), the surface gateway (`context.userId`), the layout, the route handlers (the media route core hands `userId` to the transport through `MediaTransportContext`) and the provider factory — and they pass the identity down (ADR [0029](docs/adr/0029-services-receive-the-caller-identity.md)). Test services by injecting the `userId`, not by mocking the session.
- **Reader** (`src/components/reader/`). Blob page URLs must be revoked and evicted when navigating (`useImageLoader` owns the policy via `blobUrlRegistry.ts` + `imageEviction.ts`), otherwise memory grows unbounded on long books. Keyboard shortcuts go through the pure `resolveReaderShortcut` (`hooks/keyboardShortcuts.ts`): arrows are RTL-aware, `PageUp`/`PageDown`/`Space`/`Home`/`End` page, `F`/`D`/`T`/`I`/`R` toggle fullscreen/double page/thumbnails/info/direction, `?` opens the shortcuts dialog. Inputs/contenteditable are guarded through the shared `src/lib/browser/keyboard-targets.ts` (also used by the wall), `Space` is left to the focused control and an open dialog keeps `Escape` for Radix. Add every new key to `ReaderShortcutsDialog` too. Every spatial input (edge buttons, swipe, arrow keys, spread order, start bump, shortcuts dialog) gets its action from `src/lib/reader/side-actions.ts` (`resolveSideAction`, `actionForSide`): never re-derive `isRTL ? next : previous`, and reuse `isViewportZoomed` for the pinch-zoom threshold. Which pages to prefetch comes from the pure `planPrefetch` (`src/lib/reader/prefetch-plan.ts`); the loader only executes it.
- **localStorage.** Anything user-specific must be scoped: `buildStorageKey(scope, key)` from `src/lib/browser/storage.ts` yields `stripstream:<userId>:<key>`, with the scope resolved server-side in `src/app/layout.tsx` and read through `useUserScope()` — **never** guess it on the client (public pages use `anonymous`). Read progress and reading direction live server-side, not in localStorage.
- **i18n.** `react-i18next`, namespaces under `src/i18n/messages/{fr,en}/common.json`. Add user-facing copy in **both** locales.
- **Prisma migrations on SQLite.** `ALTER TABLE` only adds columns or renames, so anything else requires the hand-written rebuild pattern of `20260429000000_multi_config` / `20260505000000_dedupe_favorites` (copy rows into `new_x`, drop, rename, recreate indexes, `PRAGMA foreign_keys` off/on). Do not let Prisma auto-generate it — data would be lost — and keep the migration idempotent: start each rebuild with `DROP TABLE IF EXISTS "new_x";` so a migration interrupted mid-way can be re-applied, and remember `PRAGMA foreign_key_check` only reports violations, it does not abort. Prod applies migrations with `prisma migrate deploy` on boot. Never edit a migration that has shipped: Prisma checks applied migrations' checksums and `migrate deploy` would refuse to start.
- **PWA.** Installable shell only: `public/manifest.json` + `InstallPWA`. Offline reading and the service worker were removed; there is no `public/sw.js`, no Cache Storage and no download feature. Do not reintroduce them silently.
- **Rate limiting.** `checkRateLimit` (`src/lib/rate-limit/`) is async and goes through the `RateLimitStore` seam: the pure window arithmetic (`fixed-window.ts`) plus a store. The default store persists fixed windows to the SQLite `rate_limit_buckets` table in one atomic upsert (`prisma-store.ts`), so counters survive redeploys and are shared across processes; `RATE_LIMIT_STORE=memory` (and `NODE_ENV=test`) uses the in-memory store, which is also the logged fallback when the shared store throws. Every call is counted (`count <= limit` decides); do not add a store that decides on its own, and keep the SQL rules identical to `advanceWindow`. A budget that only counts some calls (failed passwords) checks first with `peekRateLimit` (store `peek`, never counts) and calls `checkRateLimit` only on the counted outcome.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts/.tsx`) with React function components; strict mode (no `any` without an `eslint-disable` justification).
- Components/hooks/services: `PascalCase.tsx` for components, `useThing.ts` for hooks, `camelCase` for functions, `*.service.ts` for service modules.
- Indentation: 2 spaces; keep imports grouped and sorted logically. ESLint + Prettier enforce style.
- Styling: Tailwind utility classes; prefer existing `src/components/ui` primitives before creating new ones. Radix is wired up for dialog, dropdown, collapsible, radio-group, and toast.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `perf:`).
- The `<img>` lint rule is intentionally disabled for cover components (`book-cover`, `series-cover`, `ReadingListCover`, `BookCard`, `GlobalSearch`, `cover-client`) because their `src` is already a thumbnailed proxy URL and `next/image` would just add an optimizer round-trip. Do not switch them to `next/image`.
- Quality gates: `pnpm lint` (0 warnings) and `pnpm typecheck` must pass before merge.

## Commit & Pull Request Guidelines
- Follow the Conventional Commit style seen in history: `fix: ...`, `refactor: ...`, `feat: ...`, `docs: ...`.
- Keep subjects imperative and specific (e.g. `fix: reduce header/home spacing overlap`).
- Any architectural change ships with an ADR under `docs/adr/` (next number, same shape as [`docs/adr/README.md`](docs/adr/README.md)) in the same commit as the code it describes.
- PRs should include:
  - short problem/solution summary,
  - linked issue (if any),
  - screenshots or a short video for UI updates,
  - verification steps/commands run.

## CI/CD
GitHub Actions is the single deployment path (the former Gitea pipeline has been retired). The
`Quality (lint · typecheck · build)` check of `.github/workflows/ci.yml` is required on `main`;
`deploy.yml` builds the image and deploys it on the self-hosted `mac-mini` runner. Pipeline internals,
image tags, required-check rules and the Actions cache policy: [`.github/workflows/README.md`](.github/workflows/README.md).
Dependency automation and its grouping/auto-merge policy: [`.github/dependabot-policy.md`](.github/dependabot-policy.md).

## Security & Configuration Tips
- Never commit secrets; use `.env` based on `.env.example`.
- Defaults are closed (ADR [0032](docs/adr/0032-closed-by-default-auth-and-per-user-connections.md)): no default admin password (`ADMIN_DEFAULT_PASSWORD` or no admin), sign-up only with `REGISTRATION_ENABLED=true`, no connection taken from the environment (a user only ever resolves their own rows). Do not reintroduce a fallback credential or an always-open form.
- Sessions are revalidated on every `auth()`: the `jwt` callback re-reads roles and `users.sessionVersion` (`src/lib/auth/session-token.ts`). Any code path that changes or resets a password must bump `sessionVersion` (`{ increment: 1 }`).
- Provider URLs are validated twice: `normalizeServerUrl` on the name and `assertServerUrlResolvesSafely` on the resolved addresses (save + test). `ProviderTransport` never follows redirects (`redirect: "manual"`); keep it that way.
- Post-login redirects go through `safeRedirectPath(from, origin)` (`src/lib/auth/safe-redirect.ts`), never a hand-written prefix check.
- Validate Komga and auth-related config through settings flows before merging.
- Prefer server-side data fetching/services for sensitive operations.
- Credential-touching server actions must stay gated by `requireUserId()` and `checkRateLimit` — in practice the runner's `requireUser`/`requireRole` and `rateLimit` options (`changePassword`, `resetUserPassword`, the connection tests).
- Provider credentials (Komga `authHeader`, Stripstream `token`) are encrypted at rest with AES-256-GCM (`src/lib/connections/credentials.ts`, key `CREDENTIALS_ENCRYPTION_KEY`). **Encrypt on write and decrypt on read through those helpers only** — never touch the raw columns. Migration of legacy plaintext rows: `pnpm encrypt-credentials` (idempotent).

## Where to look
- `docs/architecture.md`: consolidated system reference and known limitations.
- `docs/api.md`: current route handlers and server actions.
- `docs/ecosystem.md`: the two-repo layout (this reader + the Stripstream Librarian backend).
- `src/lib/connections/credentials.ts`: credential encryption at rest (+ `credentials-migration.ts`, `scripts/encrypt-credentials.ts`).
- `src/lib/providers/`: provider abstraction. Start here for backend questions.
- `src/lib/resume/`: resume state (feed merge, series identity, book/series progress) and the provider-backed series pool. Vocabulary: `GLOSSARY.md`.
- `src/app/actions/`: all server-side mutations.
- `prisma/schema.prisma`: data model (multi-config + favorites scoping).
- `prisma/migrations/`: examples of the SQLite manual rebuild pattern.
- `src/i18n/messages/{fr,en}/common.json`: copy and error messages.
- `ENV.md`: environment variables (SQLite, NextAuth, Komga concurrency).
- `tests/README.md`: E2E suite reference.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
