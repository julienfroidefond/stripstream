---
status: accepted
date: 2026-11-13
---

# Preferences are described once and derived everywhere

`preferences.service.ts` enumerated the thirteen `UserPreferences` fields three times — in the read, in the `update` branch and in the `create` branch of the upsert — while the defaults lived in `types/preferences.ts` and the JSON normalizers (`normalizeDisplayMode`, background merge) were applied ad hoc. Adding a preference therefore meant touching three places, and forgetting one failed silently: the column was stored but never read back, or the field was read but never written on first save. Every preference now has one entry in `src/lib/preferences/descriptor.ts` (column, default value, read normalizer, write normalizer), and the service derives `getPreferences`, the partial `update` and the `create` row from that table. The table is typed as a mapped type over `keyof UserPreferences`, so a preference added to the interface without a descriptor fails `pnpm typecheck`; a patch only writes the columns whose key is present, so a partial update still never rewrites what it does not target.

## Considered options

- Code generation from the Prisma schema: rejected because the read/write normalizers (JSON merges, page-size clamping) are application policy, not schema metadata.
- Keep the service as the single source and export per-field helpers: rejected because the three enumerations are exactly the coupling being removed; the descriptor has to be the only table.

## Consequences

- Adding a preference is one entry plus the interface field; the compiler refuses a partial addition.
- The descriptor owns normalization, so the service no longer imports `normalizeDisplayMode` or the background defaults.
- `UserPreferences`, `defaultPreferences` and the Prisma schema are unchanged; the API and the observable behaviour are identical.
- The client-side `PreferencesWriter` keeps its own optimistic merge policy; the descriptor is server-side only.

Refs: #162.
