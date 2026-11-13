---
status: accepted
date: 2026-11-12
---

# Client interaction policies are pure modules with thin adapters

Reader progress, page moves, preferences writes, wall phases/filters/camera, series mutations, refresh cycles and paginated-grid state were buried in effects and component state, where they were hard to test and easy to duplicate. The refactor extracted each policy into a pure class or function, with injected scheduler, persistence, storage and predicates; hooks and contexts now only adapt React state, server actions, timers and the router. The same "one owner per rule" applies on the server (`feed-registry`, `loadSurface`, `action-runner`).

## Considered options

- Keep logic in hooks and test through the DOM: rejected because it is slow, timing-dependent and duplicates behaviour.
- Move the policy into one shared hook: rejected because the timing and rollback rules would still be coupled to React and hard to test without a DOM.

## Consequences

- A new cross-surface interaction gets a pure policy module plus a thin adapter.
- Adapters must not reimplement debounce, optimism or rollback.
- Pure modules stay environment-free and unit-tested.

Refs: #130, #136, #139, #143, #144, #146, #149, #151, #152, #153, #155.
