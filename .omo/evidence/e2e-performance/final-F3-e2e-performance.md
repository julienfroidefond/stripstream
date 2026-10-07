# Final F3 — Real manual QA (agent-executed)

Repo: `/Users/julienfroidefond/Sites/stripstream`
Date: 2026-09-11 (local)
Plan: `.omo/plans/e2e-performance.md` lines 189-191
Budget: user override — ONE full `pnpm test:e2e` run only (includes prod build);
no extra stress/repeat runs; task-8 read-only proof NOT re-run (recorded
evidence + config presence used instead).

Verdict: **APPROVE** — confidence 0.95.

## 1. Port pre-check

```sh
$ lsof -nP -iTCP:3000 -iTCP:8444 -iTCP:8445 -sTCP:LISTEN
# no output, exit 1 (no listeners) → GO
```

Post-run: same command → no output, exit 1 (no leaked listeners/server).

## 2. The single run

```sh
$ set -o pipefail; /usr/bin/time -p pnpm test:e2e 2>&1 \
    | tee .omo/evidence/e2e-performance/final-F3-run.log
E2E_EXIT=0
```

Raw key lines (`final-F3-run.log`):

| Line | Content |
|---|---|
| 120 | `Running 63 tests using 4 workers` |
| 245 | `2 skipped` |
| 246 | `61 passed (1.0m)` |
| 247 | `real 70.45` |

- Exit code: **0**.
- Fresh production build this run: `✓ Compiled successfully`, BUILD_ID
  `2lQ8BZ9eqxGMntqzItDTn` (different from task-9 RUN3's `cH8MA…`), served by
  `next start` (no `next dev`); single fresh temp DB
  `stripstream-e2e-4613.db` + 8 migrations applied once.
- No `✘`, no `failed`, no `flaky` marks in the log (`failed-marks=0`).

## 3. Counts — baseline parity

Line-reporter re-count from the raw log (`grep` over test lines, not a
summary-label assumption):

| Phase | Passed | Skipped |
|---|---|---|
| setup | 2 | 0 |
| read-only | 27 | 0 |
| mutating | 32 | 2 |
| **non-setup total** | **59 runtime** | **2** |

⇒ non-setup total **61** (59 runtime + 2 skipped) — exactly the task-9 RUN1 JSON
traversal (`read-only 27/0`, `mutating 34/2` → 61/59/2) and the task-1 pinned
baseline. Skipped titles remain the two data-dependent library tests
(`library.spec.ts:50`, `library.spec.ts:63`).

## 4. Wall-clock

| Run | `real` | Delta |
|---|---|---|
| Task 9 RUN3 (post-fix, green) | 65.23 s | — |
| **F3 run (this)** | **70.45 s** | **+5.22 s = +8.0 %** |

±10 % band = [58.71 s, 71.75 s] → **70.45 s is within tolerance**. The run
pays the full prod build inside the command (task-9 RUN3 same convention); the
Playwright phase reported `61 passed (1.0m)` vs RUN3's `58.5 s` (~+2.5 s, normal
variance). No regression.

## 5. Read-only used >1 worker

- `playwright.config.ts:137-148`: `read-only` has `fullyParallel: true` and
  `workers: process.env.CI ? 2 : 4` (non-CI = 4); `mutating` is `workers: 1`
  (line 157). The global line `Running 63 tests using 4 workers` therefore
  reflects the read-only project's parallel pool.
- Corroborating this run: read-only completions in the raw log are
  non-monotonic (`3,5,4,6,9,8,7,10,…`), i.e. genuinely interleaved.
- Recorded evidence: task-8 happy proof line `Running 29 tests using 4 workers`
  (read-only project alone); task-9 RUN1 JSON read-only `workerIndex` set
  `[1,2,3,4]` (4 distinct workers).

Cap removed is confirmed; read-only is NOT capped at 1 worker.

## 6. Zero-writes corroboration (recorded task-8 proof, not re-run)

- `.omo/evidence/e2e-performance/task-8-stub.log` = **0 bytes**
  (sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
  the empty-file hash) → zero blocked non-read ops.
- `.omo/evidence/e2e-performance/task-8-db-before.sha` =
  `07a49c4a5a742c018ff668ccf9ef9f258011ff10cc6a59b3b9dd98f4db27385e`;
  task-8 evidence records the after-hash as identical (**MATCH**) and includes a
  positive control (guard 403s PATCH/PUT/scan and logs them when enabled).
- Guard config still present and unmodified (`git diff` empty):
  - `tests/helpers/stub-provider.mjs:13-24` — `E2E_STUB_READONLY`/`E2E_STUB_LOG`
    gate, read allow-list, non-read block+append.
  - `tests/global-setup.ts:84-96` — `E2E_DB_HASH_FILE` sha256 write after
    `$disconnect`.

## 7. Quality gates

```sh
$ pnpm lint      # LINT=0
$ pnpm typecheck # TYPE=0
```

## 8. Worktree

`git status --porcelain` after the run: no tracked modifications
(`git diff --name-only` and `git diff --cached --name-only` both empty); only
new untracked `.omo/` evidence files appeared (incl. this run's log). `.auth/`,
`.next-e2e/`, test-results are git-ignored. No `src/` change attributable to
this verification.

## 9. Two consecutive green full runs

Task 9 **RUN3** (exit 0, 65.23 s, 61 passed / 2 skipped) followed by this **F3
run** (exit 0, 70.45 s, 61 passed / 2 skipped) — two consecutive green full
runs with identical non-setup counts and no regression. (The intermediate task-9
RUN2 red was the pre-existing hydration race, fixed and re-validated in RUN3.)

## Discrepancies

None. Wall-clock +8.0 % vs RUN3 is within the ±10 % band and explained by
run-to-run build/startup variance.
