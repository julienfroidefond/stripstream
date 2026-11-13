---
status: accepted
date: 2026-11-12
---

# Pages resolve through one surface gateway

Each data-backed page repeated provider, preferences, anonymous, redirect and error decisions, so empty, unavailable and failed pages diverged. `loadSurface` (`src/lib/surfaces/load-surface.ts`) now resolves the provider and preferences once, checks an optional `requireCapability`, and returns one of four terminals: `ready`, `anonymous-empty`, `unavailable` or `error`. `SurfaceBoundary` renders the terminal; a page supplies only its `ready` renderer and the overrides it actually needs. The pure state machine is `loadSurfaceWithDependencies`.

## Considered options

- Keep page-local try/catch: rejected because "no provider" had four different behaviours.
- Make the gateway throw: rejected because the four states are normal user-visible outcomes, not errors.

## Consequences

- A new page goes through the gateway and does not fetch the provider in its own body.
- Capability-gated pages return `unsupported-capability` without a provider call.
- Next control-flow errors are rethrown before mapping.

Refs: #140, #150.
