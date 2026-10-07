# Task 7 — Hygiene: dead config, stale DBs, leftover chromium, ignore rules

- **Repo:** `/Users/julienfroidefond/Sites/stripstream`
- **Base rev:** `e8904b8` (branch `main`, task 6 `refactor(e2e): centralize the sign-in helper`)
- **Date (UTC):** 2026-09-11
- **Toolchain:** Node `v24.17.0`, Playwright `1.62.1`
- **Status:** PASS — dead config removed, stale untracked DBs deleted, leftover project removed, global workers raised; `pnpm typecheck` and `pnpm lint` exit 0.

## Changes

| File | Change |
| --- | --- |
| `playwright.config.ts` | (a) Removed dead `E2E_TEST_MODE: '1'` from the Next webServer `env` and corrected the stale comment: the real login-throttle bypass is the `NODE_ENV` gate in `src/lib/services/auth-server.service.ts` (`@test.local` skips throttling only outside `NODE_ENV=production`). (b) Deleted `prisma/e2e.db` + `prisma/e2e-runtime.db` (untracked). (c) Removed the leftover `chromium` project; `setup` remains. (d) `workers: 1` → `workers: process.env.CI ? 2 : 4`. (e) `.gitignore` already had `/.next-e2e/` (line 14) and `.auth/` (line 64) — no edit needed. |
| `prisma/e2e.db`, `prisma/e2e-runtime.db` | Deleted after `git ls-files --error-unmatch` proved both untracked (`*.db` ignored at `.gitignore:58`). `prisma/dev.db`, `prisma/migrations/` and `prisma/data/` untouched. |

Diff: `1 file changed, 5 insertions(+), 9 deletions(-)`.

No `src/` edit. `E2E_DATABASE_URL`, `E2E_BASE_URL`, `E2E_PORT`, `E2E_USER_IS_ADMIN` (global-setup), build guard, `NEXT_DIST_DIR`, `NODE_ENV` and `reuseExistingServer: false` all preserved. No read-only/mutating projects and no `mutating.workers` added (task 8 owns them).

## Exact commands + results

| # | Command | Result |
| --- | --- | --- |
| 1 | `rg -n "E2E_TEST_MODE" .` | exit `1`, **no output** (no matches in the visible tree) |
| 2 | `git grep -n "E2E_TEST_MODE"` | exit `1`, no matches in **all tracked files** (scope proof: emptiness is from removal, not scan scope) |
| 3 | `ls prisma/e2e.db prisma/e2e-runtime.db` | both `No such file or directory`; `prisma/dev.db` still present |
| 4 | `git ls-files prisma \| rg '\.db'` | exit `1`, no tracked `.db` — nothing tracked was deleted |
| 5 | `git status --porcelain \| rg '^ D'` | exit `1`, no tracked deletion |
| 6 | `grep -n "name: 'chromium'" playwright.config.ts` | exit `1`, no match; `name: 'setup'` still at line 129 |
| 7 | `grep -n "workers" playwright.config.ts` | line 69: `workers: process.env.CI ? 2 : 4,` |
| 8 | `grep -n "next-e2e" .gitignore` / `grep -n ".auth/" .gitignore` | `14:/.next-e2e/`, `64:.auth/` |
| 9 | `git check-ignore -v .next-e2e/ .auth/` | both matched (`.gitignore:14`, `.gitignore:64`); `git ls-files \| rg '\.auth/\|\.next-e2e'` empty |
| 10 | `pnpm typecheck` | exit `0` |
| 11 | `pnpm lint` | exit `0` (only the pre-existing `baseline-browser-mapping` age notice) |

Raw happy output: `task-7-e2e-performance.txt` (154 lines).

## Failure QA

Raw output: `task-7-e2e-performance-failure.txt`.

- `git ls-files --error-unmatch package.json` → prints `package.json`, exit `0` (tracked file is protected).
- `git ls-files --error-unmatch prisma/e2e.db` → `error: pathspec 'prisma/e2e.db' did not match any file(s) known to git`, exit `1` (untracked → safe to delete).
- Same for `prisma/e2e-runtime.db`; control `prisma/schema.prisma` exits `0`.
- After deletion, `git status --porcelain | rg '^ D'` is empty and both files are gone.

## Adversarial QA

| Trigger | Status | Proof |
| --- | --- | --- |
| `dirty_worktree` | **handled** | Only `playwright.config.ts` is modified among tracked files (`git status --porcelain \| grep -v '^??'` → ` M playwright.config.ts`); `git status --porcelain \| rg '^ D'` empty; both `rm` targets were untracked `*.db` (failure evidence). |
| `misleading_success_output` | **handled** | `git grep` over every tracked file also exits `1`; the hidden/no-ignore probe (`rg --hidden --no-ignore -g '!.git/'`) *does* find the string, proving the default `rg` was scanning correctly and the emptiness comes from removal. Remaining hits are only `.omo/` prose (plan/draft/evidence) and one stale `node_modules/.cache/jiti` snapshot of the pre-change config — none tracked, none served. |
| `stale_state` | **handled** | `git check-ignore -v` confirms `.next-e2e/` (`.gitignore:14`) and `.auth/` (`.gitignore:64`) are ignored; `git ls-files` confirms neither is tracked, so they can never be committed. |
| `hung_or_long_commands` | **N/A** | No servers, builds or browsers launched; all commands were static git/rg/grep/tsc/eslint runs. |
| `data_loss` | **handled** | `prisma/dev.db`, `prisma/migrations/` (9 tracked files) and `prisma/data/` untouched. |

## Findings / risks

1. **Stale jiti cache** (`node_modules/.cache/jiti/stripstream-playwright.config.ac325205.mjs`) still contains the old `E2E_TEST_MODE` line. It is an ignored, disposable build cache keyed by content hash; the changed config produces a new cache entry, so the old one is inert. Not removed (node_modules is not part of the repo).
2. **Global `workers` is now `4` locally (`2` in CI) while `fullyParallel: false`.** With only the `setup` project present this changes nothing today; task 8 adds the per-project `workers` (`read-only: CI ? 2 : 4`, `mutating: 1`) that this global value unblocks. No `mutating.workers` was added here, per task split.
3. **No runnable spec project until task 8** — intentional: with `chromium` removed, a bare `playwright test` collects only the `setup` project.
4. `prisma/dev.db` remains (0-byte, untracked) as instructed.

## Cleanup receipt

No processes started, no temp files created; evidence is the only new output. Deleted: `prisma/e2e.db`, `prisma/e2e-runtime.db` (both untracked, ignored `*.db`).
