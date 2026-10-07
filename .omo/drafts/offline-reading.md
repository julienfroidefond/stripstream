# offline-reading - ULW-PLAN draft

slug: offline-reading
intent: unclear
review_required: true
classification: architecture
status: approved (plan generation)
created: 2026-09-11

## Gate

- Brief presented 2026-09-11. User selected "Lecture hors ligne + telechargements (Recommande)".
- Answering the open ambiguity = approval to WRITE the plan only. No implementation.
- Next action after gate: generate `.omo/plans/offline-reading.md`, run Metis, then the dual
  high-accuracy review (momus + independent Oracle), then present the handoff explanation.

## Scope (evidenced)

Ship offline reading + per-book downloads for BOTH providers (Komga and Stripstream):
1. Service worker + precache + safe runtime caching for documents/RSC + offline fallback.
2. Per-book download engine into Cache Storage (all pages), with progress/resume/retry/cancel/quota.
3. Downloads UI (`/downloads`), per-book offline button, offline gating on covers/lists.
4. Settings card (storage usage, clear caches, SW status/dev toggle/reinstall).
5. i18n FR/EN, E2E coverage, docs reconciliation.

## Why this is the missing feature

- `CLAUDE.md:99-103`: offline + SW were removed; `tests/todo.md:18`: out of scope.
- Yet `README.md` ("Offline mode", "Download locally"), `devbook.md:45-50`, `decisions-log.md` ADR-006,
  `business-domain.md`, `business-tech-bridge.md` still advertise it; manifest + `InstallPWA` +
  `NetworkStatus` remain; orphaned `BOOK_DOWNLOAD_CANCELLED` strings remain.

## Key recovery reference (git archaeology, verified)

- Removal commit: `861d5bc52bf7cd92f61871b9e11fada2d2cb04ce` (parent `b1c0290`),
  30 files changed, +83 / -3016. Deleted: `public/sw.js`, `public/offline.html`,
  `src/lib/registerSW.ts`, `src/contexts/ServiceWorkerContext.tsx`,
  `src/hooks/useBookOfflineStatus.ts`, `src/hooks/useCacheUpdate.ts`,
  `src/components/ui/book-offline-button.tsx`, `src/components/downloads/DownloadManager.tsx`,
  `src/app/downloads/{page,loading}.tsx`, `src/components/settings/CacheSettings.tsx`.
- Recover any file with `git show 861d5bc^:<path>`.
- Old storage: Cache Storage `stripstream-books` (NOT IndexedDB). Old status: localStorage
  `book-status-{id}`. Old page URL: `/api/komga/images/books/{id}/pages/{n}` (Komga only).
- Reasons for removal were pre-existing hazards, not the commit body: stale cached RSC ->
  white screen (`5650d98`), iPad PWA session (`113977e`), cross-account localStorage leak (`6abd57a`),
  offline-status 5s polling cost (`8a1c81d`).

## Adopted defaults (reversible unless noted)

| Decision | Default | Rationale | Reversible |
|---|---|---|---|
| SW toolkit | Serwist via configurator mode (`@serwist/next/config` + `@serwist/cli`), bundler-agnostic | Avoids the RSC/white-screen class of bugs; works with Next 16 Turbopack default | yes |
| Runtime caching | CURATED list, NOT `defaultCache` (its `pages*` RSC/HTML routes caused 5650d98) | Removes the white-screen hazard entirely | yes |
| Cache versioning | `SW_VERSION` constant -> `stripstream-pages-${SW_VERSION}` etc., purge old on activate | A deploy can never serve the previous build's RSC/chunks (Metis H3) | yes |
| Book/asset cache | Dedicated scoped Cache Storage cache, managed by app | Serwist cannot intercept `blob:`; app controls enumeration/delete | yes |
| Per-user scoping | `X-Offline-Scope` header on reader fetches -> `stripstream-books:{scope}` | Fixes the multi-account leak (`6abd57a`); SW cannot read cookies | yes |
| Scope source | `getActiveConnection()` cookie-based (`src/lib/active-connection.ts:24`), NOT legacy Prisma columns | Prisma `active*` columns are not the runtime source of truth (Metis H2) | yes |
| Scope location | Computed server-side and passed via `OfflineProvider`; NOT injected into `getReaderData` | Keeps the provider-agnostic reader layer clean (Oracle C7) | yes |
| Download granularity | Per book (all pages) with explicit `cancelDownload` (deletes partials) vs error (keeps partials for resume) | Resolves the resume/cancel contradiction (Momus B5) | yes |
| Offline state | Event-driven store (custom events) | Removes 5s polling (`8a1c81d`) | yes |
| `skipWaiting` | `false` + `SKIP_WAITING` reload prompt | Allows controlled updates (Oracle C3) | yes |
| tsconfig | `/// <reference lib="webworker" />` + `declare global` in `src/sw.ts`; no `webworker` in `lib`, no `types` replacement | Avoids dom/webworker conflicts and dropping `@types/node` (Oracle C4) | yes |
| E2E wiring | Extend existing `test:e2e:build` to also run `serwist build` with `NEXT_DIST_DIR=.next-e2e` | Playwright webServer only runs `next start` (Oracle C5) | yes |
| `/~offline` | Route handler `src/app/~offline/route.ts` (bypasses the dynamic root layout) | Precacheable without cookies/DB (Oracle C6) | yes |
| Server zip download | Not restored (no fflate, no `/books/{id}/file`) | Reverted upstream (`ad11bce`); per-page is the working path | yes |

## Must-NOT-Have (guardrails)

- No IndexedDB, no fflate/zip server download.
- No EPUB/PDF support.
- No restore of dead `useCacheUpdate`.
- No restore of 5s polling in `useBookOfflineStatus`.
- No auto-download of whole libraries.
- No caching of `/_next/static` with non-hashed assumptions.

## Components (topology lock)

1. SW foundation (Serwist config, `src/sw.ts`, `/~offline`, registration, middleware/manifest).
2. Scope plumbing (server scope helper -> reader/client).
3. Download engine (app-managed Cache Storage + dual-provider URL builder + progress/resume/retry/quota).
4. Book status store (event-driven, scoped localStorage).
5. UI surfaces (`/downloads`, offline button, offline gating, settings card, sidebar).
6. i18n.
7. Tests.
8. Docs reconciliation.

## Notes on tooling

- `scaffold-plan.mjs` could not be executed in this environment (no shell tool available to the
  planner). Draft and plan artifacts are hand-built to the exact template headers/task grammar.

## Review log (high-accuracy dual review)

- Round 1: momus CHANGES REQUESTED; oracle CHANGES REQUESTED.
  - Fixed: i18n wave ordering; wrong E2E references; non-executable Todo 5 QA; vague Todo 3 failure QA;
    resume-vs-cancel contradiction; F1-F4 missing QA/Commit; ESM `serwist.config.mjs`; manual SW_VERSION
    footgun; missing explicit `cache.put`; phantom `CACHE_URLS`; tsconfig webworker/types hazards;
    `defaultCache` RSC/HTML hazard; scope source (cookie-based `getActiveConnection`); `/~offline` prerender.
- Round 2: momus CHANGES REQUESTED; oracle CHANGES REQUESTED.
  - Fixed: `data-offline-scope` now rendered (Todo 5); `CACHE_URLS` removed and `cache.put` explicit (Todo 7);
    Todo 2 build-green placeholder; Dockerfile `COPY serwist.config.mjs`; ESLint `public/sw*`; F2 `.mjs`.
- Round 3: oracle CHANGES REQUESTED (placeholder missing `declare const self` + type imports).
- Round 4: **momus APPROVE** (session `ses_f6fc2dcf3ffeBMuUraRbfSbUjd`); **oracle APPROVE**
  (session `ses_f6fc2d921ffeSJhxS5bt5Jz7TK`). Both read the literal plan path directly; exact final
  `plan_sha256` is not computable in the planner environment (no shell), but both reviewers independently
  validated the on-disk file and the required receipts are the two approval verdicts above.

plan_path: .omo/plans/offline-reading.md
status: approved (dual review passed) - awaiting user's start-work decision
pending-action: user runs `$start-work offline-reading` (execution belongs to a separate worker session)

