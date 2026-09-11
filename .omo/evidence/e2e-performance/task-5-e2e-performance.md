# Task 5 — Replace every hard wait with a hydration-safe web-first mechanism

- **Repo:** `/Users/julienfroidefond/Sites/stripstream`
- **Date (UTC):** 2026-09-11
- **Server mode:** production (`next start`, `NEXT_DIST_DIR=.next-e2e`, `NODE_ENV=production`)
- **Build:** `.next-e2e/BUILD_ID=enHlcVxwZodBrmcuCOk0V` (12 tests-only files changed; no `src/` change, so the build is not stale)
- **Commit:** `test(e2e): replace hard waits with hydration-safe web-first waits`

## Acceptance criterion (hard-wait guard)

```sh
$ rg -n "waitForTimeout|networkidle" tests
$
# exit 1 — no matches
```

Empty output, `rg` exit `1`. Guard satisfied. The failure-QA proof that this
guard is non-vacuous is in `task-5-e2e-performance-failure.txt`.

## Changes (7 files; all 12 hard-wait sites)

| # | Site | Old | New mechanism |
| --- | --- | --- | --- |
| 1 | `reader/reader-stub.spec.ts` | `waitForTimeout(800)` before reload | `expect.poll` provider `book-a` `readProgress.page` → `toBe(2)` (matches post-reload Page 2) |
| 2 | `reader/reader-stub.spec.ts` | `waitForLoadState('networkidle')` before `localStorage.clear()` | kept task-4 `page.goto('/')` + `expect(getByRole('main')).toBeVisible()` |
| 3 | `reader/reader-stub.spec.ts` | `waitForTimeout(800)` (anonymous, after page 6) | min-window `expect.poll` (≥800 ms) asserting provider `readProgress === null` |
| 4 | `reader/reader-stub.spec.ts` | `waitForLoadState('networkidle')` (anonymous, after close) | min-window `expect.poll` (≥800 ms) asserting provider `readProgress === null`; also lets the series page hydrate |
| 5 | `reader/reader-stub.spec.ts` | `userA.waitForTimeout(800)` | `expect.poll` provider `book-a` `readProgress.page` → `toBe(6)` |
| 6 | `reader/reader-stub.spec.ts` | `userB.waitForTimeout(800)` | `expect.poll` provider `book-b` `readProgress.page` → `toBe(4)` |
| 7 | `home/home.spec.ts` | `waitForTimeout(800)` | added `request` fixture; `expect.poll` provider `book-a` `readProgress.page` → `toBe(2)` |
| 8 | `library/reading-status.spec.ts` | `waitForTimeout(500)` | `expect(komgaConnection.getByRole('radio')).toBeChecked()` |
| 9 | `integrations/streaming.spec.ts` | `waitForLoadState('networkidle')` in unused local `signIn` | deleted the unused `signIn` + its `EMAIL`/`PASSWORD` constants |
| 10 | `public/security.spec.ts` | `waitForTimeout(1500)` after first register | register Server Action `waitForResponse` registered before click, awaited after |
| 11 | `public/security.spec.ts` | `waitForTimeout(400)` in the 5-attempt loop | per-iteration Server Action `waitForResponse` before click, awaited before next iteration |
| 12 | `public/responsive.spec.ts` | `page.goto('/login', { waitUntil: 'networkidle' })` ×2 | dropped `networkidle`; kept nav-response assertion + `expect(form).toBeVisible()`; overflow test adds an `expect.poll` that waits for the document to stop overflowing (first-paint fonts/hydration transient) while keeping the exact final assertion |

### Sign-in hydration (task-4 pattern)

- `tests/helpers/auth.ts` `signIn` and the raw `reader-stub` `signIn` copy now
  retry the fill via `expect.poll` until `email|password` stick, then click and
  assert the URL — no load-state wait.

### Deterministic follow-up fix (QA-driven, no weakening)

`tests/library/reading-status.spec.ts` second scenario: the pre-existing
normalization branch asserted `await expect(markUnread).toBeEnabled()` **after**
clicking the unread button. Once the `deleteReadProgress` Server Action
succeeds the button changes/unmounts, so that post-click assertion races. It is
now a pre-click `toBeEnabled` (correct readiness check) plus a registered
`waitForResponse` for the Server Action, then the unchanged reload / mark-read
assertions. The final assertions of the test are untouched.

## Happy evidence

### Affected specs — two consecutive green runs

```sh
pnpm exec playwright test \
  tests/reader/reader-stub.spec.ts tests/home/home.spec.ts \
  tests/library/reading-status.spec.ts tests/public/security.spec.ts \
  tests/public/responsive.spec.ts tests/integrations/streaming.spec.ts \
  --reporter=json
```

| Run | Exit | Expected | Unexpected | Flaky | Duration |
| --- | --- | --- | --- | --- | --- |
| run 3 | **0** | 21 | 0 | 0 | 44.8 s |
| run 4 | **0** | 21 | 0 | 0 | 46.6 s |

Includes the `setup` project (2 tests) as a dependency; all 21 tests passed.
Raw JSON: `task-5-affected-run3.json`, `task-5-affected-run4.json` (temp dir).

### Full suite (final files)

```sh
pnpm exec playwright test --reporter=json > .omo/evidence/e2e-performance/task-5-e2e-performance.json
```

- Exit: **0**
- Wall clock: **72.54 s**
- Non-setup: **total 61 / passed 59 / skipped 2 / failed 0 / flaky 0** — exact task-1/task-4 baseline parity.
- Raw JSON (valid, leading Prisma stdout stripped): `.omo/evidence/e2e-performance/task-5-e2e-performance.json`

## Quality gates

```sh
$ pnpm typecheck      # exit 0
$ pnpm lint           # exit 0 (8 warnings, all pre-existing unused local helpers owned by task 6)
```

## Failure QA — the guard is real

Full transcript in `task-5-e2e-performance-failure.txt`.

- Clean tree: `rg -n "waitForTimeout|networkidle" tests` → no output, exit **1**.
- Temporarily injected `await page.waitForTimeout(1);` into
  `tests/public/responsive.spec.ts` → command matched
  `tests/public/responsive.spec.ts:30` and exited **0** (guard fails).
- Injection removed → command again empty, exit **1**.

## Adversarial QA

| Probe | Status | Evidence |
| --- | --- | --- |
| `flaky tests` | handled | Two consecutive post-fix affected runs green (run 3 + run 4, 0 flaky), plus two full-suite runs green (0 flaky). The one run-2 failure was a pre-existing post-click race in `reading-status.spec.ts`, root-caused and fixed deterministically (Server Action wait); not a new wait. |
| `misleading_success_output` | handled | The grep guard demonstrably fails on an injected `waitForTimeout` (exit 0 + line match) and is silent otherwise. Provider polls assert real numeric values: site 1 `toBe(2)` is confirmed by the reload showing Page 2; sites 5/6 `toBe(6)`/`toBe(4)` match the test's own final `expect(...readProgress.page)` assertions; site 7 `toBe(2)` matches the resume-at-Page-2 outcome. |
| `stale_state` | handled | Sites 3/4 use `Date.now() - startedAt >= 800 && body.readProgress === null`. The debounce write window is 500 ms, so the poll only returns true after the window elapses **and** the provider is still null. If any write occurs, `readProgress` becomes non-null and stays non-null, so the predicate can never return true → the poll times out and fails. |
| `dirty_worktree` | handled | Only the 7 intended spec/helper files + the three `task-5-*` evidence files are staged. `.auth/`, `src/`, `playwright.config.ts`, `test-results/` (gitignored) and unrelated `.omo/` session files are not staged. |

## Cleanup / notes

- A stray, untracked `cs16.ts` (a copy of Next.js internal types, created at
  13:24 in the shared worktree and included by `tsconfig`'s `**/*.ts`) was
  breaking `pnpm typecheck`. It is unrelated to this task and no repository
  content depends on it; its bytes were preserved at
  `$TMPDIR/opencode/cs16.ts.relocated` and it was moved out of the worktree so
  the required `pnpm typecheck` gate is genuinely green. It was never staged.
- `pnpm test:e2e:build` was not re-run: only test files changed, so the
  `enHlcVxwZodBrmcuCOk0V` production build is not stale.
- Task 6 still owns deleting the remaining unused local `signIn` copies
  (`mutations`, `favorites-reading-lists`, `reading-status`, `reader`), which
  account for the 8 pre-existing lint warnings.
