# CI / CD internals

Reference for the GitHub Actions pipelines. `AGENTS.md` links here instead of inlining this page:
it is not needed to write code, only to understand a pipeline run or change one.

This repository is not published as a package: the container image built by `deploy.yml` **is** the
deliverable, and GitHub Actions is the single deployment path (the former Gitea pipeline has been
retired).

## Workflows

| Workflow | Trigger | Role |
|----------|---------|------|
| `ci.yml` | pull requests, `workflow_dispatch` | Quality gate: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build` |
| `deploy.yml` | push to `main`, `workflow_dispatch` | Version detection, Docker image build/push to Docker Hub, then deploy on the self-hosted `mac-mini` runner |
| `dependabot-auto-merge.yml` | `pull_request_target` | Queues a squash auto-merge for Dependabot minor/patch updates once the required check passes |
| `opencode.yml` | `ai` label, `/oc` or `/opencode` mentions, PR review comments | OpenCode agent (two jobs: `issue` and `comment`) |

## Required status check

`ci.yml` runs on **pull requests only**: the merge to `main` is deliberately not re-validated (the
image build inside `deploy.yml` is the post-merge signal). The corollary is that
`Quality (lint · typecheck · build)` MUST stay a required status check on the protected branch of
`main`, otherwise a pull request could be merged without ever being validated. Use the
`workflow_dispatch` trigger to run the gate on demand.

## Images and versioning

A single Dockerfile at the repository root builds the app (Next.js standalone output). `deploy.yml`:

- reads the version from `package.json` and the short SHA, and tags the image
  `latest`, `<version>` and `<version>-<sha>` under `julienfroidefond32/stripstream`;
- pushes from a GitHub-hosted runner with a registry build cache (`buildcache` tag, `mode=max`);
- skips the build for non-runtime commits (`chore|docs|style|test|ci|build`) — the same types the
  version bump ignores — but never skips a `*deps*` commit, which still changes the runtime image;
- then a `deploy` job on the self-hosted `mac-mini` runner pulls `latest` and runs
  `./scripts/stack.sh up stripstream` from the local `docker-stack` checkout
  (`/Users/julienfroidefond/Sites/docker-stack`), and prunes the superseded local images.

The version itself is bumped locally by `.husky/post-commit` from the Conventional Commit type
(`feat:` → minor, `fix:`/`perf:`/`refactor:` → patch, `!`/`BREAKING CHANGE` → major, everything else
→ no bump) and amended into the same commit. Nothing in CI writes `package.json`.

The `deploy` job is guarded on `github.repository == 'julienfroidefond/stripstream'` so a fork can
never reach the self-hosted runner. The workflow has no `pull_request` trigger.

### Deploy runner: keychain gotcha

OrbStack's `docker` CLI on the `mac-mini` ignores `DOCKER_CONFIG` / `--config` and always reads
`credsStore: osxkeychain` from `~/.docker/config.json`, which is unreachable from the runner's
non-interactive launchd session. The `deploy` job prepends a stub `docker-credential-osxkeychain`
(reports "no credentials" on stdout) to `PATH` so the public image pull runs anonymously. Do **not**
set `DOCKER_CONFIG` in the runner environment: it hides the `compose` CLI plugin
(`$DOCKER_CONFIG/cli-plugins`) and breaks `./scripts/stack.sh up`.

## Dependency updates

Dependabot configuration and policy (grouping, auto-merge scope, framework exclusions) live in
`.github/dependabot.yml` and [`../dependabot-policy.md`](../dependabot-policy.md).

## Caches

The workflows rely on two caches:

- the **pnpm store**, cached by `actions/setup-node` (`cache: pnpm`); its key is
  `node-cache-<os>-<arch>-pnpm-<hash of pnpm-lock.yaml>`;
- the **OpenCode CLI**, cached by the `anomalyco/opencode/github` action under
  `opencode-<os>-<arch>-<version>`.

Neither key contains a job or workflow id, so the `issue` and `comment` jobs of `opencode.yml` (and
`ci.yml`) already share the same entries: there is nothing to deduplicate. The scope rules do the
rest — a cache saved on `main` is restorable by pull-request runs, so once `opencode.yml` saves the
pnpm store on `main`, PR runs of `ci.yml` benefit too.

### Why `cache-mode: write` is declared

Since the 2026-06-26 cache change, runs triggered by a *low-trust* event get **read-only** cache
access, whatever `permissions:` says. Trusted triggers are `push`, `workflow_dispatch`,
`repository_dispatch`, `delete`, `registry_package`, `page_build` and `schedule`; `issues`,
`issue_comment` and `pull_request_review_comment` (exactly the triggers of `opencode.yml`) are not.

Observed on run
[39554566577](https://github.com/julienfroidefond/stripstream/actions/runs/39554566577) before the
fix:

```
Cache mode: read
pnpm cache is not found
Cache reservation failed: cache write denied: token has no writable scopes
Cache save skipped: the effective cache-mode 'read' does not permit writes.
```

Both `opencode.yml` jobs therefore declare `cache-mode: write` (opt out of the low-trust default).
`ci.yml` needs nothing: it runs on `pull_request`, which is not affected, and already saves caches
with `permissions: contents: read`.

Do **not** add `actions: write` to fix a cache: cache access is enforced with scoped cache tokens
driven by `cache-mode` (the runner exports the effective mode as `ACTIONS_CACHE_MODE`), not by the
job's `permissions:`. The `ci.yml` run
[39212164174](https://github.com/julienfroidefond/stripstream/actions/runs/39212164174) saved
`node-cache-Linux-x64-pnpm-…` while holding `contents: read` only. `actions: write` would instead
let an agent job cancel or re-run workflows and delete artifacts — broad power for no caching gain.

Trade-off: `opencode.yml` runs an agent over visitor-supplied issue and comment text, so a
compromised run could write a cache entry. The jobs keep `persist-credentials: false` and only
restore their own caches; keep the write grant limited to these jobs, and prefer the
docs-recommended alternative (a trusted `push`/`schedule` workflow warming the cache, low-trust jobs
staying read-only) if this workflow ever starts handling untrusted code.

The **Next.js build cache** (`.next/cache`) is deliberately not persisted: `pnpm build` takes
~30–40 s on the runner, and pull-request caches are scoped to the merge ref, so a restored cache
would rarely hit. Revisit only if the build gets slower.
