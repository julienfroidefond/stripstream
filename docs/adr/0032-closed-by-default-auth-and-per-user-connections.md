---
status: accepted
date: 2026-11-13
---

# Accounts are closed by default, connections are per user, sessions are revalidated

A security audit found that a fresh instance trusted far more than its owner decided. `scripts/init-db.ts` created the admin with a password published in `ENV.md` (`Admin@2025`) whenever `ADMIN_DEFAULT_PASSWORD` was empty, and re-granted `ROLE_ADMIN` to that account on every boot, so a demotion done in the admin screen did not survive a restart. Sign-up was open to anyone who could reach `/login`. A user without a Stripstream connection silently fell back to `STRIPSTREAM_URL` / `STRIPSTREAM_TOKEN` (`environmentConnection` in the registry, ADR [0030](./0030-provider-registry-for-connections.md)), and the media routes used that fallback too: any account, including one just self-registered, read the Librarian with the instance owner's token. Finally, roles were frozen in the JWT for its 30-day life: a deleted, demoted or password-reset user kept their session and their rights.

The defaults now follow the owner's explicit decisions:

- **Admin bootstrap.** `planAdminBootstrap` (`src/lib/admin-bootstrap.ts`, pure and unit-tested) creates the admin only when the account is missing **and** `ADMIN_DEFAULT_PASSWORD` holds at least 8 characters; an existing account is never modified. Without a password the script exits with code 3, which `docker-entrypoint.sh` tolerates so a restart policy does not loop; every other failure still stops the boot. `reset-admin-password` has no default password either.
- **Registration.** `REGISTRATION_ENABLED` must be `true` to open sign-up (`isRegistrationEnabled`, `src/lib/registration.ts`). Closed, `registerUser` fails with `AUTH_REGISTRATION_DISABLED` in the runner guard, before any write, and the login page shows the sign-in form only. This is a behaviour change: an instance upgraded without the variable stops accepting sign-ups.
- **No environment connection.** `ProviderDefinition.environmentConnection` is removed; `resolveForProvider` returns the requested config, the user's first config of that provider, or `null`. `STRIPSTREAM_URL` / `STRIPSTREAM_TOKEN` are no longer read. The media routes keep resolving the provider asked for in the URL, through `requireConnectionForProvider(provider, userId)` with the session's `userId` (ADR [0029](./0029-services-receive-the-caller-identity.md)), so they can only ever reach a row owned by the caller.
- **Revalidated sessions.** `users.sessionVersion` (additive migration `20261113120000_user_session_version`, default `0`) is copied into the JWT at sign-in and bumped by every password change or reset (`UserService.changePassword`, `AdminService.resetUserPassword`, `scripts/reset-admin-password.ts`). The `jwt` callback re-reads the user on every `auth()` through `revalidateSessionToken` (`src/lib/session-token.ts`): a missing user or a different version closes the session, and roles come from the row, so `requireAdmin` and the runner's `requireRole` see a demotion on the next request. Tokens issued before the column count as version `0` and stay valid. Changing one's own password closes the current session too; the form signs the user out.

## Considered options

- Keep a default admin password and print a warning: rejected. A known password on an internet-facing instance is the vulnerability, the warning only documents it.
- Fail the boot (non-zero exit) without `ADMIN_DEFAULT_PASSWORD`: rejected for the restart case. `set -e` in the entrypoint plus `restart: unless-stopped` would loop forever, including on instances whose admin was created long ago — which is why an existing admin short-circuits before the password is even looked at.
- Keep the environment fallback but restrict it to admins: rejected. The fallback exists for a single-user setup that saving one connection in the settings covers, and any shared token makes every account a reader of the owner's Librarian.
- Revalidate the session on an interval (every N minutes) instead of every read: rejected. The lookup is one primary-key read on a local SQLite file, cheaper than the page it guards; an interval would reopen the window the change closes.
- Compare a `passwordChangedAt` timestamp with the token's issue time: rejected. Auth.js re-signs the token on each session read, so `iat` moves; a monotonic version needs no clock and makes "this token predates the reset" exact.

## Consequences

- New variables: `REGISTRATION_ENABLED` (closed unless `true`); `ADMIN_DEFAULT_PASSWORD` loses its default and is a runtime variable only (`docker-compose.yml` no longer passes it as a build arg). `docker-compose.yml` now requires `CREDENTIALS_ENCRYPTION_KEY`. `STRIPSTREAM_URL` / `STRIPSTREAM_TOKEN` are gone from `ENV.md`, `.env.example` and the type declarations.
- An instance that relied on the environment fallback must save a Stripstream connection per user in the settings; until then those users get `STRIPSTREAM_MISSING_CONFIG` on media routes and the "no provider" state on pages.
- The E2E server sets `REGISTRATION_ENABLED=true` (`playwright.config.ts`) because the suite exercises the sign-up form and its throttling.
- Every authenticated request costs one extra indexed read of `users`; a database outage now signs users out instead of serving them with stale rights.
- The admin cannot remove their own `ROLE_ADMIN` (`ADMIN_CANNOT_REMOVE_OWN_ADMIN`) nor demote the last admin (`ADMIN_LAST_ADMIN`), so revalidated roles can never lock the instance out of its admin screen.
