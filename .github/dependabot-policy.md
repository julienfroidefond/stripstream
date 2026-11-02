# Dependabot policy

Dependabot replaced the former Renovate setup (`renovate.json`, app Mend). It runs natively on
GitHub and reads `pnpm-lock.yaml` through the `npm` ecosystem. **Do not re-add `renovate.json`
alongside `.github/dependabot.yml`**: you would get duplicate pull requests.

## Update rules

- **Minor/patch** updates are grouped by family in `.github/dependabot.yml` (`radix-ui`, `i18next`,
  `lint-types-tooling`, `playwright`, and a catch-all `minor-and-patch` group) and are auto-merged
  once the required `Quality (lint · typecheck · build)` check passes — see
  `.github/workflows/dependabot-auto-merge.yml`.
- **Major** updates always land as their own pull request and are reviewed by hand.
- **Framework/runtime dependencies** (`next`, `react`, `react-dom`, `@prisma/client`, `prisma`,
  `sharp`) never enter the auto-merged group: they stay individual pull requests even for a patch,
  because they change the runtime image. The list lives in two places that must stay in sync —
  `exclude-patterns` of the `minor-and-patch` group in `.github/dependabot.yml` and the `frameworks`
  list in `.github/workflows/dependabot-auto-merge.yml`. **Add any new framework/runtime dependency
  to both.**
- Watched ecosystems: `npm` (repository root: `package.json` + `pnpm-lock.yaml`), `github-actions`,
  and `docker` (the root `Dockerfile` base image).

## Schedule and limits

Weekly, Monday 04:00 Europe/Paris, with `open-pull-requests-limit: 8` for npm. Commit prefixes are
`chore(deps)` (or `chore(dev-deps)` for development dependencies) and `ci(deps)` for GitHub Actions,
so they match the Conventional Commit types the version bump hook reacts to.

Dependabot alerts and security updates are enabled on the repository: security pull requests are
opened automatically, outside the grouping above.

Dependabot has no dependency dashboard. To refresh a pull request, comment `@dependabot rebase` (or
`recreate`); use "Check for updates" in the Dependabot tab for a manual pass.

## Auto-merge prerequisites

Repository settings, not code:

- "Allow auto-merge" enabled;
- `Quality (lint · typecheck · build)` required on `main` (see
  [`workflows/README.md`](./workflows/README.md#required-status-check)).

`dependabot-auto-merge.yml` uses `pull_request_target` because a `pull_request`-triggered run gets a
read-only `GITHUB_TOKEN` from Dependabot and cannot enable auto-merge. The job never checks out or
runs code from the pull request.

## Known exceptions

### `minimatch` 3.1.5 (dev-only, alert dismissed)

`eslint-config-next` still pulls `eslint-plugin-import`, `eslint-plugin-jsx-a11y` and
`eslint-plugin-react`, which all pin `minimatch@^3.1.2` at their latest release (2.32.0, 6.10.2 and
7.37.5). `minimatch@3` is therefore capped at `>=3.1.4 <4` in `pnpm.overrides`, below the `11.0.1`
patched version of the DoS advisory (globparts amplification).

**Do not widen that override.** minimatch 10+ dropped the callable default export
(`require('minimatch')` returns `{ minimatch, filter, … }`, `__esModule: true`, no `default`), while
the plugins do `_interopRequireDefault(require('minimatch'))` and call `.default(...)`. `pnpm lint`
still passes with the bump because no enabled rule reaches those code paths, but any rule that uses
glob matching (`jsx-a11y/label-has-associated-control`, `jsx-a11y/control-has-associated-label`,
`import/order` path groups) crashes with `_minimatch.default is not a function`.

The alert is dismissed as tolerable risk: the dependency is dev-only (never in the runtime image) and
the patterns come from this repository's ESLint config, not from user input. Dismissing it also stops
the weekly failed `npm_and_yarn` update jobs. Revisit when the three plugins move to minimatch 10+.
