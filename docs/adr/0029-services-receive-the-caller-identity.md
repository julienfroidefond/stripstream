---
status: accepted
date: 2026-11-13
---

# Services receive the caller's identity instead of reading the session

`UserService`, `PreferencesService` and `FavoriteService` each opened with the same three lines — `getCurrentUser()`, `if (!user) throw UNAUTHENTICATED`, `parseInt(user.id, 10)` — and `requireConnectionForProvider` repeated them a fourth way. The real authentication gate was therefore inside every service: the runner's `requireUser` and the page gateway were decorative (`addToFavorites` did not even declare `requireUser`, `FavoriteService` refused the anonymous call for it), the services could only be unit-tested by mocking the session module, and `FavoriteService.resolveStore` called `getProvider()` again although the series and in-progress pages already held the provider in `context.provider`. Services now take the identity as an argument: `UserService` and `PreferencesService` take `userId: number`, and `FavoriteService` takes a `FavoriteContext { userId: number; provider: IMediaProvider | null }`. The session is resolved by the entry points only. The runner types it: with `requireUser`, `requireRole` or `rateLimit`, `execute` receives an `AuthenticatedActionContext` whose `userId` is a `number`, so no `userId as number` is needed. The page gateway puts `userId` in `SurfaceContext`, because a `ready` surface always has a session.

## Where the session is still read, and why

- `src/lib/actions/action-runner.ts`: the `requireUser` / `requireRole` / `rateLimit` gates, and `skipAnonymous`, which needs the user's preference even when the action declared no gate (same `AUTH_UNAUTHENTICATED` failure as before).
- `src/lib/surfaces/load-surface.ts`: the page gateway (`getCurrentUserId`); no session ends in the same terminal as "no provider", without reading preferences.
- `src/lib/providers/provider.factory.ts` (`getProvider`): it builds the provider of the current request.
- Entry points outside the runner and the gateway: `src/app/layout.tsx` (scope, admin flag, preferences), `src/app/account/page.tsx`, `src/app/admin/page.tsx`, the sidebar server components, the media route core and the `config` list actions.
- The home feed registry receives the viewer: `HomeFeedContext` carries `userId` (from the surface gateway on first render, from the runner's `requireUser` on "see more"), and every feed loader gets `(provider, viewer, limit)`, so the favorites feed calls `FavoriteService.listFavorites({ userId, provider })` without reading the session.

## Considered options

- Keep the services self-authenticating and make the runner gate redundant on purpose ("defence in depth"): rejected. Two gates that must agree drift — `addToFavorites` already relied on the inner one only — and the services stayed untestable without a session mock.
- A request-scoped "current user" injected through `AsyncLocalStorage`: rejected. It hides the dependency exactly like `getCurrentUser()` does; an explicit parameter is visible in the signature and trivially faked in tests.
- Pass the whole `UserData` (id, email, roles): rejected. The services only need the numeric id; roles are an authorization concern that stays in the runner (ADR [0023](./0023-every-action-through-the-runner.md)).
- Let `FavoriteService` keep resolving the provider when none is passed: rejected. A silent fallback would let a caller forget the provider and pay a second resolution; `provider: null` is an explicit "no usable connection" that keeps the ADR [0008](./0008-favorites-store-seam.md) degradation.

## Consequences

- A service under `src/lib/services/` must not call the session helpers of `@/lib/auth-utils` (`getCurrentUser`, `getCurrentUserId`, `requireUserId`, `requireAdmin`; importing the `ADMIN_ROLE` constant is fine); a new caller passes the identity it already resolved. The services are tested with an injected `userId` (`user.service.test.ts`, `preferences.service.test.ts`, `favorite.service.test.ts`) and no session mock.
- `PreferencesService.getPreferences(userId)` stays wrapped in React `cache()`, now memoised per request **and** per `userId`. Paths without a session (public layout, anonymous gateway terminal) no longer call it and use `defaultPreferences`, which is what the old `UNAUTHENTICATED` + `.catch(() => null)` produced.
- `addToFavorites`, `removeFromFavorites` and `updatePreferences` now declare `requireUser: true`; the unauthenticated outcome is unchanged (`AUTH_UNAUTHENTICATED`). The favorites actions stay on `runAction` and pass `getProvider()` explicitly, so a missing connection still fails with `FAVORITE_ADD_ERROR` / `FAVORITE_DELETE_ERROR`, not `PROVIDER_NOT_CONFIGURED`. Favorites by config (ADR 0008) are unchanged: the Komga store is still scoped to the active `(userId, configId)`.
- `FavoriteService` reads `getActiveConnection(userId)` only for the Komga fallback, no longer when the provider declares backend favorites.
- `runAction` / `runProviderAction` gained a typed overload for gated actions. The implementation is unchanged; the overload only expresses to the compiler what the gates already guarantee at runtime.
- The media path follows the same rule (amendment below): the route core resolves `getCurrentUserId()` once and hands `userId` to the transport in `MediaTransportContext`; `requireConnectionForProvider(provider, userId)` and the Komga cover preference read it from there.

## Amendment — media transports

The first version left two session reads below the media route: `requireConnectionForProvider` called `requireUserId()` and the Komga transport called it again for the cover preference, so one image request resolved the session up to three times and the transports could not be tested without mocking `@/lib/auth-utils`. The media route core is the entry point: `MediaRouteDependencies.getCurrentUserId` answers once (401 when `null`), `MediaTransportContext` carries `userId`, and `requireConnectionForProvider(provider, userId)` takes it explicitly. Nothing under `src/lib/media` or `src/lib/connections` reads the session any more.
