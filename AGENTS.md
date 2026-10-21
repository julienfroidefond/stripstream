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

- **Providers — never bypass the factory.** `IMediaProvider` (`src/lib/providers/provider.interface.ts`) has two implementations (Komga, Stripstream); server code gets the active one with `const provider = await getProvider()`. The factory resolves the per-browser connection from the `stripstream-active-provider*` cookies and the user's rows — direct `new KomgaProvider()` / `new StripstreamProvider()` breaks multi-config support. Mirror interface changes in both implementations. A user can hold several configs of each type; `Favorite` is scoped per `(userId, configId, seriesId)` so favorites never leak across configs. Legacy `User.activeProvider*` columns are not read by app code (still written by `tests/global-setup.ts`).
- **Server-first.** Pages/layouts are React Server Components that fetch through the provider and pass serialized props down; mutations are server actions in `src/app/actions/`. Use `"use client"` only for browser-only concerns (handlers, refs, effects, DOM) and do not add client-side `fetch` to internal APIs when a server action would do. The only exception is the `/api/...` image/search proxies, which exist so `<img src=...>` works with credentials kept server-side.
- **Caching.** Tag constants live in `src/constants/cacheConstants.ts`; the Komga provider and favorites use `unstable_cache(...)`, the Stripstream provider uses fetch options (`next: { revalidate, tags }`) in `stripstream.client.ts`. Invalidate with `updateTag(...)` from `next/cache` (plus `revalidatePath(...)` where needed) and prefer the narrow per-id tag (`library-series:${id}`, `series-books:${id}`, `series-rating:${id}`): the global tag invalidates a whole scope and tanks the hit rate. `revalidateTag` has no call site — do not reintroduce it on the strength of a stale comment. `force-dynamic` was deliberately removed from image routes; keep it off unless there is a specific reason (settings/admin/account pages still use it intentionally).
- **Errors.** Throw `AppError` (`src/utils/errors.ts`) with a code from `src/constants/errorCodes.ts` and a message keyed `errors.${code}` in both locales. Map provider HTTP failures with `codeForHttpStatus(status, codes)` (`src/utils/http-error.ts`). Home keeps degrading gracefully: one failing feed renders empty (`Promise.allSettled` with a failure threshold in `getHomeContinueReadingData`). Credential-touching actions stay gated by `requireUserId()` + `checkRateLimit`.
- **Reader** (`src/components/reader/`). Blob page URLs must be revoked and evicted when navigating (`useImageLoader` + `imageEviction.ts`), otherwise memory grows unbounded on long books. Keyboard shortcuts go through the pure `resolveReaderShortcut` (`hooks/keyboardShortcuts.ts`): arrows are RTL-aware, `PageUp`/`PageDown`/`Space`/`Home`/`End` page, `F`/`D`/`T`/`I`/`R` toggle fullscreen/double page/thumbnails/info/direction, `?` opens the shortcuts dialog. Inputs/contenteditable are guarded, `Space` is left to the focused control and an open dialog keeps `Escape` for Radix. Add every new key to `ReaderShortcutsDialog` too.
- **localStorage.** Anything user-specific must be scoped: `buildStorageKey(scope, key)` from `src/lib/storage.ts` yields `stripstream:<userId>:<key>`, with the scope resolved server-side in `src/app/layout.tsx` and read through `useUserScope()` — **never** guess it on the client (public pages use `anonymous`). Read progress and reading direction live server-side, not in localStorage.
- **i18n.** `react-i18next`, namespaces under `src/i18n/messages/{fr,en}/common.json`. Add user-facing copy in **both** locales.
- **Prisma migrations on SQLite.** `ALTER TABLE` only adds columns or renames, so anything else requires the hand-written rebuild pattern of `20260429000000_multi_config` / `20260505000000_dedupe_favorites` (copy rows into `new_x`, drop, rename, recreate indexes, `PRAGMA foreign_keys` off/on). Do not let Prisma auto-generate it — data would be lost — and keep the migration idempotent; prod applies it with `prisma migrate deploy` on boot.
- **PWA.** Installable shell only: `public/manifest.json` + `InstallPWA`. Offline reading and the service worker were removed; there is no `public/sw.js`, no Cache Storage and no download feature. Do not reintroduce them silently.
- **Rate limiting.** `checkRateLimit` (`src/utils/rate-limit.ts`) is an in-memory per-process `Map`: it resets on redeploy and is not shared across instances. Fine for the current single-instance SQLite deployment; it must move to a shared store before scaling out.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts/.tsx`) with React function components; strict mode (no `any` without an `eslint-disable` justification).
- Components/hooks/services: `PascalCase.tsx` for components, `useThing.ts` for hooks, `camelCase` for functions, `*.service.ts` for service modules.
- Indentation: 2 spaces; keep imports grouped and sorted logically. ESLint + Prettier enforce style.
- Styling: Tailwind utility classes; prefer existing `src/components/ui` primitives before creating new ones. Radix is wired up for dialog, dropdown, collapsible, radio-group, and toast.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `perf:`).
- The `<img>` lint rule is intentionally disabled for cover components (`book-cover`, `series-cover`, `ReadingListCover`, `BookGrid`, `BookList`, `GlobalSearch`, `cover-client`) because their `src` is already a thumbnailed proxy URL and `next/image` would just add an optimizer round-trip. Do not switch them to `next/image`.
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
GitHub Actions is the single deployment path (the former Gitea pipeline has been retired). The
`Quality (lint · typecheck · build)` check of `.github/workflows/ci.yml` is required on `main`;
`deploy.yml` builds the image and deploys it on the self-hosted `mac-mini` runner. Pipeline internals,
image tags, required-check rules and the Actions cache policy: [`.github/workflows/README.md`](.github/workflows/README.md).
Dependency automation and its grouping/auto-merge policy: [`.github/dependabot-policy.md`](.github/dependabot-policy.md).

## Security & Configuration Tips
- Never commit secrets; use `.env` based on `.env.example`.
- Validate Komga and auth-related config through settings flows before merging.
- Prefer server-side data fetching/services for sensitive operations.
- Credential-touching server actions must stay gated by `requireUserId()` and `checkRateLimit`.
- Provider credentials (Komga `authHeader`, Stripstream `token`) are encrypted at rest with AES-256-GCM (`src/lib/credentials.ts`, key `CREDENTIALS_ENCRYPTION_KEY`). **Encrypt on write and decrypt on read through those helpers only** — never touch the raw columns. Migration of legacy plaintext rows: `pnpm encrypt-credentials` (idempotent).

## Where to look
- `docs/architecture.md`: consolidated system reference and known limitations.
- `docs/api.md`: current route handlers and server actions.
- `docs/ecosystem.md`: the two-repo layout (this reader + the Stripstream Librarian backend).
- `src/lib/credentials.ts`: credential encryption at rest (+ `credentials-migration.ts`, `scripts/encrypt-credentials.ts`).
- `src/lib/providers/`: provider abstraction. Start here for backend questions.
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
