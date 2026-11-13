---
status: accepted
date: 2026-11-13
---

# The error catalog is total and typed

`ERROR_MESSAGES` was typed `Record<string, string>`, so 15 of 90 codes had no technical message and nothing flagged it. Several of those codes were actually thrown (`AUTH.FORBIDDEN`, `ADMIN.CANNOT_DELETE_SELF`, `WALL.FETCH_ERROR`, `PROVIDER.CAPABILITY_NOT_SUPPORTED`): `AppError` produced an empty `message`, and threw a `TypeError` as soon as it carried params. The catalog is now `Record<ErrorCode, string>`, so a code added without a message fails `pnpm typecheck`; `getErrorMessage` replaces every `{param}` occurrence, leaves unknown params intact and falls back to the code itself when no message exists at runtime. A test enforces one localized entry per code in both locales, identical en/fr key sets, and no orphan key.

## Considered options

- Derive the technical catalog from the English i18n file: rejected because many technical messages carry details (HTTP status, library id) that the UI copy deliberately omits, and the server cannot know the user's locale.
- Keep the untyped record and rely on review: rejected because incompleteness was only discoverable in production.

## Consequences

- A new code needs three entries — code, technical message, both locale keys — and the type plus the test refuse partial additions.
- Technical messages (logs, action `message`) and UI copy may word the same failure differently, but neither can be missing.
- Interpolation never throws, so a missing message cannot mask the original error.

Refs: #157.
