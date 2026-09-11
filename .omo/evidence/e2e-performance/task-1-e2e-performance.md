# Task 1 — E2E timing harness: happy-path QA evidence

## Scope

- Harness: `scripts/e2e-report.mjs` (Node ESM, zero dependencies).
- npm script: `"test:e2e:timings": "node scripts/e2e-report.mjs"` added to `package.json`.
- No product code, `playwright.config.ts`, or `tests/` files were modified.

## Commands actually run (repo root)

### 1. Cold wall-clock baseline (includes Next dev server startup)

```sh
mkdir -p .omo/evidence/e2e-performance && /usr/bin/time -p pnpm test:e2e 2>&1 | tee .omo/evidence/e2e-performance/task-1-baseline.log
```

Observed tail of `task-1-baseline.log`:

```text
  2 skipped
  59 passed (2.6m)
real 155.40
user 155.21
sys 23.30
```

### 2. Independent JSON baseline run

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME=.omo/evidence/e2e-performance/task-1-baseline.json pnpm exec playwright test --reporter=json
```

Observed tail (stdout): `2 skipped` / `59 passed (2.4m)`; process exit code `0`.

### 3. Summary generation

```sh
node scripts/e2e-report.mjs .omo/evidence/e2e-performance/task-1-baseline.json "$(grep real .omo/evidence/e2e-performance/task-1-baseline.log)" > .omo/evidence/e2e-performance/task-1-baseline-summary.md
```

Exit code `0`; a pinned-definitions header was prepended afterwards (allowed post-edit). `grep real` also matched test titles containing "real"; the trailer was normalized to `wall-clock: real 155.40` in the same post-edit.

### 4. npm-script wiring smoke test

```sh
pnpm test:e2e:timings .omo/evidence/e2e-performance/task-1-baseline.json "real 155.40"
```

Exit code `0`; output matched the direct harness invocation:

```text
total tests:   61
passed:        59
failed:        0
flaky:         0
skipped:       2
runtime count: 59 (executed = total - skipped)
```

## Pinned numbers (authoritative for later tasks)

| Metric | Value |
| --- | --- |
| total (projectName != 'setup') | **61** |
| runtime count (not skipped, excluding setup) | **59** |
| skipped count (excluding setup) | **2** |
| failed / flaky | 0 / 0 |
| wall-clock real (cold run) | **155.40 s** |

Definitions pinned in `task-1-baseline-summary.md`: runtime count = tests with `projectName != 'setup'` whose status is not `'skipped'`; skipped count = tests with `projectName != 'setup'` and status == `'skipped'`.

Slowest 15 (from `task-1-baseline-summary.md`): 12474 ms "keeps reading statuses separate across two users and two connections", 11598 ms "blocks registration after too many attempts", 6845 ms "does not attribute anonymous reading progress to the current account", then 4664/4150/4118/3949/3705/3673/3657/3497/3314/3199/3188/3158 ms — all `[chromium]`.

## Manual QA checks

- [x] `task-1-baseline-summary.md` exists; runtime count `59 > 0`; slowest-15 section populated with 15 entries.
- [x] Failure path: `node scripts/e2e-report.mjs /nonexistent.json` → exit `1`, clear stderr (see `task-1-e2e-performance-failure.md`).
- [x] Teardown receipt after all runs (see below): no listeners, no leftover processes.

## Adversarial QA

### `stale_state` — PROVEN COLD

Before the wall-clock run:

```text
--- .next dev cache present? ---
458M	.next
Sep 10 22:45:40 2026 .next
--- listeners before ---
(empty)
--- next/stub procs before ---
(none)
--- removing .next for a truly cold dev compile ---
rm -rf .next
CONFIRMED: .next absent before baseline run
```

The 458 MB `.next` cache was deleted; the only servers started were the ones launched by `playwright.config.ts` (`reuseExistingServer: false`, line 47) since `E2E_BASE_URL` was unset. The log proves the startup was part of the timed run: `[WebServer] [stub-provider] instance A on :8444`, `... B on :8445`, Prisma migrations applied, then `Running 61 tests`. No pre-build was performed.

### `misleading_success_output` — PROVEN COUNTS COME FROM THE JSON REPORT

Raw JSON cross-check (`task-1-baseline.json`, 88 409 bytes):

```text
top-level keys: config, suites, errors, stats
playwright stats: {"startTime":"2026-09-11T10:51:23.728Z","duration":146768.166,"expected":59,"skipped":2,"unexpected":0,"flaky":0}
config projects: ["chromium"]
raw flat tests: 61
raw by status: expected=59 skipped=2 unexpected=0 flaky=0
sample raw entries:
   {"title":"shows the signed-in profile without exposing password values","project":"chromium","status":"expected","results":[{"s":"passed","d":2179}]}
   {"title":"rejects a short new password before contacting the server","project":"chromium","status":"expected","results":[{"s":"passed","d":1897}]}
```

Harness output (`total 61 / passed 59 / skipped 2 / runtime 59`) agrees with both Playwright's own `stats` and an independent raw traversal: runtime = 61 - 2 = 59. The synthetic smoke test also proved the `projectName === 'setup'` filter is implemented (a `setup` test of 9999 ms was excluded from all totals and from the slowest list, while the real config currently has only the `chromium` project — filter is a correct no-op for this baseline).

### Other probes — N/A

- `unhandled_edge_cases`: N/A beyond the required missing-file case, which is covered. No other input contract is required by the task.
- `resource_exhaustion` / `concurrency`: N/A — the harness is a single read + in-memory parse; no concurrency or resource loop exists.
- `security_bypass`: N/A — local read-only CLI over a path supplied by the caller; no privilege boundary.
- `ui_rendering`: N/A — no UI is produced; output is plain text/markdown.

## Cleanup / teardown receipt

```text
=== TEARDOWN RECEIPT (post-runs) ===
--- listeners on 3000/8444/8445 ---
(empty: no listeners)
--- next / stub-provider processes ---
(none)
```

Playwright tore down its `next dev` + two stub providers when both runs ended. No `next` or `tests/helpers/stub-provider.mjs` processes remain.
