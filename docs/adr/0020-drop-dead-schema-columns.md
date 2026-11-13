---
status: accepted
date: 2026-11-13
---

# Dead schema columns are dropped, not documented

Two schema relics had outlived their code: `users.activeProvider` / `activeKomgaConfigId` / `activeStripstreamConfigId`, replaced by the per-browser `stripstream-active-provider*` cookies when multi-config shipped (ADR [0004](./0004-one-connection-module.md)), and `preferences.readerFitMode`, left behind when the reader started always fitting the page. Both were kept "for safety" and explained by a legacy note in `docs/architecture.md` and `AGENTS.md`. That note had become the only reason to read the columns: new code could still take `activeProvider` for the live selection source, and every schema reader had to learn a field that no release could act on.

The columns are now dropped by a hand-written SQLite rebuild migration (`20261113110000_drop_legacy_provider_columns`): `preferences` is copied without `readerFitMode`, `users` without the three provider columns, both unique indexes are recreated, foreign keys stay disabled during the swap and `PRAGMA foreign_key_check` runs before re-enabling them. There is no backfill: the cookies are already the only selection source, and the reader ignored the fit value.

## Considered options

- Keep the columns and the legacy note: rejected. The note was the cost, not the mitigation — it told every reader about a field whose only remaining property was that nothing wrote it.
- `ALTER TABLE … DROP COLUMN`: rejected. The repository's SQLite policy is the rebuild pattern (see AGENTS.md and the `20260429000000_multi_config` / `20260505000000_dedupe_favorites` migrations), which keeps foreign keys, defaults and indexes explicit and does not depend on the SQLite build's column-drop support.
- Backfill the cookie from `activeProvider` on the next request: rejected. A server-side value must not override the browser's per-config choice — that is precisely what the multi-config change removed.

## Consequences

- The change is forward-only: the old values are gone after `prisma migrate deploy`. They were unreadable by the running code, so no rollback path needs them; restoring them would require a backup, not a down migration.
- Schema, generated client, fixtures and docs now agree. Reading a dropped field fails `pnpm typecheck` instead of silently reaching a dead column.
- The migration was verified on a seeded database: one user, one preference row, one config of each type, one favorite and a rate-limit bucket all survived with `PRAGMA foreign_key_check` clean, and `prisma migrate diff` reports no drift against `schema.prisma`.
- `preferences` is rebuilt before `users` (child before parent), so the parent swap never leaves a foreign key pointing at a table name that does not exist when the rebuild finishes.
- The multi-config story now has one source of truth (the cookie resolver). ADR 0004 stays as the historical record of why the columns existed; this ADR records why they no longer do.

Refs: #170.
