# F1 — Plan compliance audit (e2e-performance)

- Repo: `/Users/julienfroidefond/Sites/stripstream`
- Plan: `.omo/plans/e2e-performance.md` (compliance criteria lines 181-185)
- Base commit: `8315e5a` — HEAD: `f449c23e541622c3e499fe2153a8727d0c5a149e`
- Mode: READ-ONLY (no product file edited; this evidence file only)
- Constraint honored: no full E2E suite executed; only `playwright test --list` (fast) was run.

## CHECK 1 — no `waitForTimeout` / `networkidle` in tests

```sh
$ rg -n "waitForTimeout|networkidle" tests; echo RG=$?
RG=1
```

**Verdict: PASS** — zero matches (exit 1 = no match).

## CHECK 2 — single `signIn` definition

```sh
$ rg -n "async function signIn" tests; echo RG=$?
tests/helpers/auth.ts:10:export async function signIn(
RG=0
```

**Verdict: PASS** — only definition is `tests/helpers/auth.ts:10`.

## CHECK 3 — dead `E2E_TEST_MODE` removed

```sh
$ rg -n "E2E_TEST_MODE" .; echo RG=$?
RG=1
```

**Verdict: PASS** — zero matches.

## CHECK 4 — no `src/` path touched by the work

```sh
$ git diff --name-only 8315e5a..HEAD -- src
(empty)
$ git status --porcelain -- src
(empty)
```

Full range commits:

```sh
$ git log --oneline 8315e5a..HEAD
f449c23 docs(e2e): document and prove the performance workflow
c3cf8cc test(e2e): stabilize home image-cache assertion
413e1f4 test(e2e): split projects with proven read-only classification
acf69eb chore(e2e): remove dead config and stale artifacts
e8904b8 refactor(e2e): centralize the sign-in helper
c34d46b test(e2e): replace hard waits with hydration-safe web-first waits
df8cba8 test(e2e): reuse auth via storageState and fix cookie origin
7613b2f fix: copy eslint flat config in Dockerfile
ac00fe8 test(e2e): wire the E2E server mode with build guard
61be428 test(e2e): add timing report harness and exact baseline
```

**Verdict: PASS** — empty both ways. (Context: `7613b2f`, not in the plan's task list, only bumps `package.json` version `1.23.2 → 1.23.3` and copies the ESLint flat config in the `Dockerfile`; it touches no `src/` and no E2E semantics.)

## CHECK 5 — `.auth/` and `.next-e2e/` not tracked

```sh
$ git ls-files tests/.auth .next-e2e
(empty)
$ git status --porcelain            # filtered: no .auth/.next-e2e lines
?? .omo/boulder.json
?? .omo/drafts/
?? .omo/evidence/e2e-performance/task-2-*   (untracked legacy evidence)
?? .omo/plans/
?? .omo/start-work/
   ... (only .omo/ session files)
$ git check-ignore -v tests/.auth .next-e2e
.gitignore:64:.auth/	tests/.auth
.gitignore:14:/.next-e2e/	.next-e2e
```

**Verdict: PASS** — not tracked, and both are git-ignored; `.git status --porcelain` shows no `.auth`/`.next-e2e` entry.

## CHECK 6 — project split enumerates exactly the 20 baseline specs

```sh
$ pnpm exec playwright test --project=read-only --list 2>&1 | tail -2
  [read-only] › public/responsive.spec.ts:27:5 › no horizontal overflow at mobile width
Total: 29 tests in 9 files

$ pnpm exec playwright test --project=mutating --list 2>&1 | tail -2
  [mutating] › reader/reader.spec.ts:27:7 › Reader › opens reader information without navigating away
Total: 63 tests in 21 files
```

Independent set comparison (node, `/tmp/f1-ro-list.txt` + `/tmp/f1-mut-list.txt` vs `task-1-baseline.json` top-level suites):

```text
baseline files: 20 | read-only unique: 8 | mutating unique: 20 | union: 20
union === baseline: true
missing from projects: []
extra in projects: []
mutating-only: 12  read-only-only: 0
```

- read-only list: 8 specs + `setup` = 9 files / 29 tests (27 read-only + 2 setup).
- mutating list: 12 own specs + 8 read-only + `setup` = 21 files / 63 tests (34 mutating + 27 read-only + 2 setup).
- union = exactly the 20 baseline spec files (byte-identical sorted sets).

**Verdict: PASS.**

## CHECK 7 — global `workers` is not `1`

```sh
$ rg -n "workers:" playwright.config.ts
69:  workers: process.env.CI ? 2 : 4,      # global
140:      workers: process.env.CI ? 2 : 4,  # read-only
157:      workers: 1,                       # mutating (intended serialization)
```

**Verdict: PASS** — global workers is `process.env.CI ? 2 : 4`; the only `1` is the intentionally serialized `mutating` project.

## CHECK 8 — baseline counts matched by task-9 RUN1/RUN3

Baseline pinned (`task-1-baseline-summary.md`): **total 61 / runtime 59 / skipped 2**.

RUN1 — independent traversal of `task-9-after-run1.json` (filter `projectName != 'setup'`):

```text
RUN1 runtime(excl setup): 59 total: 61 skipped: 2 flaky: 0 failed: 0
RUN1 perProject: {"read-only":{"total":27,"skipped":0},"mutating":{"total":34,"skipped":2}}
```

RUN3 — independent recount of raw line-reporter bytes in `task-9-after-run3.log`:

```text
{
 "setup":     {"passed": 2, "skipped": 0, "failed": 0},
 "read-only": {"passed": 27,"skipped": 0, "failed": 0},
 "mutating":  {"passed": 32,"skipped": 2, "failed": 0}
}
non-setup: {"passed":59,"skipped":2,"failed":0} total: 61 runtime: 59
# footer: "2 skipped / 61 passed (58.5s)"  (63 incl. setup)
```

**Verdict: PASS** — RUN1 and RUN3 both equal the pinned baseline exactly (61 total / 59 runtime / 2 skipped, excluding `setup`).

## CHECK 9 — production branch approved and consistently wired

`task-2-guard.md` line 13:

```text
**`production mode: APPROVED`**
```

Task 3 wiring (committed at HEAD):

```sh
$ git show HEAD:playwright.config.ts | rg -n "next start|NEXT_DIST_DIR|workers:"
32:        '[e2e] The E2E suite starts a `next start` production server by default.',
69:  workers: process.env.CI ? 2 : 4,
87:              ? './node_modules/.bin/next start'
99:              ? { NODE_ENV: 'production', NEXT_DIST_DIR: e2eDistDir }
140:      workers: process.env.CI ? 2 : 4,
157:      workers: 1,
```

- `e2eServerMode = process.env.E2E_SERVER_MODE === 'dev' ? 'dev' : 'production'` (default production) + `assertE2eProductionBuild()` guard on `.next-e2e/BUILD_ID`; fallback dev path preserved.
- Task 3 evidence records: "Chosen branch: **PRODUCTION**" (`task-3-e2e-performance.md` lines 7-8).
- Task 9 scripts (`package.json`):

```json
"test:e2e": "pnpm test:e2e:build && playwright test",
"test:e2e:run": "playwright test",
"test:e2e:build": "NEXT_DIST_DIR=.next-e2e next build",
"test:e2e:read-only": "playwright test --project=read-only",
"test:e2e:mutating": "playwright test --project=mutating"
```

- `tests/README.md` documents `pnpm test:e2e:build` → `next start` with `NEXT_DIST_DIR=.next-e2e`, the `E2E_SERVER_MODE=dev` fallback, the project split and the read-only proof.

**Verdict: PASS** — APPROVED branch is the shipped default and is wired identically in config (task 3) and scripts (task 9).

## Summary

| Check | Result |
| --- | --- |
| 1. no `waitForTimeout`/`networkidle` | PASS (rg exit 1) |
| 2. one `signIn` definition | PASS (`tests/helpers/auth.ts:10`) |
| 3. no `E2E_TEST_MODE` | PASS (rg exit 1) |
| 4. no `src/` changes | PASS (empty diff + status) |
| 5. `.auth/`/`.next-e2e/` untracked | PASS (ignored, not tracked) |
| 6. 20-spec union / split counts | PASS (8+setup, 12+8+setup, union=20) |
| 7. global `workers != 1` | PASS (`CI ? 2 : 4`) |
| 8. baseline 61/59/2 matched RUN1+RUN3 | PASS (both exact) |
| 9. prod APPROVED + consistently wired | PASS |

**DISCREPANCIES: none.**

## FINAL: **APPROVE**
