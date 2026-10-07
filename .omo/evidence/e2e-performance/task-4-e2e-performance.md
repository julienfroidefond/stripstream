# Task 4 — Reuse auth via `storageState` (setup project) + fix cookie origin

- **Repo:** `/Users/julienfroidefond/Sites/stripstream`
- **Date (UTC):** 2026-09-11
- **Server mode:** production (`next start`, `NEXT_DIST_DIR=.next-e2e`, `NODE_ENV=production`)
- **Port:** default `E2E_PORT=3000` (`http://127.0.0.1:3000`)
- **Build:** `.next-e2e/BUILD_ID=enHlcVxwZodBrmcuCOk0V`, built 2026-09-11T11:07:41Z (no `src/` file newer than the build)

## Changes

1. `tests/helpers/auth.ts`
   - Added `export const e2eReaderEmail = 'e2e-reader@test.local'`.
   - `signIn` signature changed to
     `signIn(page, { email = e2eEmail, password = e2ePassword }: { email?: string; password?: string } = {})`;
     the body now uses the destructured values. Behavior otherwise unchanged.
2. `tests/setup/auth.setup.ts` (new) — two setup tests, both `mkdirSync(tests/.auth, { recursive: true })` then:
   - stream: `signIn(page)` → `context.storageState({ path: 'tests/.auth/stream.json' })`
   - reader: `signIn(page, { email: e2eReaderEmail })` → `context.storageState({ path: 'tests/.auth/reader.json' })`
3. `playwright.config.ts`
   - New `setup` project: `{ name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } }`.
   - `chromium` project gained `dependencies: ['setup']`, so a single full run creates both state files before specs.
   - No project-level `storageState` set (task 8 owns moving it to read-only/mutating projects).
4. Per-file `test.use(...)` (20 specs):
   - `storageState: 'tests/.auth/stream.json'` (13 authed): `account/account`, `account/admin-authorization`, `account/session`, `account/settings`, `home/home`, `integrations/mutations`, `integrations/streaming`, `library/authenticated-navigation`, `library/favorites-reading-lists`, `library/library`, `library/reading-status`, `library/series-rating`, `library/series-sort`.
   - `storageState: 'tests/.auth/reader.json'` (2 reader): `reader/reader`, `reader/reader-stub`.
   - `storageState: { cookies: [], origins: [] }` (5 anonymous): `public/access-control`, `public/authentication`, `public/pwa`, `public/responsive`, `public/security`.
5. Removed `await signIn(...)` from every `beforeEach`/test body except the `setup` project and the `reader-stub` cross-account test. Removed now-unused shared-helper imports; kept `hasE2eCredentials`/`test.skip`. Left the now-unused local `signIn`/`signInReader` definitions in the 6 files (task 6 deletes them).
6. Added explicit authenticated navigation where `signIn` used to leave the page post-login:
   - `tests/reader/reader-stub.spec.ts` test 3: `await page.goto('/')` before `waitForLoadState('networkidle')`/`localStorage.clear()`.
   - `tests/home/home.spec.ts` carousel-cache test: `await page.goto('/')` before the resource-timing reset (plus the existing `/` navigation for the cold sample).
7. Fixed the hardcoded `http://127.0.0.1:3017` cookie origin in `tests/reader/reader-stub.spec.ts` — both users' `addCookies` now use `test.info().project.use.baseURL!` (real default port 3000).

## Login-count proof

`rg -n "await signIn\(" tests`:

```text
tests/reader/reader-stub.spec.ts:174:      await signIn(userA, streamEmail);
tests/reader/reader-stub.spec.ts:181:      await signIn(userB, email);
tests/setup/auth.setup.ts:14:  await signIn(page);
tests/setup/auth.setup.ts:20:  await signIn(page, { email: e2eReaderEmail });
```

UI credential logins per run = 2 (setup: stream + reader) + 2 (reader-stub cross-account, one per account) = **≤2 per account, ≤4 total**, well under `LOGIN_LIMIT = 10 / 60s`. No other callers.

## Happy-suite evidence

Command (single invocation, prod, all projects):

```sh
pnpm exec playwright test --reporter=json > .omo/evidence/e2e-performance/task-4-e2e-performance.json
```

- Exit: **0**
- Wall clock: **75.87 s** (baseline task 1: 155.40 s)
- Setup tests: **2 passed**, both state files written.
- State files (after setup): `stream.json` and `reader.json`, 4 cookies each, including `__Secure-authjs.session-token` (`__Host-authjs.csrf-token`, `__Secure-authjs.callback-url`, `NEXT_LOCALE`).
- `projectName != 'setup'`: **total 61, passed 59, skipped 2** — exactly the task-1 baseline.
- `keeps reading statuses separate across two users and two connections` (`reader/reader-stub.spec.ts`): **passed** at default `E2E_PORT=3000` → proves the 3017 → `baseURL` cookie-origin fix.
- Anonymous specs pass with empty state (e.g. `public/access-control.spec.ts` `/settings` redirect test: passed), confirming a logged-out context.

Raw JSON: `.omo/evidence/e2e-performance/task-4-e2e-performance.json`. Combined stdout/stderr log: `task-4-e2e-performance.log`.

## Failure QA (stale state)

`task-4-e2e-performance-failure.txt`: backed up `tests/.auth/stream.json`, deleted it, ran
`pnpm exec playwright test --project=chromium --no-deps tests/account/account.spec.ts` — `--no-deps` bypasses the `setup` project so the missing file is not recreated.

- Exit: **1**, elapsed **~4 s**
- Error (all 3 tests): `Error reading storage state from tests/.auth/stream.json: ENOENT: no such file or directory`
- Fast missing-state failure, not a silent anonymous pass. File restored from backup afterwards.

## Adversarial QA

| Trigger | Status | Evidence |
| --- | --- | --- |
| `misleading_success_output` | handled | `rg -n "await signIn\(" tests` shows only the 2 setup logins + 2 reader-stub cross-account logins; all other specs get their session from `storageState`. Authenticated specs pass without any per-test login call. |
| `stale_state` | handled | Deleted `stream.json` → `ENOENT` failure in ~4 s (above); restored. |
| `dirty_worktree` | handled | `.auth/` is gitignored (`.gitignore:64`); commit stages only the intended tracked files + task-4 evidence. |
| `flaky tests` | handled | Reusing a pre-built session removes the per-test UI-login hydration flake; full prod run green (59 passed / 2 skipped / 0 failed / 0 flaky) in 75.87 s. |

## Notes / handoff

- Task 5 (hydration-safe waits) still owns removing `networkidle`/`waitForTimeout` from `signIn`, `streaming.spec.ts`, `home.spec.ts`, `reader-stub.spec.ts`, `reading-status.spec.ts`, `security.spec.ts`, `responsive.spec.ts`.
- Task 6 deletes the 6 now-unused local `signIn`/`signInReader` copies (lint currently reports 10 warnings, 0 errors).
- Task 8 will move `storageState` from per-file `test.use(...)` to project-level on the read-only and mutating projects; anonymous projects must keep the empty state.
- `pnpm lint` exit 0 (10 warnings from the deliberately-retained local helpers), `pnpm typecheck` exit 0.
