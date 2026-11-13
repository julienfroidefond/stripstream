---
status: accepted
date: 2026-11-12
---

# One connection module owns provider selection

Config loading, decryption and fallback were spread across a config DB service, a Stripstream resolver and the provider factory. `src/lib/connections` is now the only seam: `resolveActiveConnection` reads the per-browser cookie, validates the config against the user's rows and falls back to the first config (then `STRIPSTREAM_URL`/`STRIPSTREAM_TOKEN` for Stripstream). `getStoredConnection` deliberately does not fall back, so "test this config" tests that config. Credentials are decrypted only in `resolve.ts`; the provider factory consumes the resolved connection.

## Considered options

- Keep `User.activeProvider*` as the selection source: rejected because it is global per user, not per browser, and multi-config made it ambiguous.
- Decrypt credentials in each caller: rejected because it would spread the encryption boundary.

## Consequences

- App code never constructs a provider directly and never reads the legacy columns.
- A new provider extends `resolve`, `manage` and `probe`.
- Connection tests share one budget and one factory path.

Refs: #135.

## Amendment (2026-11-13)

The environment fallback is removed (ADR [0032](./0032-closed-by-default-auth-and-per-user-connections.md)): `resolveActiveConnection` falls back to the user's first config of the provider, then to `null`. `STRIPSTREAM_URL` / `STRIPSTREAM_TOKEN` are no longer read, so a user without a connection never borrows the instance's Librarian token.
