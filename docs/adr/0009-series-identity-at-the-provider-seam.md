---
status: accepted
date: 2026-11-12
---

# Series identity is resolved at the provider seam

A display title could travel in a `seriesId` field, and the hero, the in-progress page and the services each matched a book to its series differently. `NormalizedBook` now keeps `seriesId` strictly provider-owned (or `null`) and `seriesName` as an explicit fallback. `matchSeries` (`src/lib/resume/identity.ts`) applies one rule: exact id, normalized title, same library, unknown library, first candidate; `resolveBookSeries` is the single network fallback for name-only rows, and `getSeriesById` never receives a name. Stripstream's three series routes live in `src/lib/providers/stripstream/series-identity.ts`: a lookup returns `null` only on a confirmed 404, rethrows every other failure, and leaves the degradation choice to its callers.

## Considered options

- Match by title only: rejected because homonyms in different libraries collide.
- Keep per-surface matching: rejected because three surfaces could disagree on the same book.

## Consequences

- Name-only endpoints must populate `seriesName`.
- An unresolved book keeps `series: null`; each surface decides whether it can render it.
- Stripstream's first-book-id fallback stays for legacy search URLs, now owned by `series-identity.ts`.

Refs: #129, #132, #158.
