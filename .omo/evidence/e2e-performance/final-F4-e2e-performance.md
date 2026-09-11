# Final verification F4 — Scope fidelity (E2E performance)

Repo: `/Users/julienfroidefond/Sites/stripstream`
Date: 2026-09-11
Verifier: F4 (read-only static + artifact inspection; no full E2E suite run per user constraint)
Range: `8315e5a..f449c23` (HEAD = `f449c23e541622c3e499fe2153a8727d0c5a149e`)

**F4 VERDICT: APPROVE** — confidence 0.97

---

## Check 1 — Test inventory preserved (20 specs, no deletion)

```sh
$ find tests -name '*.spec.ts' | wc -l
      20
$ git diff --name-status 8315e5a..HEAD -- tests | rg '^D'
NO_DELETIONS
$ git diff --name-status 8315e5a..HEAD -- tests | rg '^R'
NO_RENAMES
```

PASS. Exactly the same 20 `.spec.ts` files as the pre-change inventory; zero deleted, zero renamed. The new setup file is `tests/setup/auth.setup.ts` (not `*.spec.ts`), so the spec count is unaffected.

## Check 2 — No spec added or merged

```sh
$ git diff --name-status 8315e5a..HEAD -- tests | rg '^A'
A	tests/setup/auth.setup.ts
```

PASS. The only added path is the expected setup project file. All other entries are `M*` (modified) files. `tests/setup/auth.setup.ts` contains exactly 2 tests (`authenticate as the stream account`, `authenticate as the reader account`), both under the `setup` project and excluded from the pinned counts.

Stronger parity evidence (no test deleted/merged/added, not even a title swap):

```sh
$ node -e '<traverse suites of both JSON reports>'
baseline unique titles: 61 | run1 non-setup unique: 61
in baseline but not run1: []
in run1 but not baseline: []
```

The baseline JSON (`task-1-baseline.json`) and the task-9 RUN1 JSON (`task-9-after-run1.json`, non-setup) contain the exact same 61 unique test titles — set equality, no drift.

## Check 3 — Count parity vs baseline (total 61 / runtime 59 / skipped 2)

Baseline pinned in `task-1-baseline-summary.md`: **total = 61, runtime = 59, skipped = 2** (`passed 59 / failed 0 / flaky 0`), definitions = `projectName != 'setup'`.

RUN1 JSON (`task-9-after-run1.json`, independently traversed `suites`, non-setup filter):

```text
non-setup total: 61 | runtime: 59 | passed: 59 | skipped: 2
projects: setup + read-only + mutating
stats: {"expected":61,"skipped":2,"unexpected":0,"flaky":0,"duration":59859.5}
per-project: read-only 27/0 skipped, mutating 34/2 skipped
skipped titles: ["navigates between library pages when the result set spans pages",
                 "opens a real series card when content exists"]   # identical to baseline
```

RUN3 log (`task-9-after-run3.log`, raw line-reporter lines re-counted):

```text
✓ 1-2    [setup]     2 passed
✓ 3-29   [read-only] 27 passed
✓ 30-63  [mutating]  32 passed, - 2 skipped (tests 46, 47)
footer: "2 skipped / 61 passed (58.5s)"
→ non-setup total 61 (27+34), runtime 59, skipped 2
```

The footer `61 passed` = 59 non-setup + 2 setup; `2 skipped` = the same two data-dependent non-setup tests. Both artifacts match the baseline exactly (61/59/2) and the harness summary (`task-9-after-summary.md`: `total 61 / runtime 59 / skipped 2`).

PASS.

## Check 4 — No newly skipped tests / no weakened guards

```sh
$ git diff 8315e5a..HEAD -- tests | rg -n '^\+.*\.skip\('
NO_ADDED_SKIP_LINES
```

Full skip inventory compared `8315e5a` (baseline) vs HEAD — identical set of 18 `test.skip` calls, only line numbers changed (files were reformatted/reordered):

- 12× `test.skip(!hasE2eCredentials, 'Local E2E account unavailable')`
- 4× `test.skip(!hasIsolatedDatabase, 'Local E2E database unavailable')`
- 1× `test.skip(!hasInfra, 'Local E2E infrastructure unavailable')` (pre-existing)
- 2× data-dependent guards `test.skip((await pagination.count()) === 0, ...)` / `test.skip((await series.count()) === 0, ...)` in `tests/library/library.spec.ts` (pre-existing)

No `test.only`, no `test.fixme` in HEAD or baseline. The only diff hits for `.skip(` were context lines (pre-existing guards relocated by edits), never `+` lines.

PASS.

## Check 5 — `tests/README.md` reflects shipped scripts + production mode

`tests/README.md` “Commands” table documents all six required scripts with the exact package.json command:

| Script | README | package.json |
| --- | --- | --- |
| `pnpm test:e2e` | `pnpm test:e2e:build && playwright test` | same |
| `pnpm test:e2e:run` | `playwright test` | same |
| `pnpm test:e2e:build` | `NEXT_DIST_DIR=.next-e2e next build` | same |
| `pnpm test:e2e:read-only` | `playwright test --project=read-only` | same |
| `pnpm test:e2e:mutating` | `playwright test --project=mutating` | same |
| `pnpm test:e2e:timings` | `node scripts/e2e-report.mjs <json-report>` | `node scripts/e2e-report.mjs` (arg documented in the script’s Usage and in the README example) |

Production server mode is documented: “The default suite starts a local production server”, step 2 “Playwright starts `next start` with `NEXT_DIST_DIR=.next-e2e`”, BUILD_ID guard, rebuild after any `src/` change, and the explicit `E2E_SERVER_MODE=dev` dev fallback. The three-project split (`setup → read-only → mutating`), `storageState` files, read-only runtime proof, and timing harness are all documented and consistent with `playwright.config.ts` (`e2eServerMode === 'dev' ? ... : production`, `next start`, `.next-e2e`).

PASS.

## Check 6 — Stub 750 ms delay intact

```sh
$ rg -n "responseDelayMs" tests/helpers/stub-provider.mjs
34:const responseDelayMs = instance === 'B' ? 750 : 0;
220:    }, responseDelayMs);
```

PASS. `instance === 'B' ? 750 : 0` is unchanged; no diff hunk touches line 34.

## Check 7 — Read-only guard does not alter normal stub behavior

`stub-provider.mjs` diff adds only: the `node:fs` import, the `readonlyGuardEnabled` / `readonlyLogPath` / `READ_QUERY_POST_PATHS` constants, `isReadOperation()`, and the branch:

```js
const readonlyGuardEnabled = process.env.E2E_STUB_READONLY === '1';   // line 16
...
if (readonlyGuardEnabled && !isReadOperation(req.method, path)) {      // line 207
  ... appendFileSync(readonlyLogPath, ...); res.statusCode = 403; ...
}
```

The guard branch is gated on `E2E_STUB_READONLY === '1'`; when the variable is unset/empty, `readonlyGuardEnabled` is false and the request path is byte-for-byte the original behavior (no other logic touched, delay handling intact). No weakening of the guard itself: non-GET/POST-list requests are still hard-blocked with 403 when enabled.

PASS.

## Check 8 — No `src/` changes

```sh
$ git diff --name-only 8315e5a..HEAD -- src | wc -l
0
```

PASS. Zero `src/` files touched across the whole plan range.

## Check 9 — `.auth/` / `.next-e2e/` never committed

```sh
$ git log --all --name-only --pretty=format: | rg -i 'tests/\.auth|\.next-e2e'
NEVER_COMMITTED
```

PASS. No historical path matches in any ref. Both are git-ignored (`.gitignore:64 .auth/`, `.gitignore:14 /.next-e2e/`), and the README repeats that `tests/.auth/` must never be committed.

---

## Method / constraints

- Static inspection only (`git diff`, `git grep`, file reads, Node traversal of the existing JSON reports). No E2E suite executed, per user constraint.
- F4 scope only: run-2 redness / consecutive-run requirements belong to F3 and are disclosed in `task-9-e2e-performance.md`; they do not affect any scope-fidelity check above (RUN 1 and RUN 3 both show 61/59/2, and the count/title parity holds).

## Result

All 9 checks PASS. No deleted or merged test, no coverage loss, no count mismatch, no weakened guard, no README drift.

**F4 VERDICT: APPROVE** (confidence 0.97).
