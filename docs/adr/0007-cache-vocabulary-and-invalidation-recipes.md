---
status: accepted
date: 2026-11-12
---

# Cache tags are a vocabulary, invalidation is a recipe

Tag strings and invalidation lists were copied into actions and providers, which produced dead tags and over-invalidation. `cacheTags` (`src/lib/cache/tags.ts`) now builds every per-id tag, and `src/lib/cache/invalidation.ts` owns one recipe per kind of change ("what changed → which tags and paths"). Mutations call a recipe; they do not assemble tag lists. Prefer the per-id tag over the global scope, and use `updateTag` (the codebase has no `revalidateTag` call site).

## Considered options

- Keep `revalidateTag` with global tags: rejected because it invalidates whole scopes and Next 16 read-your-writes needs `updateTag`.
- Let each action own its list: rejected because the lists drifted and invalidated tags with no producer.

## Consequences

- A new mutation adds or reuses a recipe.
- A tag without a producing read is dead weight.
- The invalidation module is server-only; connection changes invalidate broadly on purpose.

Refs: #128.
