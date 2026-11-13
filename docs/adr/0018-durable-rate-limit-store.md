---
status: accepted
date: 2026-11-13
---

# Rate-limit counters live in a shared store behind one seam

`checkRateLimit` kept its buckets in a module-level `Map` and answered synchronously. That made the counters invisible to a second process, lost on every redeploy, and impossible to observe after an incident — while the action runner, the login/register flow and the connection-test probe all relied on it. The limiter is now a small module (`src/lib/rate-limit/`) with three parts: the pure fixed-window arithmetic (`fixed-window.ts`: `advanceWindow`, `toRateLimitResult`), a store contract (`store.ts`: `hit(key, now, windowMs)` — atomic per key, counts, never decides), and two stores. The default one persists to the SQLite `rate_limit_buckets` table (`prisma-store.ts`) in a single atomic upsert with `RETURNING`; the in-memory store stays as the reference implementation, the test double and the runtime fallback. `checkRateLimit` is therefore asynchronous: callers await it. The decision rule is unchanged (`count <= limit`) and every call is counted, including refused ones, so a window is the only input the decision needs and the SQL and the pure helper cannot drift apart.

## Considered options

- Keep the in-memory store and only document the limitation: rejected because the limitation was the last structural one flagged in the architecture notes, and a restart silently reset every brute-force window.
- Add Redis: rejected because the deployment is a single self-hosted instance whose only shared store is the SQLite database already on the critical path; a second piece of infrastructure for a counter would cost more than it buys.
- Read then write inside a Prisma interactive transaction: rejected in favour of one `INSERT … ON CONFLICT … RETURNING` statement, which is atomic without a transaction round-trip and keeps the hot path to one query.
- Store the pre-computed `remaining`/`resetMs`: rejected; they are derived values, and persisting them would freeze the policy into the rows.

## Consequences

- The window survives a redeploy and is shared by every process pointed at the same database; a horizontally scaled deployment keeps one budget per key.
- `checkRateLimit` is async — `runAction`, `AuthServerService.registerUser`/`loginUser` and `checkConnectionTestRateLimit` await it. The store failure path logs and falls back to the local memory limiter, so an unavailable table never turns into a free-for-all.
- Every login, registration and connection test pays one SQLite write; better-sqlite3 serialises it and the payload is a single small row, so the cost is far below the bcrypt check it protects.
- Refused attempts keep incrementing the counter until the window ends: the row grows beyond the quota instead of capping, which is what makes the SQL and `advanceWindow` identical. The window start never moves on a refused call, so the quota still resets on schedule.
- Maintenance is built in: the memory store sweeps stale keys above 1000 entries, the SQLite store deletes rows older than an hour at most once an hour, and `RATE_LIMIT_STORE=memory` (or `NODE_ENV=test`) keeps unit tests and local runs off the database.
- The counters are inspectable (`SELECT * FROM rate_limit_buckets`), which the previous `Map` never allowed.

Refs: #167.
