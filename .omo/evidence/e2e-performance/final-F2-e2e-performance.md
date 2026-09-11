# F2 — Code quality review (final verifier, read-only)

Repo: `/Users/julienfroidefond/Sites/stripstream`
Date: 2026-09-11
Base: `8315e5a` | HEAD: `f449c23` (`docs(e2e): document and prove the performance workflow`)
Scope: E2E tooling (`playwright.config.ts`, `tests/**`, `scripts/e2e-report.mjs`, `package.json`, `tests/README.md`). No product files edited; full E2E suite intentionally NOT run per user constraint.

## Verdict: APPROVE (confidence 0.96)

## 1. Quality gates

| # | Command | Observed |
|---|---|---|
| 1 | `pnpm lint; echo LINT=$?` | `LINT=0` (only the pre-existing `baseline-browser-mapping` data-age notice) |
| 2 | `pnpm typecheck; echo TYPE=$?` | `TYPE=0` |
| 3 | `node --check scripts/e2e-report.mjs; echo CHECK=$?` | `CHECK=0` |
| 3b | `node --check tests/helpers/stub-provider.mjs; echo CHECK_STUB=$?` | `CHECK_STUB=0` |

## 2. Changed E2E tooling review (check 4)

Command (superset of requested files):

```
git diff 8315e5a..HEAD -- playwright.config.ts tests/helpers/auth.ts tests/helpers/stub-provider.mjs \
  tests/global-setup.ts scripts/e2e-report.mjs package.json tests/README.md   # 589 lines, read in full
```

**Dead code: none found.**

- `playwright.config.ts`: all new symbols used (`assertE2eProductionBuild`, `existsSync`, `readFileSync`, `statSync`, `e2eDistDir`, `e2eBuildIdPath`). Dead `E2E_TEST_MODE: '1'` injection removed; `git grep -n "E2E_TEST_MODE"` has **no code/config hit** (matches survive only in historical `.omo/` plan/evidence prose that documents the removal — not shipped tooling).
- `scripts/e2e-report.mjs`: `fail`, `testStatus`, `collectTests`, `EXCLUDED_PROJECT`, `SLOWEST_LIMIT` all referenced; no unreachable branch.
- `package.json`: all scripts referenced by README or other scripts.
- `tests/helpers/auth.ts`: `e2eReaderEmail` consumed by `tests/setup/auth.setup.ts`; `hasE2eCredentials` still consumed by 15 specs; removed `!` non-null assertions.

**Comment accuracy verified (no stale/contradictory claims):**

- `playwright.config.ts:23-24` ("Playwright starts webServer before globalSetup"): confirmed against installed Playwright 1.62.1 — `createGlobalSetupTasks()` runs `createPluginSetupTasks(config)` (webServer is a plugin) **before** `config.globalSetups` tasks (`node_modules/.pnpm/playwright@1.62.1/.../lib/runner/index.js:6003-6009`). The config-load-time build guard is therefore correctly placed.
- `playwright.config.ts:90-93` (login-throttle bypass = NODE_ENV gate): matches `src/lib/services/auth-server.service.ts` — `isLocalE2EAccount = NODE_ENV !== "production" && email.endsWith("@test.local")`; comment says the `@test.local` account skips throttling only outside production. Accurate.
- `playwright.config.ts:134-136` / `151-153` (read-only classification proven by stub guard + DB hash): backed by `task-8-e2e-performance.md` (green 29/29 on 4 workers, empty blocked-op log, identical sha256) and `task-8-guard-probe.txt` (positive control 403+log for PATCH/PUT/POST-scan, 200 for GET and the two list POSTs; negative control 200 when env unset).
- `scripts/e2e-report.mjs` pinned definition comment matches code and README (`total = non-setup`, `runtime = non-setup non-skipped`).
- `tests/README.md` was reviewed against `package.json`, config projects, `auth.setup.ts`, and the guard code; claims (storageState files, project order, proof run, command table) all match. The sentence "In the dev-fallback branch `test:e2e` should be used with no build step ... in this repository the production branch is wired, so `pnpm test:e2e` builds and then runs" mirrors plan line 173 and explicitly contrasts with the shipped wiring; it does not claim the current `test:e2e` skips the build. Ambiguous wording at worst; not a contradiction.
- Bonus verifications: `.gitignore` has `/.next-e2e/` (line 14) and `.auth/` (line 64, `git check-ignore` confirms `tests/.auth/stream.json` ignored); `tsconfig.json` now includes `.next-e2e/types/**`; `eslint.config.mjs` ignores `.next-e2e/**`; Dockerfile now copies the real flat config `eslint.config.mjs` (the old `.eslintrc.json` reference was stale).

## 3. Suppression / skip scan (checks 5 & 6)

```
git diff 8315e5a..HEAD -- tests playwright.config.ts tests/helpers scripts \
  | rg -n "test\.only|test\.fixme|(\+.*test\.skip)"        -> exit 1 (no matches)
git diff 8315e5a..HEAD -- tests playwright.config.ts tests/helpers scripts \
  | rg -n "ts-ignore|ts-expect-error|as any|catch \([^)]*\) \{ *\}" -> exit 1 (no matches)
rg -n "^\+.*(: any\b|as unknown as|@ts-)" <diff>            -> exit 1 (no matches)
rg -n "test\.(skip|fixme|only)" tests                       -> only pre-existing conditional skips
```

- `test.only` / `test.fixme`: none anywhere in `tests/`.
- `test.skip` hits: `tests/library/library.spec.ts:52,65` (data-dependent `test.skip(await count() === 0, ...)`) and `test.skip(!hasE2eCredentials, ...)` in 15 files — all **pre-existing** (confirmed identical in `git show 8315e5a:tests/library/library.spec.ts`), all conditional; none added by the diff.
- Retries: `retries: process.env.CI ? 2 : 0` is unchanged from base `8315e5a`; no per-file retry/`describe.configure({ retries })` added.
- Only new `catch` is `tests/global-setup.ts:90-92`, which rethrows a descriptive `Error` (not empty, not swallowed).

## 4. Report script sanity (check 7)

```
$ node scripts/e2e-report.mjs /nonexistent.json; echo EXIT=$?
[e2e-report] cannot read report "/nonexistent.json": ENOENT: no such file or directory, open '/nonexistent.json'
EXIT=1

$ node scripts/e2e-report.mjs; echo NOARG_EXIT=$?
[e2e-report] usage: node scripts/e2e-report.mjs <playwright-json-report> [wall-clock-text]
NOARG_EXIT=1
```

Bonus (valid fixture, `/tmp/f2-report.json`, setup project excluded): exit 0 with `total=2, passed=1, failed=1, skipped=0`, per-project `read-only`/`mutating` counts and slowest list — matches the documented pinned definitions.

## 5. Read-only guard (check 8)

`tests/helpers/stub-provider.mjs`:

- Guard code is lint-clean and genuinely linted (not ignored): `npx eslint tests/helpers/stub-provider.mjs` → exit 0, JSON reporter `filesAnalyzed: .../tests/helpers/stub-provider.mjs`, `messages: 0`.
- Allow-list explicit and minimal: `const READ_QUERY_POST_PATHS = new Set(['/api/v1/books/list', '/api/v1/series/list']);` with `isReadOperation()` allowing `GET` + those two POSTs only (lines 16-24); guard at lines 207-213 returns 403 and appends `METHOD URL` to `E2E_STUB_LOG` only when `E2E_STUB_READONLY=1`.
- Behavior positively/negatively controlled by `task-8-guard-probe.txt`; normal (env unset) path unchanged for production use.

## Notes (non-blocking, no action required)

- Historical `.omo/evidence/**` and `.omo/plans/**` files are tracked in the diff; they are verification artifacts, not shipped tooling.
- `tests/.auth/` is recreated by the mandatory `setup` project each run; no stale-credential path found.

## Discrepancies

None blocking. No non-zero gate, no dead code, no suppression.
