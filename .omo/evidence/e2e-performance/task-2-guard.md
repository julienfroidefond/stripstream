# Task 2 — Production-mode gate spike (E2E against `next start`)

- **Repo:** `/Users/julienfroidefond/Sites/stripstream`
- **Git rev:** `61be428aaa3b92807f58a656b3750bcd080357e2` (branch `main`)
- **Date (UTC):** 2026-09-11
- **Toolchain:** Node `v24.17.0`, Playwright `1.62.1`, Next.js `16.1.6`
- **Isolation dist dir:** `NEXT_DIST_DIR=.next-e2e`
- **Spike DB:** `file:/tmp/stripstream-e2e-spike.db`
- **Prod URL:** `http://127.0.0.1:3018`

## DECISION

**`production mode: APPROVED`**

Both probes passed: (b) session persistence + secure-cookie handling over `http://127.0.0.1`, and
(c) all four spec files green against a real `next start` production build.

---

## Probe (b) — session persistence + cookie name: **PASS**

Raw stdout: `.omo/evidence/e2e-performance/task-2-probe-b.log`

| Observation | Value |
| --- | --- |
| Login redirect URL | `http://127.0.0.1:3018/` |
| **Session cookie name (observed)** | **`__Secure-authjs.session-token`** |
| Session cookie attributes | `domain=127.0.0.1, path=/, secure=true, httpOnly=true, sameSite=Lax` |
| Other auth cookies | `__Host-authjs.csrf-token` (secure, httpOnly), `__Secure-authjs.callback-url` (secure, httpOnly) |
| `/account` final URL | `http://127.0.0.1:3018/account` |
| `/account` HTTP status | `200` |
| `Mon compte` heading visible | `true` |

Conclusion: `useSecureCookies: process.env.NODE_ENV === "production"` (`src/lib/auth.ts:63`)
emits the `__Secure-` prefixed cookie, and Chrome accepts it over plain `http://127.0.0.1:3018`
because loopback is treated as a secure context. The authenticated route does not redirect.

## Probe (c) — four specs against prod build: **PASS**

Raw stdout: `.omo/evidence/e2e-performance/task-2-e2e-performance.log`

```text
Running 12 tests using 1 worker
[1/12] ... account.spec.ts:12 ... [12/12] ... reader-stub.spec.ts:156
  12 passed (46.1s)
PLAYWRIGHT_EXIT=0
```

- `tests/account/account.spec.ts` — 3/3 pass
- `tests/home/home.spec.ts` — 3/3 pass
- `tests/integrations/streaming.spec.ts` — 2/2 pass
- `tests/reader/reader-stub.spec.ts` — 4/4 pass (Server-Action progress syncs included)

### Warm-image result (`tests/home/home.spec.ts:88-102`): **PASS**

The `transferSize===0` assertion is at `tests/home/home.spec.ts:101`. Extracted from the
Playwright JSON annotation `image-performance` (`.omo/evidence/e2e-performance/task-2-home-json.log`,
summary in `task-2-warm-image.txt`):

```text
COLD resources=7  allTransferSizeZero=true  layoutShift=0
WARM resources=9  allTransferSizeZero=true  layoutShift=0
WARM transferSizes=[0,0,0,0,0,0,0,0,0]
```

Warm reload reused the HTTP cache for all 9 image/proxy resources (`transferSize === 0` for every
resource) with zero layout shift.

---

## Throttle interaction: **none occurred** (thin margin — task-4 input)

`NODE_ENV=production` disables the `@test.local` login bypass (`src/lib/auth-server.service.ts:88-97`),
so the real `LOGIN_LIMIT = 10 / 60s` applies. The spike did not hit `RATE_LIMITED`.

Login accounting for the passing four-spec run:

| Account | UI logins in the run | Limit / 60s |
| --- | --- | --- |
| `e2e-stream@test.local` | 3 (account) + 3 (home) + 2 (streaming) + 1 (reader test 4, userA) = **9** | 10 |
| `e2e-reader@test.local` | 1 + 1 + 1 + 1 (reader tests 1–4) = **4** | 10 |

Wall clock was 46.1 s, i.e. under one 60 s window. **Task-4 input:** the prod run only fits because
it is fast and adds exactly 9 stream logins in <60 s. Any additional spec, a retry, or a slower cold
run that pushes stream logins past 10 within 60 s will return `RATE_LIMITED`. Task 4's storageState
reuse is therefore a hard requirement, not an optimization, for the prod branch.

---

## Exact commands used

```sh
# 1. Build (attempt 1 succeeded; no extra runtime env needed — .env supplied fallbacks and
#    @next/env never overrides an already-exported process.env)
NEXT_DIST_DIR=.next-e2e NODE_ENV=production ./node_modules/.bin/next build

# 2. Stubs
node tests/helpers/stub-provider.mjs 8444 &
node tests/helpers/stub-provider.mjs 8445 &

# 3. Prod server
NEXT_DIST_DIR=.next-e2e NODE_ENV=production PORT=3018 \
  DATABASE_URL=file:/tmp/stripstream-e2e-spike.db \
  NEXTAUTH_SECRET=stripstream-e2e-local-secret \
  NEXTAUTH_URL=http://127.0.0.1:3018 \
  ./node_modules/.bin/next start &

# 4. Four specs (globalSetup runs migrations + seeds the spike DB)
E2E_BASE_URL=http://127.0.0.1:3018 \
  E2E_DATABASE_URL=file:/tmp/stripstream-e2e-spike.db \
  ./node_modules/.bin/playwright test \
    tests/account/account.spec.ts tests/home/home.spec.ts \
    tests/integrations/streaming.spec.ts tests/reader/reader-stub.spec.ts \
    --reporter=line

# 5. Probe (b): inline Node/Playwright probe (no repo file), see task-2-probe-b.log

# 6. Warm-image numeric evidence: focused JSON-reporter run
E2E_BASE_URL=http://127.0.0.1:3018 \
  E2E_DATABASE_URL=file:/tmp/stripstream-e2e-spike.db \
  ./node_modules/.bin/playwright test tests/home/home.spec.ts --reporter=json
```

## Adversarial QA

| Trigger | Status | Evidence |
| --- | --- | --- |
| `misleading_success_output` | **handled** | Negative control in probe (b): after `context.clearCookies()`, `page.goto('/account')` lands on `/login?from=%2Faccount` → probe detects a lost session. Four-spec pass comes from the real `--reporter=line` output with `12 passed (46.1s)` + exit 0. |
| `stale_state` | **handled** | Fresh build `BUILD_ID=t3ZywrERFDVNX07gMVuK9`, `mtime=2026-09-11T11:00:52Z` (UTC), immediately before server start; no pre-existing `.next/BUILD_ID`. Server log: `▲ Next.js 16.1.6 … ✓ Ready in 194ms` running `next start` on `NEXT_DIST_DIR=.next-e2e`. |
| `hung_or_long_commands` | **handled** | Readiness before tests: stubs `curl -sf .../api/v1/libraries` 200 after 2 s; server `curl -sf /login` 200 after 1 s; `lsof` confirmed LISTEN on 8444/8445/3018. |
| `dirty_worktree` | **handled (with finding)** | `next build` with `NEXT_DIST_DIR=.next-e2e` auto-appended `.next-e2e/types/**/*.ts` + `.next-e2e/dev/types/**/*.ts` to the **tracked** `tsconfig.json` `include`. Not hand-edited; reverted with `git checkout -- tsconfig.json`. Final `git status` matches the pre-spike baseline (only pre-existing ` M .gitignore`, `A .omo/plans/e2e-performance.md`, and `.omo/` untracked). See `task-2-cleanup-receipt.txt`. |

## Findings forwarded to task 3 / task 4

1. **`tsconfig.json` mutation:** every `next build` with `NEXT_DIST_DIR=.next-e2e` rewrites `tsconfig.json`
   includes. Task 3 must commit the `.next-e2e` entries (or otherwise pin them) so the build stops dirtying
   a tracked file on each run.
2. **`.next-e2e/` is not yet in `.gitignore`** — task 3 adds it.
3. **Standalone warning is non-fatal:** `next start` prints `"next start" does not work with "output: standalone"…`
   but served the app correctly (`Ready in 194ms`, all requests 200). No `next.config.js` change needed.
4. **Login budget margin** (see throttle section) — storageState reuse in task 4 is mandatory for prod.

## Cleanup receipt

Raw: `.omo/evidence/e2e-performance/task-2-cleanup-receipt.txt`

- Killed stubs PID 42473 (:8444), 42477 (:8445) and prod server PID 42480 (:3018).
- `rm -f /tmp/stripstream-e2e-spike.db /tmp/stripstream-e2e-spike.db-journal`
- `rm -rf .next-e2e`
- `git checkout -- tsconfig.json` (build-artifact revert)
- `lsof -nP -iTCP:8444 -iTCP:8445 -iTCP:3018 -sTCP:LISTEN` → **empty**
- `pgrep -fl 'next start|stub-provider'` → **empty**
- Final `git status --porcelain` matches baseline (no tracked changes introduced by the spike).
