# Task 2 — Failure / negative-control evidence

Scope: prove the probe and the four-spec run are **not vacuous**, and record any genuine prod-mode
failure. Spike ran against `next start` on `http://127.0.0.1:3018`.

## Negative control (probe is not vacuous): **PASS**

Raw stdout: `.omo/evidence/e2e-performance/task-2-probe-b.log`

After a successful UI login and a `200` `/account` render, the probe deliberately destroys the
session and re-checks:

```text
AFTER_CLEAR_URL=http://127.0.0.1:3018/login?from=%2Faccount
AFTER_CLEAR_STATUS=200
AFTER_CLEAR_REDIRECTED_TO_LOGIN=true
```

`context.clearCookies()` makes `/account` redirect to the login page (`/login?from=%2Faccount`).
This proves the probe genuinely detects a lost session instead of assuming success: the same
probe reported `ACCOUNT_STATUS=200` / `ACCOUNT_HEADING_VISIBLE=true` while authenticated and a
redirect once cookies are cleared.

## Four-spec run — genuine failing output: **none**

`.omo/evidence/e2e-performance/task-2-e2e-performance.log` ends with:

```text
  12 passed (46.1s)
PLAYWRIGHT_EXIT=0
```

No test failed, so no throttle-isolation re-run was required. There is no non-throttle prod-mode
failure to report; `production mode` is therefore **APPROVED** (see `task-2-guard.md`).

## Non-failure finding (dirty worktree, not a prod-mode defect)

The spike's first `next build` auto-modified the tracked `tsconfig.json` by adding
`.next-e2e/types/**/*.ts` and `.next-e2e/dev/types/**/*.ts` to `compilerOptions.include`. This is a
Next.js build side effect, not a test failure, and it was reverted with `git checkout -- tsconfig.json`.
Recorded in full in `task-2-cleanup-receipt.txt` and forwarded to task 3.
