# e2e-performance - Work Plan

## TL;DR (For humans)

**What you'll get:** Une suite E2E nettement plus rapide couvrant exactement les mêmes scénarios : app testée en mode production (plus de compilation à la demande), connexion faite une fois par rôle au lieu d'à chaque test, attentes fixes remplacées par des attentes fiables, et parallélisation sûre des seuls tests qui ne modifient rien. Un rapport avant/après chiffré prouve le gain.

**Why this approach:** Trois causes dominent la lenteur : serveur en mode dev, login UI à chaque test, et `waitForTimeout`/`networkidle`. On corrige ces trois leviers (gain fort, risque faible), puis on ajoute un parallélisme limité aux tests prouvés sans écriture, avec un garde-fou qui fait échouer bruyamment toute écriture accidentelle. Le mode production est validé par un spike avant adoption, avec repli explicite.

**What it will NOT do:** Aucune modification de fichier sous `src/`, aucune réduction/suppression de test, aucun `skip`/`only` pour gagner du temps, aucun pipeline CI ajouté, et le délai volontaire de 750 ms du stub provider est conservé.

**Effort:** Large
**Risk:** Medium - le mode production change `NODE_ENV` (cookies `Secure`, rate-limit de login) ; le spike tâche 2 le valide, sinon repli `next dev`.
**Decisions I made for you:** (1) mode production spike-gated avec repli dev ; (2) auth via `storageState` (setup project) ; (3) parallélisme limité aux tests prouvés purs + garde-fous runtime ; (4) `workers` par projet en invocation unique, avec le plafond global relevé (sinon les 4 workers read-only sont inertes), mutating séquentiel après read-only ; (5) attentes web-first + `expect.poll` uniquement ; (6) F1-F4 avec critères agent-exécutables. Tu peux veto ici.

Your next move: validé par double review (Momus + Oracle), prêt pour `$start-work e2e-performance`. Détail ci-dessous.

---

> TL;DR (machine): Large/Medium. Speed up a 20-spec, ~64-case Playwright 1.62 suite via prod build (spike-gated, dev fallback), storageState auth reuse, hard-wait removal, per-project-workers single-invocation parallelism with runtime proof, and measured before/after. No src/ edits, no coverage loss.

## Scope
### Must have
- Reproducible timing harness with a **single-command wall-clock** metric and the **exact runtime test count** pinned as baseline; evidence dir created first.
- **Production-mode + storageState validation spike** before adoption: prove Secure cookies over `http://127.0.0.1`, session persistence, `storageState` round-trip, Server Action behavior, and cache-sensitive specs; explicit fallback to `next dev` if it fails.
- Production build in a **separate npm step before Playwright**, isolated in `.next-e2e`, with stale/missing-build guard.
- Auth reuse via Playwright setup project + `storageState` for `stream`/`reader`, with per-file anonymous overrides and a documented, bounded set of raw UI logins.
- Deterministic waits: zero `waitForTimeout`, zero `networkidle`; Server Action sync awaited via `expect.poll` or a `Next-Action` POST registered before the trigger; a hydration-proof sign-in retry.
- Safe parallelism: raise the top-level `workers` (e.g. `process.env.CI ? 2 : 4`) so per-project limits are meaningful (Playwright resolves `actualWorkers = min(global, per-project)`); `read-only` project (`workers: 4`/CI 2, exact `testMatch` globs with extensions) containing only specs proven to write nothing, and `mutating` project (`workers: 1`, `fullyParallel: false`) that depends on `read-only`; runtime proof via a read-only stub guard that blocks only non-read operations (allowlisting `POST /api/v1/books/list` and `POST /api/v1/series/list`) plus a DB hash.
- Remove the leftover `chromium` project; count parity = read-only + mutating = baseline, excluding the `setup` project.
- Fix the hardcoded `http://127.0.0.1:3017` origin in `tests/reader/reader-stub.spec.ts`.
- Hygiene: dead `E2E_TEST_MODE` removed with corrected comment; untracked `prisma/e2e*.db` removed; `.next-e2e/` ignored; test helper consolidated.
- `tests/README.md` updated; measured before/after; two consecutive green full runs with count parity.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No edits to files under `src/`. Production mode intentionally changes `NODE_ENV` runtime flags (`src/lib/auth.ts:63`, `src/lib/active-connection.ts:79`, `src/lib/services/auth-server.service.ts:88-97`) - E2E-only and validated by tâche 2; fallback keeps `next dev`.
- No coverage reduction: no delete/merge/skip/`test.only`/weakened assertion; runtime count and skipped count must equal baseline.
- No CI pipeline; no `reuseExistingServer` reuse; keep the stub 750 ms delay.
- Do not place any DB/provider writer in `read-only`; do not run mutating concurrently with read-only; do not point `E2E_DATABASE_URL` at a shared DB.
- Do not commit `.auth/` or secrets; do not change non-E2E script semantics.
- If the `setup` project collects zero tests, or read-only proof shows any write, the plan is blocked until fixed - never "fix" by skipping tests.

## Verification strategy
> Zero human intervention in verification - all verification is agent-executed. The user's final "okay" is a handoff gate to start execution, NOT a verification step.
- Test decision: **tests-after** - test-infrastructure change validated by running the real Playwright 1.62 suite (`package.json:15`). No unit framework.
- Final-verifier rows F1-F4 carry concrete commands + evidence paths; the handoff "okay" is separate and excluded from the zero-human-intervention claim.
- Evidence dir: `.omo/evidence/e2e-performance/` (created in tâche 1); one file per task, e.g. `task-<N>-e2e-performance.<ext>`, `final-<F>-e2e-performance.<ext>`.
- Primary metric: wall-clock of one full command via `/usr/bin/time -p`, reported including and excluding the build; baseline in tâche 1.
- Count parity: JSON report tests with `projectName != 'setup'` must equal tâche 1's baseline runtime count and skipped count.
- Anti-flake: tâche 9 runs the full flow twice; both green, counts equal, within ±10% duration.

## Execution strategy
### Parallel execution waves
- **Wave 0 - Measurement (tâche 1):** harness + exact baseline.
- **Wave 1 - Gate (tâche 2):** production-mode + storageState spike; decides prod vs dev.
- **Wave 2 - Foundation (tâches 3-6, sequential within the wave):** server mode, auth reuse, hard-wait removal, helper consolidation. Sequential because these tasks edit the same spec files (prevents parallel-edit staleness).
- **Wave 3 - Parallelism (tâches 7-8):** hygiene/chromium removal, then project split + read-only proof.
- **Wave 4 - Proof (tâche 9):** orchestration, docs, after-timing, anti-flake.
- **Final verification wave:** F1-F4, parallel, each with criteria.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | - | 9 | 2, 7 |
| 2 | - | 3, 4 (gate for prod mode) | 1, 7 |
| 3 | 2 | 8, 9 | 7 |
| 4 | 2, 3 | 5, 8, 9 | 7 |
| 5 | 4 | 6, 8, 9 | 7 |
| 6 | 5 | 8 | 7 |
| 7 | - | 8 | 1, 2, 3, 4, 5, 6 |
| 8 | 3, 4, 5, 6, 7 | 9 | - |
| 9 | 1, 3, 4, 5, 8 | F1-F4 | - |

## Todos
> Implementation + Test = ONE todo. Never separate.

- [x] 1. Build the timing harness and capture the exact baseline
  What to do: `mkdir -p .omo/evidence/e2e-performance`. Create `scripts/e2e-report.mjs` (Node zero-dep): read a Playwright JSON report, exclude `projectName === 'setup'`, and print total runtime test count (passed/failed/skipped), per-project counts, and the 15 slowest tests; accept wall-clock text as an argument. Add npm script `"test:e2e:timings": "node scripts/e2e-report.mjs"` (do NOT touch `"test:e2e:report"` = `playwright show-report`, `package.json:17`). Capture baseline with ONE command so it includes dev-server startup: `/usr/bin/time -p pnpm test:e2e 2>&1 | tee .omo/evidence/e2e-performance/task-1-baseline.log`; separately `PLAYWRIGHT_JSON_OUTPUT_NAME=.omo/evidence/e2e-performance/task-1-baseline.json pnpm exec playwright test --reporter=json`; then `node scripts/e2e-report.mjs .omo/evidence/e2e-performance/task-1-baseline.json "$(grep real .omo/evidence/e2e-performance/task-1-baseline.log)" > .omo/evidence/e2e-performance/task-1-baseline-summary.md`. Pin exact runtime and skipped counts.
  Must NOT do: do not modify config/specs; do not use a warm build for the baseline; do not count the `setup` project (name-collision guard: the setup project does not exist yet at tâche 1, so the filter is a no-op then).
  Parallelization: Wave 0 | Blocked by: none | Blocks: 9
  References: `package.json:14-17`; `playwright.config.ts:28`; `tests/public/access-control.spec.ts:3-24`; `tests/public/responsive.spec.ts:3-23`.
  Acceptance criteria: baseline summary states total wall-clock, the exact numeric runtime count and skipped count, and slowest 15; harness exits 0.
  QA scenarios: happy - run the commands, assert summary exists with numeric count > 0 (evidence `task-1-e2e-performance.md`). failure - `node scripts/e2e-report.mjs /nonexistent.json` exits non-zero with a clear message (evidence `task-1-e2e-performance-failure.md`).
  Commit: Y | `test(e2e): add timing report harness and exact baseline`

- [x] 2. Validate production mode and storageState before adopting (gate spike)
  What to do: Run a self-contained probe (no committed config change). Use `E2E_DATABASE_URL=file:/tmp/stripstream-e2e-spike.db`.
  1. Build: `NEXT_DIST_DIR=.next-e2e NODE_ENV=production ./node_modules/.bin/next build` (the standalone warning is non-fatal; no `next.config.js` change is needed).
  2. Start stubs manually: `node tests/helpers/stub-provider.mjs 8444 &` and `... 8445 &`.
  3. Start prod server: `NEXT_DIST_DIR=.next-e2e NODE_ENV=production PORT=3018 DATABASE_URL=file:/tmp/stripstream-e2e-spike.db NEXTAUTH_SECRET=stripstream-e2e-local-secret NEXTAUTH_URL=http://127.0.0.1:3018 ./node_modules/.bin/next start &`.
  4. Run probes with Playwright pointed at it (globalSetup still runs and seeds the spike DB): `E2E_BASE_URL=http://127.0.0.1:3018 E2E_DATABASE_URL=file:/tmp/stripstream-e2e-spike.db ./node_modules/.bin/playwright test tests/account/account.spec.ts tests/home/home.spec.ts tests/integrations/streaming.spec.ts tests/reader/reader-stub.spec.ts --reporter=line`. Do NOT reference `tests/setup/auth.setup.ts` (created in tâche 4); use the existing UI login in `tests/helpers/auth.ts` via `tests/account/account.spec.ts`.
  Probes: (b) assert the UI login succeeds and persists: `tests/account/account.spec.ts` must show the signed-in profile and its authenticated route must not redirect to `/login`; record the observed session-cookie name (`authjs.session-token` vs `__Secure-authjs.session-token`). StorageState round-trip is validated in tâche 4 (not prod-mode-specific). (c) the four specs must be green, including the warm-image `transferSize===0` assertion (`tests/home/home.spec.ts:88-102`) and reader-stub Server-Action syncs.
  Decision rule: if (b) and (c) pass, production mode is APPROVED. Otherwise record `fallback: keep next dev` in `.omo/evidence/e2e-performance/task-2-guard.md`; task 3 then keeps `next dev` and tasks 4-9 continue.
  Must NOT do: do not edit `src/`; do not commit the spike build/dist; do not gate on a login-count budget here (moved to tâche 4).
  Parallelization: Wave 1 | Blocked by: none | Blocks: 3, 4
  References: `src/lib/auth.ts:63`; `src/lib/active-connection.ts:79`; `src/lib/services/auth-server.service.ts:16,88-97`; `playwright.config.ts:5-7,38-77`; `tests/home/home.spec.ts:88-102`; `tests/integrations/streaming.spec.ts:63-90`; `tests/reader/reader-stub.spec.ts`.
  Acceptance criteria: `task-2-guard.md` states PASS/FAIL for (b) and (c) with the observed cookie name, the `/account` status, the warm-image result, and the decision (prod vs fallback dev).
  QA scenarios: happy - spike PASS with recorded evidence (evidence `task-2-guard.md`). failure - launch the spike context with cookies disabled to confirm the probe detects session failure instead of assuming success (evidence `task-2-e2e-performance-failure.md`).
  Commit: N | spike only

- [x] 3. Wire the E2E server mode (production build, or documented dev fallback)
  What to do: Production branch (spike PASS): add `"test:e2e:build": "NEXT_DIST_DIR=.next-e2e next build"`; set the Next webServer `command` in `playwright.config.ts:43` to `./node_modules/.bin/next start`; add `NEXT_DIST_DIR: '.next-e2e'` and `NODE_ENV: 'production'` to its env (`:49-57`); add a build guard that fails if `.next-e2e/BUILD_ID` is missing and prints a loud banner with the build mtime when reusing an existing build. Fallback branch (spike FAIL): keep `command: './node_modules/.bin/next dev'` and no build script; record the branch in `task-2-guard.md`. Build stays a separate npm step because Playwright starts webServer **before** `globalSetup` (verified), so building inside webServer would precede `prisma migrate deploy` (`tests/global-setup.ts:19-22`). Add `/.next-e2e/` to `.gitignore`. Do NOT change `next.config.js` (the standalone warning is non-fatal).
  Must NOT do: do not build inside webServer; do not set `output` gating; do not edit `src/`; do not remove the dev fallback path.
  Parallelization: Wave 2 | Blocked by: 2 | Blocks: 8, 9
  References: `playwright.config.ts:38-77` (`:43,47,48,49-57`); `tests/global-setup.ts:6-22`; `package.json:6-11`; `.gitignore`.
  Acceptance criteria: prod branch - `pnpm test:e2e:build` exits 0 and creates `.next-e2e/BUILD_ID`; `--project=setup` starts `next start` with `NODE_ENV=production`; missing `.next-e2e` fails explicitly; stale build prints the mtime banner. Dev branch - `next dev` still starts and `--project=setup` passes; the branch is recorded.
  QA scenarios: happy - run the chosen branch's server/setup and assert green (evidence `task-3-e2e-performance.log`). failure - delete `.next-e2e/BUILD_ID` (prod branch) and assert the guard blocks the run (evidence `task-3-e2e-performance-failure.log`).
  Commit: Y | `test(e2e): wire the E2E server mode with build guard`

- [x] 4. Reuse authentication via storageState (setup project) and fix the cookie origin
  What to do: Extend `tests/helpers/auth.ts` to `signIn(page, { email = e2eEmail, password = e2ePassword } = {})`. Create `tests/setup/auth.setup.ts` with TWO setup tests (stream, reader): ensure `tests/.auth/` exists (`mkdirSync(dir,{recursive:true})`), log in via the UI helper, and `context.storageState({ path })` to `tests/.auth/stream.json` / `reader.json`. In `playwright.config.ts`, add `{ name: 'setup', testMatch: /auth\\.setup\\.ts/ }` (without `testMatch` Playwright's default pattern collects zero tests). Set project-level `use.storageState = 'tests/.auth/stream.json'` on the read-only and mutating projects (added in tâche 8; until then attach it per-file). Explicit overrides:
  - Anonymous specs (empty state): `tests/public/access-control.spec.ts`, `tests/public/authentication.spec.ts`, `tests/public/pwa.spec.ts`, `tests/public/responsive.spec.ts`, and (mutating) `tests/public/security.spec.ts` - `test.use({ storageState: { cookies: [], origins: [] } })`.
  - Reader specs (reader role): `tests/reader/reader.spec.ts`, `tests/reader/reader-stub.spec.ts` - `test.use({ storageState: 'tests/.auth/reader.json' })`.
  - Remove `signIn` from all `beforeEach`/test bodies except the `setup` project and the cross-account test in `reader-stub.spec.ts` (it keeps raw `signIn` for two users). `tests/public/authentication.spec.ts` does not call `signIn` today - keep it that way; `tests/public/security.spec.ts` keeps its raw form flows. Keep the `NEXT_LOCALE` cookie in `tests/public/authentication.spec.ts:5`. Crucially, project-level `storageState` only injects cookies - it does NOT navigate: any spec that relied on `signIn` to reach its post-login page must add an explicit `await page.goto('/')` (notably `tests/reader/reader-stub.spec.ts` test 3, whose `localStorage.clear()`/`waitForLoadState` currently runs on the page left by `signIn`).
  - Fix the hardcoded `http://127.0.0.1:3017` cookies in `tests/reader/reader-stub.spec.ts:166-171` to `test.info().project.use.baseURL`.
  Login bound: after this task, UI credential logins are setup (1 per account: stream + reader) plus reader-stub cross-account (<=1 per account) = <=2 per account (<=4 total) per run, well under `LOGIN_LIMIT = 10`; assert no other `signIn(` callers exist.
  Must NOT do: do not commit `tests/.auth/`; do not leave a project-level state on anonymous specs; do not change credentials.
  Parallelization: Wave 2 | Blocked by: 2, 3 | Blocks: 5, 8, 9
  References: `tests/helpers/auth.ts:5-21`; `tests/global-setup.ts:26-40`; `playwright.config.ts:31,78-80`; `.gitignore:63`; `tests/reader/reader-stub.spec.ts:9,50-55,166-171`; `tests/public/authentication.spec.ts:4-7`; `tests/account/session.spec.ts:9,27`.
  Acceptance criteria: `pnpm exec playwright test --project=setup` creates both state files with cookie arrays; `rg -n "await signIn\\(" tests` matches only `tests/setup/auth.setup.ts` and the reader-stub cross-account test; the two-user reader test passes with default `E2E_PORT`; read-only anonymous specs see a logged-out state.
  QA scenarios: happy - run setup + the authenticated suite, assert green (evidence `task-4-e2e-performance.json`). failure - delete `stream.json` and run an authed spec; assert a fast missing-state failure (evidence `task-4-e2e-performance-failure.txt`).
  Commit: Y | `test(e2e): reuse auth via storageState and fix cookie origin`

- [x] 5. Replace every hard wait with a correct, hydration-safe mechanism
  What to do: Remove all fixed sleeps and `networkidle`, registering waits BEFORE triggers:
  - Sign-in hydration: rewrite the shared `signIn` (and the reader-stub raw copy) to retry the fill until values stick, e.g. `await expect.poll(async () => { await emailInput.fill(email); await passwordInput.fill(password); return \`${await emailInput.inputValue()}|${await passwordInput.inputValue()}\`; }).toBe(\`${email}|${password}\`);` then click and assert the URL. This eliminates the documented hydration flake without `networkidle` (`tests/integrations/streaming.spec.ts:21-27`).
  - `tests/home/home.spec.ts:62` and `tests/reader/reader-stub.spec.ts:81,130,178,185`: the mutation is a Next **Server Action** (`src/app/actions/read-progress.ts:24` via `src/components/reader/hooks/usePageNavigation.ts:5,72`) - a provider URL regex can never match. Use `await expect.poll(() => request.get('http://127.0.0.1:8444/api/v1/books/book-a').then(r => r.json()).then(j => j.readProgress?.page))` for provider-state assertions, or `const wait = page.waitForResponse(r => r.request().method() === 'POST' && !!r.request().headers()['next-action']); await trigger(); await wait;`.
  - `tests/library/reading-status.spec.ts:32`: assert `await expect(komgaConnection.getByRole('radio')).toBeChecked()`.
  - `tests/public/security.spec.ts:58,67`: register each attempt's response before the click and await it before the next iteration (limit is per-email).
  - `tests/public/responsive.spec.ts:12,27`: drop `{ waitUntil: 'networkidle' }`; keep `expect(page.locator('form')).toBeVisible()`.
  - `tests/reader/reader-stub.spec.ts:115,141`: `storageState` does not navigate, so add an explicit authenticated navigation (`await page.goto('/')`) BEFORE the shell assertion; then replace `networkidle` with the authenticated shell assertion (e.g. `await expect(page.getByRole('main')).toBeVisible()`) immediately before `localStorage.clear()`, preserving the "hydrated before clearing" intent.
  Must NOT do: do not delete/weaken the rate-limit scenario; do not add `waitForTimeout`; do not match read-progress by client URL.
  Parallelization: Wave 2 | Blocked by: 4 | Blocks: 6, 8, 9
  References: `src/app/actions/read-progress.ts:24`; `src/components/reader/hooks/usePageNavigation.ts:5,72`; `tests/home/home.spec.ts:62`; `tests/reader/reader-stub.spec.ts:81,115,130,141,178,185`; `tests/library/reading-status.spec.ts:32`; `tests/public/security.spec.ts:32,58,67`; `tests/public/responsive.spec.ts:12,27`; `tests/integrations/streaming.spec.ts:21-27`.
  Acceptance criteria: `rg -n "waitForTimeout|networkidle" tests` returns no matches; affected specs pass.
  QA scenarios: happy - run the affected specs, assert green (evidence `task-5-e2e-performance.json`). failure - reintroduce a `waitForTimeout` and assert the grep guard fails, then remove it (evidence `task-5-e2e-performance-failure.txt`).
  Commit: Y | `test(e2e): replace hard waits with hydration-safe web-first waits`

- [x] 6. Consolidate the sign-in helper into one source
  What to do: Delete the 6 local `signIn`/`signInReader` copies and import the shared helper, passing the reader account where needed: `tests/reader/reader-stub.spec.ts:9-22`, `tests/reader/reader.spec.ts:12-24`, `tests/library/reading-status.spec.ts:7-19`, `tests/library/favorites-reading-lists.spec.ts:7-19`, `tests/integrations/streaming.spec.ts:13-31`, `tests/integrations/mutations.spec.ts:7-19`. Remove now-unused local constants only where nothing else references them. Note `tests/helpers/auth.ts:7` `hasE2eCredentials` is an always-true no-op - keep or simplify, but never rely on it as a guard.
  Must NOT do: do not change selectors/credentials; keep the raw cross-account login in reader-stub; do not re-run edits already applied in tâche 5 (this task only moves definitions after tâche 5 rewrote them).
  Parallelization: Wave 2 | Blocked by: 5 | Blocks: 8
  References: `tests/helpers/auth.ts`; the 6 files/lines above.
  Acceptance criteria: `rg -n "async function signIn" tests` returns only `tests/helpers/auth.ts`; `pnpm lint` and `pnpm typecheck` pass; affected specs pass.
  QA scenarios: happy - run the 6 specs + quality gates (evidence `task-6-e2e-performance.json`). failure - pass a wrong email type and assert `pnpm typecheck` fails, then revert (evidence `task-6-e2e-performance-failure.txt`).
  Commit: Y | `refactor(e2e): centralize the sign-in helper`

- [x] 7. Hygiene: dead config, stale DBs, leftover chromium, ignore rules
  What to do: (a) Remove the dead `E2E_TEST_MODE: '1'` injection (`playwright.config.ts:53`) and correct the stale comment: the real login-throttle bypass is the `NODE_ENV` gate at `src/lib/services/auth-server.service.ts:88`. (b) Delete `prisma/e2e.db` and `prisma/e2e-runtime.db` only if `git ls-files` confirms untracked (`*.db` ignored at `.gitignore:57`).   (c) Remove the leftover `chromium` project (`playwright.config.ts:78-80`) and move `use: { ...devices['Desktop Chrome'] }` onto the read-only/mutating projects in tâche 8 - otherwise bare runs collect every spec twice. (d) Raise/remove the global `workers: 1` (`playwright.config.ts:27`): set `workers: process.env.CI ? 2 : 4`, because Playwright resolves `actualWorkers = min(global, per-project)` — leaving `1` makes `read-only.workers: 4` inert. Keep `mutating.workers: 1`. (e) Add `/.next-e2e/` to `.gitignore`.
  Must NOT do: do not remove `E2E_DATABASE_URL`, `E2E_BASE_URL`, `E2E_PORT`, `E2E_USER_IS_ADMIN`; do not delete migrations; do not enable `reuseExistingServer`.
  Parallelization: Wave 3 | Blocked by: none | Blocks: 8
  References: `playwright.config.ts:24,27,49-57,78-80`; `src/lib/services/auth-server.service.ts:88`; `.gitignore:57,63`; `tests/account/admin-authorization.spec.ts:4`.
  Acceptance criteria: `rg -n "E2E_TEST_MODE" .` returns no matches; stale DBs gone (or documented tracked); no `chromium` project remains; global `workers` is no longer `1` (raised to `CI ? 2 : 4` or removed) and `mutating.workers: 1` exists; `.next-e2e` ignored.
  QA scenarios: happy - run the confirmations (evidence `task-7-e2e-performance.txt`). failure - assert `git ls-files` blocks deleting a tracked file (evidence `task-7-e2e-performance-failure.txt`).
  Commit: Y | `chore(e2e): remove dead config and stale artifacts`

- [x] 8. Split projects with proven read-only classification and runtime guards
  What to do: Define projects in `playwright.config.ts` (each with `use: { ...devices['Desktop Chrome'] }`):
  - `setup`: `testMatch: /auth\\.setup\\.ts/`.
  - `read-only`: `dependencies: ['setup']`, `fullyParallel: true`, `workers: process.env.CI ? 2 : 4`, `testMatch` (exact globs WITH extensions - bare names match nothing because Playwright prepends `**/` and matches the absolute path) = `['**/public/access-control.spec.ts', '**/public/authentication.spec.ts', '**/public/pwa.spec.ts', '**/public/responsive.spec.ts', '**/account/**/*.spec.ts']`. (Explicitly EXCLUDED because they write: `library/library` persists `defaultSortOrder`/`showMissingBooks`; `library/authenticated-navigation` and `reader/reader` mount the reader and may sync read-progress on unmount.)
  - `mutating`: `dependencies: ['setup', 'read-only']` (runs strictly after read-only), `fullyParallel: false`, `workers: 1`, `testMatch` (exact globs) = `['**/public/security.spec.ts', '**/integrations/**/*.spec.ts', '**/home/**/*.spec.ts', '**/library/library.spec.ts', '**/library/authenticated-navigation.spec.ts', '**/library/favorites-reading-lists.spec.ts', '**/library/reading-status.spec.ts', '**/library/series-rating.spec.ts', '**/library/series-sort.spec.ts', '**/reader/reader.spec.ts', '**/reader/reader-stub.spec.ts']`. Keep `mode: 'serial'` where present. Together the two lists must enumerate exactly the 20 spec files counted in tâche 1.
  Runtime proof that `read-only` writes nothing:
  - Extend `tests/helpers/stub-provider.mjs` with a guard mode: when `E2E_STUB_READONLY=1`, block (403) and append `METHOD URL` to `E2E_STUB_LOG` ONLY for non-read operations - i.e. everything except GET plus the read-query allow-list `POST /api/v1/books/list` and `POST /api/v1/series/list` (plus the read POST in `src/lib/providers/stripstream/stripstream.provider.ts`). Do NOT 403 all non-GET: the home page legitimately POSTs those list endpoints, so blocking them would both corrupt read-only data and make the "zero writes" assertion unsatisfiable.
  - Extend `tests/global-setup.ts`: after seeding and `$disconnect`, if `E2E_DB_HASH_FILE` is set, write the sha256 of the `E2E_DATABASE_URL` SQLite file.
  - Proof run: `E2E_STUB_READONLY=1 E2E_STUB_LOG=.omo/evidence/e2e-performance/task-8-stub.log E2E_DB_HASH_FILE=.omo/evidence/e2e-performance/task-8-db-before.sha E2E_DATABASE_URL=file:/tmp/stripstream-e2e-ro.db playwright test --project=read-only`; then assert the run is green, the blocked-operations log is empty, and `shasum -a 256 /tmp/stripstream-e2e-ro.db` equals the recorded hash.
  Must NOT do: do not place any writer in `read-only`; do not run mutating at `workers>1`; do not remove the read-only guard env handling.
  Parallelization: Wave 3 | Blocked by: 3, 4, 5, 6, 7 | Blocks: 9
  References: `playwright.config.ts:19-31,78-80`; `tests/helpers/stub-provider.mjs:20,146-148`; `tests/global-setup.ts:19-22,80`; `src/components/library/PaginatedSeriesGrid.tsx` (sort/filter persist); `tests/library/series-sort.spec.ts:12-14`; `tests/library/authenticated-navigation.spec.ts:41-47`; `src/components/reader/hooks/usePageNavigation.ts:157-177`.
  Acceptance criteria: `--project=read-only --list` lists exactly the read-only specs plus the `setup` dependency (dependencies are included by default), and `--project=mutating --list` lists the rest plus `setup`/`read-only`; the two lists enumerate exactly the 20 spec files from tâche 1; the proof run is green with an empty blocked-operations log and an unchanged DB hash; `--project=read-only` runs with the configured number of workers (not capped at 1).
  QA scenarios: happy - proof run green + empty blocked-operations log + unchanged DB hash (evidence `task-8-e2e-performance.md`). failure - temporarily move `library/library` into `read-only`, rerun the proof, and show the DB hash changes (preferences write) - then restore (evidence `task-8-e2e-performance-failure.txt`).
  Commit: Y | `test(e2e): split projects with proven read-only classification`

- [x] 9. Orchestrate, document, and prove the after-timings
  What to do: Wire npm scripts (single invocation; per-project workers do the rest): `"test:e2e": "pnpm test:e2e:build && playwright test"`, `"test:e2e:run": "playwright test"`, `"test:e2e:read-only": "playwright test --project=read-only"`, `"test:e2e:mutating": "playwright test --project=mutating"` (keep `test:e2e:ui`, `test:e2e:report`, `test:e2e:timings`). In the dev-fallback branch, `"test:e2e": "playwright test"` with no build. Confirm the run order setup → read-only → mutating via dependencies, and that a single temp DB is used with mutating serialized after read-only. External `E2E_BASE_URL` mode still works (no webServer/build; keep the project split). Update `tests/README.md` (server mode, scripts, projects, storageState files, read-only proof, timings). Re-measure with the SAME command as tâche 1 (wall-clock including build) into `task-9-after.*`; produce a before/after table (with/without build, count, slowest); run the full flow twice; assert parity (`projectName != 'setup'` equals tâche 1 baseline count and skipped).
  Must NOT do: do not claim a speedup without two green runs; do not hide a regression or count mismatch.
  Parallelization: Wave 4 | Blocked by: 1, 3, 4, 5, 8 | Blocks: F1-F4
  References: `package.json:14-17`; `playwright.config.ts:5-17,38-77`; `tests/global-setup.ts:7-22`; `tests/README.md:1-50`.
  Acceptance criteria: two consecutive full runs green with runtime/skipped counts equal to tâche 1's baseline (excluding setup); after-summary shows wall-clock delta with and without build; read-only executed with more than one worker (observed in the JSON report), proving the global cap was removed; README documents every new command and the fallback branch.
  QA scenarios: happy - run the full flow twice, assert parity + green (evidence `task-9-e2e-performance.md`). failure - break one spec and assert the run reports it non-zero, then revert (evidence `task-9-e2e-performance-failure.txt`).
  Commit: Y | `docs(e2e): document and prove the performance workflow`

## Final verification wave
> Runs in parallel after ALL todos. Each verifier emits APPROVE/REJECT plus evidence; the user's handoff "okay" is separate from verification.
- [x] F1. Plan compliance audit
  What to do: assert `rg -n "waitForTimeout|networkidle" tests` empty; `rg -n "async function signIn" tests` returns only `tests/helpers/auth.ts`; `rg -n "E2E_TEST_MODE" .` empty; `git diff --name-only` contains no `src/` path; `.auth/` and `.next-e2e/` are not tracked (`git status --porcelain`); `--project=read-only --list`/`--project=mutating --list` enumerate exactly the 20 baseline specs (plus `setup`/dependency suites); global `workers` is not `1`.
  Evidence: `final-F1-e2e-performance.md` (commands + output).
- [x] F2. Code quality review
  What to do: `pnpm lint` and `pnpm typecheck` exit 0; `node --check scripts/e2e-report.mjs` exits 0; review the changed E2E config/helpers for dead code and contradictory comments; confirm no `test.only`/unjustified `test.skip`.
  Evidence: `final-F2-e2e-performance.md`.
- [x] F3. Real manual QA (agent-executed)
  What to do: run `pnpm test:e2e:run` twice consecutively; both runs green; counts match baseline excluding setup; record wall-clock; confirm read-only used more than one worker; run the read-only proof from tâche 8 again and confirm zero writes.
  Evidence: `final-F3-e2e-performance.md`.
- [x] F4. Scope fidelity
  What to do: diff the runtime test list/count against the tâche 1 baseline; confirm no test was deleted, merged, or newly skipped; confirm `tests/README.md` reflects the shipped scripts; confirm the stub 750 ms delay is still present.
  Evidence: `final-F4-e2e-performance.md`.

## Commit strategy
- One commit per todo, Conventional Commit style scoped to E2E tooling, so the Gitea deploy skip filter (`test`, `chore`, `docs`; `.gitea/workflows/deploy.yml:22-27`) avoids an app redeploy. Tâche 2 is a spike (no commit).
- Sequence: `test(e2e): add timing report harness and exact baseline` → `test(e2e): wire the E2E server mode with build guard` → `test(e2e): reuse auth via storageState and fix cookie origin` → `test(e2e): replace hard waits with hydration-safe web-first waits` → `refactor(e2e): centralize the sign-in helper` → `chore(e2e): remove dead config and stale artifacts` → `test(e2e): split projects with proven read-only classification` → `docs(e2e): document and prove the performance workflow`.
- Do not push/merge; leave branch/PR decisions to the user.

## Success criteria
- Production mode is either spike-validated with evidence or explicitly reverted to `next dev` in `task-2-guard.md`; the chosen branch is consistently wired in tâche 3 and tâche 9.
- Two consecutive full runs are green; runtime and skipped counts (excluding the `setup` project) equal the tâche 1 baseline exactly; no test deleted/merged/skipped.
- The read-only project contains no writer and its proof run shows zero non-GET stub requests and an unchanged DB hash.
- Measured wall-clock improvement is reported with and without build; no hidden regression.
- `rg -n "waitForTimeout|networkidle" tests` empty; one `signIn` definition; `pnpm lint` + `pnpm typecheck` pass.
- No `src/` file changed; `.auth/` and `.next-e2e/` are not committed; the stub 750 ms delay is intact.
