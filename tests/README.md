# End-to-end tests

The suite is organized by user-facing area:

```text
tests/
├── public/        # authentication, access control, PWA, responsive, security
├── account/       # account, settings, session, administrator access
├── home/          # continue reading, favorites, and reading lists
├── library/       # navigation, libraries, favorites, lists, reading status
├── reader/        # reader controls and deterministic reader fixture
└── integrations/  # provider mutations and streaming connection changes
```

## Server mode

The default suite starts a local **production** server:

1. `pnpm test:e2e:build` compiles the app into `.next-e2e` (this is what the
   `test:e2e` script does first, in the same invocation).
2. Playwright starts `next start` with `NEXT_DIST_DIR=.next-e2e`.

If `.next-e2e/BUILD_ID` is missing, the Playwright config fails before starting
anything with an explicit message. Rerun `pnpm test:e2e:build` after any `src/`
change; `pnpm test:e2e` always rebuilds first.

For quick debugging you can skip the build and fall back to the dev server:

```sh
E2E_SERVER_MODE=dev pnpm test:e2e:run
```

In the dev-fallback branch `test:e2e` should be used with no build step
(`playwright test` only); in this repository the production branch is wired, so
`pnpm test:e2e` builds and then runs.

## Commands

| Script | Command | Purpose |
| --- | --- | --- |
| `pnpm test:e2e` | `pnpm test:e2e:build && playwright test` | Build + full suite (setup → read-only → mutating) |
| `pnpm test:e2e:run` | `playwright test` | Full suite reusing the existing build |
| `pnpm test:e2e:build` | `NEXT_DIST_DIR=.next-e2e next build` | Production build for the E2E server |
| `pnpm test:e2e:read-only` | `playwright test --project=read-only` | Read-only journeys (plus the `setup` dependency) |
| `pnpm test:e2e:mutating` | `playwright test --project=mutating` | Mutating journeys (plus `setup` and `read-only` dependencies) |
| `pnpm test:e2e:ui` | `playwright test --ui` | Interactive UI mode |
| `pnpm test:e2e:report` | `playwright show-report` | Open the last HTML report |
| `pnpm test:e2e:timings` | `node scripts/e2e-report.mjs <json-report>` | Parse a Playwright JSON report into counts + slowest tests |

Prerequisite once per machine:

```sh
pnpm exec playwright install chromium
```

## Projects and execution order

The config defines three projects:

1. `setup` — signs the `e2e-stream@test.local` and `e2e-reader@test.local`
   accounts in and writes their browser state. It runs first.
2. `read-only` — public/account journeys that never persist anything
   (`dependencies: ['setup']`, `fullyParallel: true`, multiple workers).
3. `mutating` — journeys that persist preferences, ratings, favorites, reading
   progress, or provider connections. It declares
   `dependencies: ['setup', 'read-only']`, runs `fullyParallel: false` on a
   single worker, and therefore starts strictly after `read-only` has finished.

Dependencies guarantee the order `setup → read-only → mutating` even when the
full suite is launched with a single `playwright test` invocation. All three
projects share a single throwaway SQLite database created per run under the
system temp directory (`E2E_DATABASE_URL` may override it with another local
file when debugging; never point it at a shared development or production
database).

## Authentication state

`setup` writes `tests/.auth/stream.json` and `tests/.auth/reader.json`.
Authenticated specs reuse these files through
`test.use({ storageState: 'tests/.auth/stream.json' })` (or `reader.json`),
while public specs force an anonymous context with
`test.use({ storageState: { cookies: [], origins: [] } })`.

The `tests/.auth/` directory is git-ignored and must never be committed. It is
recreated on every run, so stale credentials cannot leak between runs.

## Read-only runtime proof

The `read-only` classification is enforced, not just documented:

- `tests/helpers/stub-provider.mjs` blocks non-read operations (everything
  except `GET` plus the read-query allow-list `POST /api/v1/books/list` and
  `POST /api/v1/series/list`) when `E2E_STUB_READONLY=1`, and appends each
  blocked `METHOD URL` line to the file named by `E2E_STUB_LOG`.
- `tests/global-setup.ts` writes the sha256 of the SQLite database file to
  `E2E_DB_HASH_FILE` after seeding and disconnecting.

Proof run:

```sh
E2E_STUB_READONLY=1 \
E2E_STUB_LOG=.omo/evidence/e2e-performance/task-8-stub.log \
E2E_DB_HASH_FILE=.omo/evidence/e2e-performance/task-8-db-before.sha \
E2E_DATABASE_URL=file:/tmp/stripstream-e2e-ro.db \
pnpm exec playwright test --project=read-only
```

The run must be green, `E2E_STUB_LOG` must be empty (zero write attempts), and
`shasum -a 256 /tmp/stripstream-e2e-ro.db` must equal the recorded hash.

## Timing harness

`scripts/e2e-report.mjs` turns a Playwright JSON report into a stable summary:
total/passed/failed/flaky/skipped counts, per-project counts, and the 15 slowest
tests. Pinned definitions, used by every performance task:

- `total` = tests with `projectName != 'setup'`
- `runtime count` = non-skipped tests with `projectName != 'setup'`
- `skipped count` = skipped tests with `projectName != 'setup'`

Example:

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME=report.json pnpm exec playwright test --reporter=json
pnpm test:e2e:timings report.json
```

Authenticated journeys use the local SQLite database and seeded accounts by
default; no production or shared-development credentials are required.

Set `E2E_USER_IS_ADMIN=true` when that account is expected to access the admin
dashboard. Without it, the suite verifies that `/admin` redirects the user away.

Authenticated tests discover real library, series, and book IDs from the UI. If
the seeded account has no matching data, only the data-dependent scenario is
skipped; authentication, account, settings, and authorization tests still run.

Password changes remain intentionally out of the suite. Favorites, reading
lists, and reading progress are covered only through the isolated account and
the deterministic provider fixtures described above.

To target a deployed environment explicitly, set `E2E_BASE_URL`. No local
server is started and no build is required in that mode; the project split is
preserved:

```sh
E2E_BASE_URL=https://staging.example.test pnpm test:e2e:run
E2E_BASE_URL=http://example.test pnpm exec playwright test --list
```
