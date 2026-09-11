# Task 6 — Consolidate the sign-in helper into one source

- **Repo:** `/Users/julienfroidefond/Sites/stripstream`
- **Date (UTC):** 2026-09-11
- **Base commit:** `c34d46b` (task 5)
- **Server mode:** production (`next start`, `NEXT_DIST_DIR=.next-e2e`, `NODE_ENV=production`)
- **Build:** `.next-e2e/BUILD_ID=enHlcVxwZodBrmcuCOk0V` (tests-only change; no `src/` change, build not stale)
- **Commit:** `refactor(e2e): centralize the sign-in helper`

## Changes (5 files, +3/−83)

| File | Change |
| --- | --- |
| `tests/reader/reader-stub.spec.ts` | Deleted local `signIn` + now-unused `password` constant; imported shared `signIn`; calls updated to the object-argument form: `signIn(userA, { email: streamEmail })` and `signIn(userB, { email })`. Cross-account `getConnectionId(streamEmail, 'Stub A')` / `getConnectionId(email, 'Stub B')` and both users kept. |
| `tests/reader/reader.spec.ts` | Deleted unused `signInReader` + now-unused `readerEmail`/`readerPassword`; local `hasE2eCredentials` guard kept (still used). |
| `tests/library/reading-status.spec.ts` | Deleted unused local `signIn` + now-unused `email`/`password`; `hasIsolatedDatabase` kept. |
| `tests/library/favorites-reading-lists.spec.ts` | Same cleanup. |
| `tests/integrations/mutations.spec.ts` | Same cleanup. |

Task 5 had already removed the 6th copy (`integrations/streaming.spec.ts`), so exactly 5 local definitions remained.

## Acceptance criterion (single definition guard)

```sh
$ rg -n "async function signIn" tests
tests/helpers/auth.ts:10:export async function signIn(
```

Only the shared helper matches. Non-vacuity (the pattern would have caught the deleted copies) is proven against the pre-task-6 tree below.

## Quality gates (final tree)

```sh
$ pnpm lint        # exit 0 (baseline-browser-mapping notice only)
$ pnpm typecheck   # exit 0
```

## Happy evidence — affected specs (one invocation)

```sh
$ pnpm exec playwright test \
    tests/reader/reader-stub.spec.ts tests/reader/reader.spec.ts \
    tests/library/reading-status.spec.ts tests/library/favorites-reading-lists.spec.ts \
    tests/integrations/mutations.spec.ts tests/integrations/streaming.spec.ts \
    --reporter=json > .omo/evidence/e2e-performance/task-6-e2e-performance.json
```

- Exit **0**; stats: `expected 16 / skipped 0 / unexpected 0 / flaky 0`, duration **36.5 s**.
- Includes the `setup` project (2 tests) as a dependency; all 6 target files ran (14 tests).
- Notably includes `reader-stub › keeps reading statuses separate across two users and two connections` (the cross-account flow) — passed.

## Full suite (final tree, exact command)

```sh
$ pnpm exec playwright test --reporter=line
  ...
  2 skipped
  61 passed (1.1m)
# exit 0
```

- Non-setup parity with the task-1/task-5 baseline: **total 61 / passed 59 / skipped 2 / failed 0 / flaky 0** (the `61 passed` figure includes the 2 `setup` tests).

### Residual flake observed (pre-existing, unrelated test)

Two intermediate full-suite runs used for evidence were red **only** on
`tests/home/home.spec.ts:115` (`warm.resources.every(transferSize === 0)`,
the HTTP-cache assertion). That file is untouched by task 6 and the failing
line was introduced by task 5. Verification of non-culpability:

- Isolated run: `-g "keeps carousel images stable" --repeat-each=5` → **7 passed / 0 failed** (5 repeats + 2 setup).
- `tests/account tests/home/home.spec.ts` subset → cache test passed.
- Temporary instrumentation logging the non-zero-transfer resources was inserted while chasing it; it never fired (`WARM_UNCACHED` count 0) and was reverted.
- The final full-tree run above (instrumentation removed) exited **0**.

No home/account test was modified in the committed change.

## Failure QA — the shared helper's contract is type-enforced

Full transcript: `task-6-e2e-performance-failure.txt`.

- Injected `await signIn(userA, { email: 123 });` into `tests/reader/reader-stub.spec.ts`
  (the plan's literal `123 as unknown as never` would **not** fail, because `never`
  is assignable to `string`; a raw `number` is the real invalid argument).
- `pnpm typecheck` → **exit 2**, `tests/reader/reader-stub.spec.ts(198,29): error TS2322: Type 'number' is not assignable to type 'string'.`
- Injection reverted → `pnpm typecheck` → **exit 0**.

## Adversarial QA

| Probe | Status | Evidence |
| --- | --- | --- |
| `misleading_success_output` | handled | The guard is non-vacuous: against `HEAD` (pre-task-6) the same pattern matched all 5 deleted copies (`git show HEAD:tests/reader/reader-stub.spec.ts \| rg "async function signIn"` → line 9; `reader.spec.ts` → `signInReader` line 12; `reading-status`, `mutations`, `favorites-reading-lists` → line 7 each). The reader-stub two-user flow was not silently dropped: it still builds `connectionA`/`connectionB` from `streamEmail`/`email` and calls `signIn(userA, { email: streamEmail })` + `signIn(userB, { email })`; the cross-account test passed in the affected-specs run. |
| `dirty_worktree` | handled | Staged set is exactly the 5 changed specs/helpers + the 3 `task-6-*` evidence files: no `src/`, no `.auth/`, no `test-results/`, no unrelated `.omo/` file, no `playwright.config.ts`. The repo's own `.husky/post-commit` hook additionally auto-bumps `package.json` (v1.23.3 → v1.23.4) for `refactor:` commits and amends it into HEAD — same convention as historical commit `7613b2f`; it is hook-produced, not a staging artifact. |
| `stale_state` | handled | `hasE2eCredentials` (always-true no-op) is **not** imported by any of the 5 changed files and is not relied on as a guard: the only remaining reference there is `reader.spec.ts`'s pre-existing local `const hasE2eCredentials = Boolean(process.env.E2E_DATABASE_URL)` (real env-based guard). The other files use `hasIsolatedDatabase = Boolean(process.env.E2E_DATABASE_URL)`. `tests/helpers/auth.ts` was left untouched, per scope. |

## Cleanup / notes

- Temporary instrumentation in `home.spec.ts` and the failure-QA injection were both reverted; `git diff --name-only` lists exactly the 5 intended files.
- `tests/.auth/*.json` and `test-results/` remain untracked/ignored and are not staged.
- No `src/` file was touched.
