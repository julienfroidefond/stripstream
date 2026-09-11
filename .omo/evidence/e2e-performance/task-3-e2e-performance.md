# Task 3 — Wire the E2E server mode (production build + build guard)

- **Repo:** `/Users/julienfroidefond/Sites/stripstream`
- **Base rev:** `61be428` (branch `main`)
- **Date (UTC):** 2026-09-11
- **Toolchain:** Node `v24.17.0`, Playwright `1.62.1`, Next.js `16.1.6`
- **Spike input:** `.omo/evidence/e2e-performance/task-2-guard.md` → decision **`production mode: APPROVED`**
- **Chosen branch:** **PRODUCTION** (`e2eServerMode` defaults to `'production'`; `E2E_SERVER_MODE=dev` keeps the `next dev` fallback)
- **Status:** PASS — build, happy run, guard failure, banner, typecheck, lint-on-changed-files and full `pnpm lint` all green.

## Changes

| File | Change |
| --- | --- |
| `package.json` | Added exactly `"test:e2e:build": "NEXT_DIST_DIR=.next-e2e next build"` (after `test:e2e`). `test:e2e`, `test:e2e:ui`, `test:e2e:report`, `test:e2e:timings` untouched (task 9 rewires `test:e2e`). |
| `playwright.config.ts` | `const e2eServerMode = process.env.E2E_SERVER_MODE === 'dev' ? 'dev' : 'production'` + `e2eDistDir`/`e2eBuildIdPath`. Next webServer entry: `command` selects `./node_modules/.bin/next start` (prod) or `./node_modules/.bin/next dev` (dev); `env` adds `NODE_ENV: 'production'` + `NEXT_DIST_DIR: '.next-e2e'` in prod, `NODE_ENV: 'development'` in dev. Guard `assertE2eProductionBuild()` runs at config load when `startsLocalServer && e2eServerMode === 'production'`. |
| `.gitignore` | Added `/.next-e2e/` under `# next.js` (existing `.auth/` and the pre-existing uncommitted `.opencode` line kept). |
| `tsconfig.json` | New entries appended by `next build`: `.next-e2e/types/**/*.ts` and `.next-e2e/dev/types/**/*.ts` — **kept and committed** (not reverted). |
| `eslint.config.mjs` | Added `".next-e2e/**"` to the top-level `ignores` array, right after `".next/**"` (follow-up fix: the generated E2E build tree was being linted; see Findings). |

No `src/`, `next.config.js`, webServer build step, or `output` gating changes.

## Guard behavior (`.next-e2e/BUILD_ID`)

| Scenario | Behavior | Evidence |
| --- | --- | --- |
| Local server + production (default) + build present | `console.warn` loud banner with `BUILD_ID` + mtime (UTC), then `next start` boots | `task-3-e2e-performance.log` §2 |
| Local server + production + build missing | `throw new Error` at **config load** (before Playwright boots any server), exit `1` in **1s**, message says to run `pnpm test:e2e:build` (or `E2E_SERVER_MODE=dev`) | `task-3-e2e-performance-failure.log` |
| `E2E_SERVER_MODE=dev` | Guard skipped; `next dev` path preserved, no build required | `task-3-e2e-performance.log` §3 (`--list` exit 0, no throw) |
| `E2E_BASE_URL` set (external) | `startsLocalServer === false` → guard skipped, no build needed | by construction (`if (startsLocalServer && ...)`) |

## tsconfig outcome

`pnpm test:e2e:build` appended to `include`:

```diff
     ".next/types/**/*.ts",
-    ".next/dev/types/**/*.ts"
+    ".next/dev/types/**/*.ts",
+    ".next-e2e/types/**/*.ts",
+    ".next-e2e/dev/types/**/*.ts"
```

Per task instructions the entry is **kept**, not reverted, so repeated builds stop dirtying a tracked file. `pnpm typecheck` was run **with** `.next-e2e` present and the new includes: **exit 0**.

## Exact commands + results

| # | Command | Result | Duration |
| --- | --- | --- | --- |
| 1 | `pnpm test:e2e:build` | exit `0`; `.next-e2e/BUILD_ID = enHlcVxwZodBrmcuCOk0V`; mtime `2026-09-11T11:07:41.828Z` (UTC) | 10s |
| 2 | `DEBUG=pw:webserver pnpm exec playwright test tests/public/access-control.spec.ts --reporter=line` | exit `0`; `10 passed (5.3s)`; server log: `Starting WebServer process ./node_modules/.bin/next start...` → `[WebServer] ✓ Ready in 105ms` | 63s |
| 3 | `mv .next-e2e/BUILD_ID /tmp/task3-BUILD_ID.bak` then same test command | exit `1`, 1s, guard message + stack at `playwright.config.ts:27/58` | 1s |
| 4 | `mv /tmp/task3-BUILD_ID.bak .next-e2e/BUILD_ID` | restored, `BUILD_ID = enHlcVxwZodBrmcuCOk0V` | — |
| 5 | `E2E_SERVER_MODE=dev pnpm exec playwright test --list` | exit `0`; 61 tests in 20 files (guard bypassed in dev) | ~3s |
| 6 | `pnpm typecheck` | exit `0` | ~30s |
| 7 | `pnpm exec eslint playwright.config.ts scripts` | exit `0` | ~5s |
| 8 | `pnpm exec eslint . --ignore-pattern '.next-e2e/**'` | exit `0` (pre-fix probe: whole repo clean once generated dir is excluded) | ~90s |
| 9 | `pnpm lint` (after adding `".next-e2e/**"` to `eslint.config.mjs`) | exit `0`; 0 errors / 0 warnings (`no problem summary`); no `.next-e2e` path in output | 6s |

## Adversarial QA

| Trigger | Status | Proof |
| --- | --- | --- |
| `stale_state` | **handled** | Missing `BUILD_ID`: exit 1 in 1s with explicit rebuild message (failure log). Existing build: banner prints `BUILD_ID: enHlcVxwZodBrmcuCOk0V` / `Built at: 2026-09-11T11:07:41.828Z` on every run that reuses it (happy log). |
| `misleading_success_output` | **handled** | Happy run log shows `ECONNREFUSED` on `:3000` before start (nothing cached/reused), `reuseExistingServer: false`, `Starting WebServer process ./node_modules/.bin/next start...`, and the `next start`-only warning `"next start" does not work with "output: standalone"` + `✓ Ready in 105ms`. Results come from the real `--reporter=line` run (`10 passed`). |
| `dirty_worktree` | **handled** | After commit: only the intended tracked files committed (4 config files + `eslint.config.mjs` + 3 evidence files); `.next-e2e/` is ignored via `.gitignore:14` (`git check-ignore` confirms) and untracked, never staged; pre-existing `.gitignore` user change (`.opencode`) preserved. |
| `hung_or_long_commands` | **handled** | All commands bounded and completed: build 10s, happy 63s (tests 5.3s), failure 1s, `--list` ~3s. No listener survived (`task-3-cleanup-receipt.txt`). |

## Findings / risks

1. **`pnpm lint` vs generated `.next-e2e/**` — FIXED.** Root cause: ESLint 9 flat config does not read `.gitignore`, and the top-level `ignores` listed only `.next/**`; the new generated E2E build tree (184 MB, including transpiled bundles) was therefore linted, producing 142 errors / 29 070 warnings from build output only. Fix: `".next-e2e/**"` added to the `ignores` array in `eslint.config.mjs`. Result: `pnpm lint` exits `0` in 6 s with **0 errors / 0 warnings**; an explicit `pnpm exec eslint .next-e2e` probe reports "all of the files matching the glob pattern \".next-e2e\" are ignored". Changed files (`playwright.config.ts`) were already clean before the ignore.
2. **Standalone warning is non-fatal** (pre-existing, confirmed in task 2): `next start` prints the `output: standalone` warning and serves correctly (`Ready in 105ms`, HTTP 200). No `next.config.js` change made.
3. **`tsconfig.json` includes are now pinned** to the generated `.next-e2e` type dirs; builds no longer re-dirty the tracked file.
4. **Login budget** (from task 2): the prod branch disables the `@test.local` bypass; task 4's `storageState` reuse remains a hard requirement.

## Cleanup receipt

Raw: `.omo/evidence/e2e-performance/task-3-cleanup-receipt.txt`

- `lsof -nP -iTCP:3000 -iTCP:8444 -iTCP:8445 -sTCP:LISTEN` → **empty**
- `pgrep -fl 'next start|stub-provider'` → **empty**
- `.next-e2e/` kept intentionally (184 MB, gitignored) so subsequent tasks reuse the build: `BUILD_ID` mtime `2026-09-11T13:07 CEST`.
