# Task 8 — Split Playwright projects with proven read-only classification

Repo: `/Users/julienfroidefond/Sites/stripstream`
Date: 2026-09-11 (UTC runs)
Plan: `.omo/plans/e2e-performance.md` lines 156-170

## Changes

1. `playwright.config.ts` — added `read-only` and `mutating` projects (each
   `use: { ...devices['Desktop Chrome'] }`):
   - `read-only`: `dependencies: ['setup']`, `fullyParallel: true`,
     `workers: process.env.CI ? 2 : 4`, `testMatch` = the 8 read-only specs.
   - `mutating`: `dependencies: ['setup', 'read-only']` (strictly after
     read-only), `fullyParallel: false`, `workers: 1`, `testMatch` = the 12
     mutating specs.
2. `tests/helpers/stub-provider.mjs` — `E2E_STUB_READONLY=1` guard: 403 + append
   `METHOD URL` to `E2E_STUB_LOG` for every non-read op. Read = any `GET` plus
   `POST /api/v1/books/list` and `POST /api/v1/series/list`. Normal behavior is
   unchanged when the env var is unset.
3. `tests/global-setup.ts` — after seeding and `$disconnect`, when
   `E2E_DB_HASH_FILE` is set, writes the sha256 (hex) of the SQLite file from
   `E2E_DATABASE_URL` (`file:` stripped, `file:./` normalized as before).

## Enumeration check (`--list`, fast, no test run)

| Project | Raw line | Own spec files | Included deps |
|---|---|---|---|
| `read-only` | `Total: 29 tests in 9 files` | 8 | `setup` (auth.setup.ts) |
| `mutating` | `Total: 63 tests in 21 files` | 12 | `setup` + `read-only` (8) |

read-only own spec files (8):
`account/account.spec.ts`, `account/admin-authorization.spec.ts`,
`account/session.spec.ts`, `account/settings.spec.ts`,
`public/access-control.spec.ts`, `public/authentication.spec.ts`,
`public/pwa.spec.ts`, `public/responsive.spec.ts`

mutating own spec files (12):
`home/home.spec.ts`, `integrations/mutations.spec.ts`,
`integrations/streaming.spec.ts`, `library/authenticated-navigation.spec.ts`,
`library/favorites-reading-lists.spec.ts`, `library/library.spec.ts`,
`library/reading-status.spec.ts`, `library/series-rating.spec.ts`,
`library/series-sort.spec.ts`, `public/security.spec.ts`,
`reader/reader.spec.ts`, `reader/reader-stub.spec.ts`

Union = exactly the 20 spec files from task 1 (8 + 12).
Raw: `task-8-list-read-only.txt`, `task-8-list-mutating.txt`.

## Happy proof run (ONE time)

Fresh production build first:

    pnpm test:e2e:build      # exit 0, 7s; BUILD_ID now d_YL44dyU8GzbnsVMY7hK
                             # built 2026-09-11T12:02:22.371Z

Command (fresh DB / fresh log):

    rm -f .omo/evidence/e2e-performance/task-8-stub.log \
          .omo/evidence/e2e-performance/task-8-db-before.sha \
          /tmp/stripstream-e2e-ro.db*
    E2E_STUB_READONLY=1 \
    E2E_STUB_LOG=<abs>/.omo/evidence/e2e-performance/task-8-stub.log \
    E2E_DB_HASH_FILE=<abs>/.omo/evidence/e2e-performance/task-8-db-before.sha \
    E2E_DATABASE_URL=file:/tmp/stripstream-e2e-ro.db \
    pnpm exec playwright test --project=read-only --reporter=line

Results (raw `task-8-happy.log`):

| Assertion | Observed |
|---|---|
| exit code | `0` |
| worker line | `Running 29 tests using 4 workers` (more than one) |
| tests | `29 passed (11.0s)`; wall clock 12s |
| blocked-ops log | `task-8-stub.log` = 0 bytes / never created by the guard (0 blocked writes) |
| DB hash before (global setup) | `07a49c4a5a742c018ff668ccf9ef9f258011ff10cc6a59b3b9dd98f4db27385e` |
| DB hash after (`shasum -a 256 /tmp/stripstream-e2e-ro.db`) | `07a49c4a5a742c018ff668ccf9ef9f258011ff10cc6a59b3b9dd98f4db27385e` |
| hash match | **MATCH** (unchanged) |

Note on the empty stub log: the guard creates `E2E_STUB_LOG` only on the first
blocked write. The happy read-only suite performs no provider writes, so the
file was never created; `task-8-stub.log` is recorded as a 0-byte snapshot.
The guard mechanism itself was positively controlled (see below) so the empty
log is a real "zero writes" signal, not dead code.

### Guard positive/negative control (`task-8-guard-probe.txt`)

With `E2E_STUB_READONLY=1`: `GET` → 200; `POST /api/v1/books/list` → 200;
`POST /api/v1/series/list` → 200; `PATCH .../read-progress` → 403;
`PUT /series/.../rating` → 403; `POST /libraries/.../scan` → 403; the three
blocked ops were appended to the log. With the env var unset, `PATCH` → 200.

WebServer env inheritance (so the guard is live in the run): Playwright 1.62.1
spawns webServer with `{ ...DEFAULT_ENVIRONMENT_VARIABLES, ...process.env,
...options.env }` (`.../runner/index.js:858-862`).

## Failure proof (`task-8-e2e-performance-failure.txt`)

Temporarily added `**/library/library.spec.ts` to `read-only` and reran the
SAME command (fresh DB `/tmp/stripstream-e2e-failure.db`):

- `Running 34 tests using 4 workers` → 2 skipped, 32 passed (13.6s), exit 0
  (the library test passes; the violation is the persisted preference write).
- DB hash before: `6aa4a7afa301af6def06791a77ce9c1843df253f7bb37508b337d9411de83eef`
- DB hash after:  `d61ccaa31eb1ce6f71cab8caa3686f8d23bfe49b6969fa50e053beef48a30f89`
- **HASH MISMATCH** → read-only wrote when a writer was included.

Restored: `**/library/library.spec.ts` removed from `read-only`; the project now
matches the exact step-1 list (verified in-file and via `git diff`).

## Static checks

- `node --check tests/helpers/stub-provider.mjs` → OK
- `pnpm exec eslint playwright.config.ts tests/global-setup.ts tests/helpers/stub-provider.mjs` → exit 0
- `pnpm exec tsc --noEmit` → exit 0

## Adversarial QA

- `stale_state`: PASS — fresh prod build (`d_YL44dyU8GzbnsVMY7hK`) and fresh DB
  `/tmp/stripstream-e2e-ro.db` (rm'd before the run); global setup re-migrates
  and reseeds.
- `misleading_success_output`: PASS — both signals captured raw (0-byte log +
  identical hashes); guard positively controlled; `--list` enumeration exact
  (8 + 12 = 20).
- `dirty_worktree`: PASS — commit stages only `playwright.config.ts`,
  `tests/helpers/stub-provider.mjs`, `tests/global-setup.ts`, and `task-8-*`
  evidence; `/tmp` DBs and `.next-e2e` (gitignored) are untracked.
- `hung_or_long_commands`: PASS — build 7s, happy run 12s, failure run 14s;
  no listeners left on 3000 / 8444 / 8445 / 8450 / 8451.

## Cleanup receipt

- No listeners on 3000 / 8444 / 8445 / 8450 / 8451 after runs.
- `/tmp/stripstream-e2e-ro.db*` and `/tmp/stripstream-e2e-failure.db*` removed.
- `.next-e2e` kept (gitignored).
