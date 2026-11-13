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

Refs: #127.
