# Architecture chantiers

Running list of the architectural deepenings we still owe this codebase. A chantier is one branch, one PR, one ADR: the code change and its record under [`adr/`](./adr/README.md) ship together (see `AGENTS.md`, *Commit & Pull Request Guidelines*).

Done work is not repeated here — the ADR index is the history of every decision already taken.

## Backlog

Opened by the architecture audit of 2026-11-13 (state of `main` at `a2e9fd1`). Each line is one chantier; the ADR number is reserved for the record that ships with it.

| # | Chantier | Evidence | ADR |
| --- | --- | --- | --- |
| A | **Pagination is one contract.** Komga returns the cursor it received (`komga.provider.ts` `page = cursor - 1` → `nextCursor = page + 1`), so `getAllSeriesBooks` re-reads page 1 up to 500 times on a series of more than 100 books. Providers return `{ items, page, totalPages }` (1-based), one `iteratePages()` walks them, one contract test runs against both providers. | `series-books.ts`, 6 callers | 0021 |
| B | **Reader side actions are one policy.** The side → action rule is copied in five files and `ControlButtons` hides the "next" arrow on page 1 of an RTL book. `resolveSideAction(side, ctx)` drives buttons, swipe, click zones and the shortcuts dialog; the prefetch plan becomes a pure `planPrefetch`. | `ControlButtons.tsx:250`, `useTouchNavigation.ts`, `PageDisplay.tsx`, `useImageLoader.ts` | 0022 |
| C | **Every server action goes through the runner.** `admin.ts`, `auth.ts`, `password.ts` bypass `runAction`; `changePassword` runs `bcrypt.compare` with no rate limit; `requireAdmin` throws a raw `Error` matched by `message.includes("Forbidden")` five times. | `actions/password.ts`, `admin.service.ts` | 0023 |
| D | **Read progress has one mutation seam.** `ui/mark-as-read-button`, `ui/mark-as-unread-button` and `SeriesHeader` each call the action and handle toast/refresh themselves, without optimism or rollback. `BookCover` drops the four props every caller disables; the missing-books merge and filter go through `usePaginatedGrid`; the home hero uses the carousel index machine. | `components/ui`, `PaginatedBookGrid.tsx`, `ContinueReadingHero.tsx` | 0024 |
| E | **The wall camera speaks intentions.** `WallCameraController` exposes twenty members including raw motion values and callers sequence `stop → markPanning → cancelView → set`; the pointer state machine lives in an effect closure; `WallExperience` keeps focus geometry, random pick and shortcuts untested. | `useWallCamera.ts`, `useWallGestures.ts`, `WallExperience.tsx` | 0025 |
| F | **Home feed policy lives in the registry.** Failure fallback, anonymous hiding and the "everything failed" rule sit in `app/page.tsx`; anonymous visits still fetch feeds they discard; `loadHomeFeed` bypasses the runner. | `src/app/page.tsx`, `actions/home.ts` | 0026 |
| G | **Media is addressed and cached by kind.** URL shapes are written by hand in adapters and routes, cache policy is keyed by provider not media kind, `komga.transport.ts` reads the per-user `showThumbnails` preference behind a `public, immutable` 30-day response, three routes are dead. | `media/policies.ts`, `komga.transport.ts` | 0027 |
| H | **Cache profiles are produced in one place.** TTL constants and `getBooks` tag selection are copied in both providers; `library.ts` and `preferences.ts` call `revalidatePath` outside the recipes. | `komga.provider.ts`, `stripstream.provider.ts` | 0028 |
| I | **Services receive the caller's identity.** `getCurrentUser() → throw → parseInt` is repeated seven times in services, and `FavoriteService` re-resolves the provider the page already holds. | `user.service.ts`, `favorite.service.ts`, `preferences.service.ts` | 0029 |
| J | **One provider registry for connections.** `config.ts` / `stripstream-config.ts` duplicate twelve actions; `ConnectionsSettings` and `ProviderSwitcher` duplicate the unified connection list and activate differently (`router.refresh()` vs full reload). | `actions/*config.ts`, `connections/`, `ProviderSwitcher.tsx` | 0030 |

## Picking the next one

Order by the number of call sites a wrong change would silently break, not by file size. A chantier is worth opening when the duplication already exists and a boundary test can prove the orchestration left its callers; if exploration shows the duplication is not real, close it and say so instead of inventing a seam.

## Delivered

| PR | Change | ADR |
| --- | --- | --- |
| #170 | Dead schema columns are dropped, not documented. | [0020](./adr/0020-drop-dead-schema-columns.md) |
| #169 | A required capability owns its data and is handed to the loader. | [0019](./adr/0019-capability-owns-its-data.md) |
| #167 | Rate-limit counters live in a shared SQLite store behind one seam. | [0018](./adr/0018-durable-rate-limit-store.md) |
| #162 | Preferences are described once and the service derives read/update/create from it. | [0015](./adr/0015-preferences-descriptor.md) |
| #163 | Collection pages parse their query through one contract. | [0016](./adr/0016-collection-query-contract.md) |
| #164 | Carousel gestures and index transitions are pure policies. | [0017](./adr/0017-carousel-gesture-machine.md) |
| #156 | Continue-reading has one loader for both render paths. | [0013](./adr/0013-continue-reading-single-loader.md) |
| #157 | The error catalog is total and typed. | [0014](./adr/0014-error-catalog-completeness.md) |
| #158 | Series identity is resolved at the provider seam. | [0009](./adr/0009-series-identity-at-the-provider-seam.md) |
