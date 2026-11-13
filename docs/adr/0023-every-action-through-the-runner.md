---
status: accepted
date: 2026-11-13
---

# Every server action runs through the runner, admin authorization included

ADR [0006](./0006-server-action-runner.md) introduced `runAction`, but `admin.ts`, `auth.ts` and `password.ts` kept hand-written `try/catch` blocks returning `{ success, message }` with hard-coded French and no `ErrorCode`. Two consequences were security-relevant: `changePassword` compared the current password with bcrypt on every call with no rate limit — an oracle for brute-forcing a session's password — and `requireAdmin` threw a plain `Error("Forbidden: …")` that `AdminService` recognised with `error.message.includes("Forbidden")` five times, while an unauthenticated stats call was relabelled `ADMIN_FETCH_STATS_ERROR`. The runner now owns the admin gate too: `requireRole: "admin"` calls `requireAdmin()` (which throws `AppError` `AUTH_UNAUTHENTICATED` / `AUTH_FORBIDDEN`), puts the admin's numeric id in `context.userId`, and runs before the rate limit, the guard and the mutation. The three files are migrated: every action returns `ActionResult` with a stable code, `changePassword` (5 / 15 min per user) and `resetUserPassword` (10 / 15 min per admin) go through the runner's `rateLimit` gate, password strength and role validation are `guard`s throwing `ActionError`, and `AdminService` no longer authorizes — it receives the acting admin id where it must protect the admin from himself (self-delete, self-reset).

## Considered options

- Keep `requireAdmin` inside `AdminService` and only make it throw `AppError`: rejected. Authorization would still be checked twice for the page and buried in each method's `try/catch`, and the service would keep resolving the session itself.
- A generic `requireRole: string[]`: rejected for now. There is one privileged role; a closed `"admin"` literal keeps the gate exhaustively typed and can widen when a second role exists.
- Move registration behind the runner's `rateLimit`: rejected. Registration is anonymous and the runner keys budgets on a session id; `AuthServerService.registerUser` keeps its per-email budget and the action only gains the runner's error mapping.

## Consequences

- No server action under `src/app/actions/` hand-rolls error mapping any more; `getScanStatus` stays the documented exception (ADR 0006).
- Client components read `result.code` and translate `errors.${code}`; success copy lives under `admin.*` / `account.*` in both locales. The action's `message` stays a technical/log string.
- `ADMIN_INVALID_ROLES` joins the catalog (code, technical message, both locales, per ADR [0014](./0014-error-catalog-completeness.md)); `updateUserRoles` refuses an empty list or a role outside `ROLE_USER` / `ROLE_ADMIN` server-side, not only in the dialog.
- `AdminService` methods are unauthenticated primitives: any new caller must gate (the admin page uses `isAdmin()` and redirects outside its `try`, so `redirect()` is no longer swallowed and logged as an error). A data failure on the admin or account page now renders an `ErrorMessage` with its code instead of redirecting — the account page only sends to `/login` when there is no session.
- Rate-limit buckets for the new keys (`change-password:<id>`, `admin-reset-password:<id>`) live in the shared store of ADR [0018](./0018-durable-rate-limit-store.md); every attempt counts, including refused and weak-password ones.
- Out of scope: services still resolve the current user themselves (`UserService`, `FavoriteService`, `PreferencesService`); handing them the identity is a separate change.
