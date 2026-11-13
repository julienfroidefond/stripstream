---
status: accepted
date: 2026-11-12
---

# Favorites have one store seam and side-effect-free reads

The Komga adapter threw on 404 while `getSeriesById` promised `NormalizedSeries | null`; `listFavorites` swallowed every error and pruned rows, so a timeout could delete a favorite. `FavoriteService` now resolves one internal `FavoriteStore` with two adapters: the backend `favorites` capability when declared, or the Komga SQLite store scoped by `(userId, configId)`. Reads degrade to `false`/`[]`, writes fail explicitly, and only a confirmed `null` (series absent) prunes a row, in one `deleteMany`. The SQLite id list is not cached.

## Considered options

- Keep `if (provider === "stripstream")` branches: rejected because the two behaviours diverged.
- Prune on any failed hydration: rejected because a transient failure is not an absence.

## Consequences

- `getSeriesById` must return `null` for confirmed absence and throw otherwise.
- No provider may swallow all its errors.
- Favorites never leak across configs.

## Amendment — a failing store is not an empty one

"Reads degrade to `false`/`[]`" swallowed every error: with the backend down, the home favorites row rendered "loaded but empty" instead of `failed`, and the series page showed an unlit star for a favorite series. Reads now return `false`/`[]` only when no store applies (no usable connection). A failing store propagates its error and the caller's policy decides: the home registry settles the row as `failed` (ADR 0026, `onFailure: "empty"`, `countsTowardOutage: false`), and the series page ends in its surface error terminal — the simplest honest state, since the series header has no "unknown" favorite state and, on Stripstream and Komga alike, a failing favorites store means the same backend or SQLite is failing. Per-series hydration failures inside the Komga list still keep the row and skip the item.

Writes are idempotent: the Komga store inserts and treats a unique-constraint violation (`P2002`, a double click) as success instead of `findFirst` + `create`, and removing an absent favorite deletes zero rows. The Librarian's `PUT`/`DELETE /series/{id}/favorite` are already idempotent.

Refs: #127.
