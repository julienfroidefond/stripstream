---
status: accepted
date: 2026-11-12
---

# Optional provider features are declared, not inferred

`IMediaProvider` is split into `MediaProviderCore` and `ProviderCapabilities`. Each capability is either its contract or `null`; `createProviderCapabilities()` starts all-null, and callers gate pages, actions and routes on the declaration. `null` is an explicit absence, never an empty result and never inferred from the connection type. Favorites uses the same declaration: a provider that declares the capability delegates to it, while Komga declares `null` and falls back to the app-local SQLite store.

## Considered options

- Keep optional methods on one interface with Komga stubs: rejected because a stub made an unsupported feature look supported.
- Infer support from `providerType`: rejected because it adds a second source of truth and makes every provider addition a caller change.

## Consequences

- Adding a capability touches the interface, both providers and the surfaces that use it.
- An unsupported feature gets a dedicated error code or a hidden surface.
- Normalized models (for example reading lists) cross the seam, so client components never import a provider adapter.

Refs: #145, #154.
