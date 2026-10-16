# Documentation

This index is the entry point to the Stripstream documentation set. Start here, then follow the link that matches who you are and what you need.

## Documents

| Document | Audience | Purpose |
| --- | --- | --- |
| [`README.md`](../README.md) | Humans new to the project | Project overview, features, install and run instructions, and screenshots. |
| [`AGENTS.md`](../AGENTS.md) | Agents and maintainers | Canonical agent and repository guide: architecture, data flow, conventions, commands, and quality gates. |
| [`CLAUDE.md`](../CLAUDE.md) | Claude Code users | Short pointer that defers to `AGENTS.md` so guidance never drifts. |
| [`ENV.md`](../ENV.md) | Operators and developers | Environment variables, grouped by required, optional app flags, and compose-only keys. |
| [`architecture.md`](./architecture.md) | Developers and reviewers | Consolidated system reference: provider abstraction, caching, errors, reader, and known limitations. |
| [`ecosystem.md`](./ecosystem.md) | Developers and maintainers | The two-repo layout: this reader plus the Stripstream Librarian backend, the sibling-clone convention, and the read-scoped Client API contract. |
| [`api.md`](./api.md) | Developers integrating with the app | Current API surface: route handlers and the server actions that replaced the old REST routes. |
| [`komga-api-summary.md`](./komga-api-summary.md) | Developers working on the Komga provider | Summary of the upstream Komga API endpoints the app relies on. |
| [`../tests/README.md`](../tests/README.md) | Developers running or writing tests | Playwright E2E setup, commands, and conventions. |
| [`../.env.example`](../.env.example) | Operators and developers | Config template. Copy it to `.env` and fill in real values. |

## How to use this doc set

- New to the project: read [`README.md`](../README.md), then [`ENV.md`](../ENV.md) to get it running.
- Working as an agent or maintainer: treat [`AGENTS.md`](../AGENTS.md) as the single source of truth and follow it before touching code.
- Need system detail: read [`architecture.md`](./architecture.md) for how the pieces fit, and [`api.md`](./api.md) for the request surface.
- Working across the two repos (this reader and the Librarian backend): read [`ecosystem.md`](./ecosystem.md).
- Setting up or debugging the environment: pair [`ENV.md`](../ENV.md) with the [`../.env.example`](../.env.example) template.
- Adding or running tests: follow [`../tests/README.md`](../tests/README.md).
