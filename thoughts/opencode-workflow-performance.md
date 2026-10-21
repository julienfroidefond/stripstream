# OpenCode workflow performance — stripstream port

Port of `stripstream-librarian@c80bede7` (`perf(opencode): restore cargo cache and trim agent context`)
to this repository. Same five levers, re-validated against stripstream's actual Next.js/pnpm CI and
adapted where the mechanism or the toolchain differs. No application code changed.

- Reference (read-only): `/Users/julienfroidefond/orca/workspaces/stripstream-librarian/issue-151-opencode-workflow`
- Branch: `julienfroidefond/port-opencode-workflow-perf`
- Baseline commit: `b7e05ee ci(opencode): stop bot comments from cancelling successful runs`

## 1. Findings before the change

### 1.1 The OpenCode jobs never save a cache (root cause, verified)

Run [`39554566577`](https://github.com/julienfroidefond/stripstream/actions/runs/39554566577)
(2026-10-21, the only successful `opencode.yml` run on the repo) shows:

| Log line | Step |
| --- | --- |
| `Cache mode: read` | Set up job |
| `pnpm cache is not found` | Set up Node |
| `key: opencode-Linux-X64-v1.19.3` / `Cache not found for input keys: …` | Run OpenCode |
| `##[warning]Cache reservation failed: cache write denied: token has no writable scopes` | Post Run OpenCode |
| `Cache save skipped: the effective cache-mode 'read' does not permit writes.` | Post Set up Node |

So both caches the workflow depends on are cold on every run and their save is dropped:

- the **pnpm store** (`actions/setup-node`, `cache: pnpm`);
- the **OpenCode CLI** the `anomalyco/opencode/github` action downloads (`opencode-<os>-<arch>-<version>`).

The cause is not the `permissions:` block. Since GitHub's 2026-06-26 cache change, workflows triggered
by a *low-trust* event get read-only cache access: trusted triggers are `push`, `workflow_dispatch`,
`repository_dispatch`, `delete`, `registry_package`, `page_build`, `schedule`. `opencode.yml` is
triggered by `issues`, `issue_comment` and `pull_request_review_comment` — all low-trust. The opt-out
is the `cache-mode: write` workflow/job key, which controls the scoped cache token.

Counter-evidence that `permissions` is *not* the gate: `ci.yml` holds only `contents: read` and still
saves caches on `pull_request`:
[`39212164174`](https://github.com/julienfroidefond/stripstream/actions/runs/39212164174) logs
`Cache mode: write` and `Cache saved with the key: node-cache-Linux-x64-pnpm-dc670c2b…`.

### 1.2 Baseline timings (`39554566577`, job `119071205640`)

| Step | Time |
| --- | --- |
| Set up job | 2.8 s |
| Checkout | 6.8 s |
| Set up pnpm | 10.1 s |
| Set up Node (cache lookup, miss) | 6.0 s |
| Install dependencies | 10.5 s |
| Install Playwright Chromium | 23.2 s |
| Run OpenCode | 46.9 s |
| Post steps + complete | 1.6 s |
| **Total** | **≈ 108 s** |

Setup is 36 s of a 108 s run (33 %); 33 s of that is dependency/browser installation that a warm
cache can cut. The agent step itself dominates a real task run (20–45 min per the workflow comments),
so the saving is per-run overhead, not agent time.

### 1.3 What the pnpm store cache is worth (local measurement)

Fresh store vs restored store, same lockfile, same machine (`pnpm 9.0.0`, `--ignore-scripts` to
isolate dependency resolution, `node_modules` removed between runs):

| Scenario | Wall time |
| --- | --- |
| Empty store (cold, what `opencode.yml` does today) | 36.1 s |
| Populated store (warm, what a restored cache does) | 5.1 s |

Store size: 921 MB. On the GitHub runner the cold install was only 10.5 s (faster network), so the
expected runner-side saving is ~5–7 s per install plus ~1–2 s for the OpenCode CLI — small but free,
and it also removes two warnings per run.

### 1.4 Agent context before the change

| File | Tokens (`tiktoken`, `cl100k_base`) | Bytes |
| --- | --- | --- |
| `AGENTS.md` | 4 489 | 18 373 |
| `CLAUDE.md` | 168 | 702 |
| Startup context (both) | **4 657** | 19 075 |
| `.opencode/agent/reviewer.md` (reviewer only) | 522 | 2 121 |

End-to-end prompt, same method as the reference report (`opencode run`, then
`opencode session export`, `tokens.input + tokens.cache.read`):

| Run | Prompt tokens |
| --- | --- |
| Empty scratch repo (witness, no `AGENTS.md`) | 8 318 |
| This tree at baseline commit `b7e05ee` (`git archive HEAD` copy) | **13 844** |
| Delta attributable to repo context | 5 526 |

## 2. Changes

| File | Change |
| --- | --- |
| `.github/workflows/opencode.yml` | `cache-mode: write` on both jobs, so the pnpm store and OpenCode CLI caches are saved; comments explain the low-trust default and warn against adding `actions: write`. |
| `.github/workflows/README.md` *(new)* | CI/CD internals moved out of `AGENTS.md`: workflow table, required status check, image tags and version bump, deploy-runner keychain gotcha, Dependabot pointer, and the cache/scoping policy with the measured evidence. |
| `.github/dependabot-policy.md` *(new)* | Dependabot policy moved out of `AGENTS.md` and the `dependabot.yml` header: grouping, auto-merge scope, framework/runtime exclusions (mirrored in `dependabot-auto-merge.yml`), schedule, prerequisites. |
| `.github/dependabot.yml` | 10-line policy comment replaced by a 4-line pointer to the new policy file (no rule changed). |
| `AGENTS.md` | 198 → 111 lines, 4 489 → 3 079 tokens. Architecture section reduced to the invariants that change what you write, each pointing at the matching `docs/architecture.md` section; CI/CD and Dependabot detail relocated (not deleted). All paths, commands, gates, gotchas and the auto-generated Next.js block kept. |
| `.opencode/agent/reviewer.md` | Reviewer now starts with `git diff --stat origin/main`, then reads one path at a time instead of dumping a full large diff. |
| `docs/architecture.md` | One clause added so a fact only `AGENTS.md` had is not lost: `getHomeData()` still combines the primary and deferred feeds with `Promise.all`. |
| `docs/README.md` | Index rows for the two new reference files. |

Nothing was removed from the repo: the `AGENTS.md` architecture narrative already existed, in more
detail, in `docs/architecture.md` (sections 1–11) — verified claim by claim before trimming. The only
facts that had no home were moved (`CI/CD`, Dependabot) or added to `docs/architecture.md` (1 clause).

## 3. Results after the change

| Metric | Before | After | Δ |
| --- | --- | --- | --- |
| `AGENTS.md` tokens | 4 489 | 3 079 | −1 410 (−31.4 %) |
| Startup context tokens (`AGENTS.md` + `CLAUDE.md`) | 4 657 | 3 247 | −1 410 (−30.3 %) |
| `AGENTS.md` lines / bytes | 198 / 18 373 | 111 / 12 781 | −44 % / −30 % |
| End-to-end prompt tokens (baseline copy → working tree) | 13 844 | 12 447 | −1 397 (−10.1 %) |
| Reviewer instructions | 522 | 567 | +45 (new instructions, paid once per review) |
| New docs (not loaded at startup) | — | 1 675 + 638 | 0 at startup |

The prompt delta (−1 397) matches the file delta (−1 410): the trimming lands one-for-one on the
first request of every step.

Cache effect, to be confirmed by the next `opencode.yml` run after merge: the log should show
`Cache mode: write`, no `pnpm cache is not found`, and
`Cache saved with the key: node-cache-Linux-x64-pnpm-…` / `opencode-Linux-X64-…`. This cannot be
observed from a local branch: the effective mode is assigned by the trigger at run time.

## 4. Adaptations and differences vs `c80bede7`

1. **`actions: write` is not the operative fix here; `cache-mode: write` is.** The reference commit
   added `actions: write` to both jobs. On stripstream the symptom is identical but the mechanism is
   different: the cache mode is derived from the *trigger*, and both OpenCode triggers are low-trust.
   GitHub's reference states that cache access is enforced with scoped cache tokens driven by
   `cache-mode` (exposed to actions as `ACTIONS_CACHE_MODE`), and that only `cache-mode: write` /
   `write-only` overrides the read-only default. In-repo proof that the job permission is irrelevant:
   `ci.yml` saves caches with `permissions: contents: read` only. So the port declares
   `cache-mode: write` and deliberately does **not** add `actions: write` — that scope would let an
   agent job (which processes visitor-supplied issue/comment text, with the OpenCode API key in the
   environment) cancel or re-run workflows and delete artifacts, for zero caching benefit. This is the
   one intentional divergence from the reference commit; if the literal `permissions:` parity is
   required anyway, add it in a separate commit with that trade-off acknowledged.
2. **`add-job-id-key: false` has no equivalent.** That flag exists in `Swatinem/rust-cache`; stripstream
   uses `actions/setup-node`, whose key is `node-cache-<os>-<arch>-pnpm-<lockfile hash>` — no job id,
   so `issue`, `comment` and `ci.yml` already share the same entry. Documented in
   `.github/workflows/README.md#caches` instead of adding a no-op flag.
3. **No nextest equivalent.** The reference installs nextest in the `comment` job so it can validate like
   the `issue` job. Both stripstream jobs already install the identical toolchain (pnpm, Node 24,
   Playwright Chromium); parity exists by construction, so nothing was added.
4. **Cargo cache → pnpm store + OpenCode CLI cache.** The Rust cache has no direct analogue; these are
   the two caches the workflow really misses. The Next.js build cache (`.next/cache`) was evaluated and
   rejected: `pnpm build` is 30–40 s on the runner and PR caches are scoped to the merge ref, so a
   restored cache would rarely hit. Recorded as a follow-up rather than implemented.
5. **Context trim by relocation, not deletion.** `AGENTS.md` grew organically and duplicated
   `docs/architecture.md` in the same words. The port keeps the invariants needed while writing code
   and moves the rest: CI/CD and deploy internals → `.github/workflows/README.md`, Dependabot policy →
   `.github/dependabot-policy.md` (mirroring the reference layout). The architecture narrative stays in
   `docs/architecture.md`, which already carried it with more depth.
6. **`CLAUDE.md` needed nothing.** It is already a 14-line pointer to `AGENTS.md` (168 tokens). The
   reference's `CLAUDE.md` compaction targeted the `rtk` dump, which this repo does not have.
7. **Reviewer:** same change as the reference (`--stat` first, then per-path diffs).

Note on the remaining gap: unlike the Rust repo, stripstream's setup cost is dominated by
`playwright install --with-deps chromium` (23 s), which `setup-node`'s cache does not cover. Caching
`~/.cache/ms-playwright` keyed on the `@playwright/test` version would save it, but Playwright's own
guidance is that caching browsers on hosted runners is usually not faster than downloading them; left
as a follow-up with the measurement here.

## 5. Verification

- **YAML:** all six YAML files under `.github/` parse (`python yaml.safe_load`), including
  `dependabot.yml` after the header rewrite.
- **Quality gates (working tree, before/after the docs edits):** `pnpm lint` clean (0 warnings),
  `pnpm typecheck` clean, `pnpm test:unit` → 25 files / 223 tests passed.
- **Not run:** `pnpm build` / Playwright E2E — no application code, dependency or config besides CI
  docs changed; the CI gate itself is unchanged.
- **Not verifiable locally:** the effective cache mode and cache saves (trigger-derived, only visible in
  a real run after merge).

## 6. Follow-ups (not done here)

1. Confirm the next `opencode.yml` run logs `Cache mode: write` and both cache saves.
2. The OpenCode action resolves CLI `1.19.3` in CI while the local CLI is `2.0.20` (`@latest` action
   ref). Pinning the action and tracking the CLI version would avoid surprises (and make the CLI cache
   key stable in practice).
3. `opencode.json` enables the `chrome-devtools` MCP server and this repo ships large skills under
   `.agents/skills/`: their tool/skill descriptions are part of every step's prompt. Worth measuring
   per-workflow (the `comment` job rarely needs the design skills) before any further trim.
4. Playwright browser cache (23 s/run) if the runner network degrades.
5. `pnpm build` runs in `ci.yml` and `test:e2e` builds `.next-e2e` separately; a shared build cache or a
   single build would only matter if PR latency becomes a concern.
