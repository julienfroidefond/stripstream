---
status: accepted
date: 2026-11-12
---

# Server actions run through one runner and return `ActionResult`

Server actions duplicated session and rate-limit gates, provider resolution, logging, error mapping and invalidation. `runAction` and `runProviderAction` (`src/lib/actions/action-runner.ts`) now own that lifecycle and return a discriminated `ActionResult`: success carries `success: true`, `code: "OK"` and a message; failure carries `success: false`, a stable `ErrorCode` and optional partial data. `ActionError` models expected business failures; the invalidation callback runs once, only after success.

## Considered options

- Keep throwing `AppError` to the client: rejected because every caller had to map it and partial mutations had no shape.
- Return `{ error }` ad hoc: rejected because there was no shared contract.

## Consequences

- A new action declares its gates and fallback code instead of reimplementing them.
- Credential-touching actions stay behind `requireUser` plus `rateLimit`.
- `getScanStatus` stays outside the runner because it degrades to `unavailable` instead of failing.

Refs: #140.
