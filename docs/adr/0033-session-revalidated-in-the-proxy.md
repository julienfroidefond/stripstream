---
status: accepted
date: 2026-11-22
---

# The proxy revalidates the session against the database

ADR [0032](./0032-closed-by-default-auth-and-per-user-connections.md) closed the role freeze in the JWT, but only for reads that go through `auth()`: the `jwt` callback re-reads `users.sessionVersion` and the roles on every server-side session read. The proxy (`src/proxy.ts` → `getAuthSession`, `src/lib/auth/middleware.ts`) sits in front of every protected page, action and API route and only verified the JWT signature. A token belonging to a deleted account, or issued before a password change, still crossed the proxy and was refused later — by the page, the action runner or the media route handler — instead of at the door.

The proxy now runs the same revalidation: `getAuthSession` reads the `users` row through `loadSessionUser` (`src/lib/auth/session-user.ts`, the loader the `jwt` callback also uses) and calls `revalidateSessionToken` (`src/lib/auth/session-token.ts`). A missing account or a different `sessionVersion` returns `null`, so the existing path of `src/proxy.ts` redirects to `/login` and clears the stale cookie; a valid token produces the session from the **revalidated** token, so the roles are the row's, not the ones frozen in the cookie.

If the storage read fails (Prisma/SQLite unavailable), the proxy logs `Auth revalidation unavailable in proxy` and falls back to the signature-only session built from the original token. A storage outage is not an invalid session: signing every user out on a transient error would be worse, and pages, actions and route handlers revalidate through `auth()` anyway. The proxy remains the first line of defence, not the only authorization.

## Considered options

- Keep the database read in `auth()` only: rejected. A token of a deleted account, or one issued before a password reset, keeps reaching the protected surface, with the refusal happening only once the page or the handler runs.
- Cache the lookup for a short TTL in the proxy: rejected. It reopens, for the length of the TTL, the window ADR 0032 closed.
- Write a second, synchronous read in the proxy: rejected. Two implementations of the same lookup would have to stay in phase; one loader is shared by `auth()` and the proxy.

## Consequences

- Every proxied request (pages, actions, API routes and media routes included, which already revalidate in their handler) costs one extra primary-key read of `users` in local SQLite. The row is tiny and the read is indexed; it stays cheaper than the response it guards.
- A SQLite outage no longer signs users out on a transient error: it is logged and the request proceeds with the signature-only session; protected pages then fail normally on their own reads.
- The proxy runtime must keep Node: Prisma cannot run on edge. Next 16's default proxy runtime is Node, so the production build is the check that keeps it that way.
