/** Namespace shared by every browser-storage key owned by Stripstream. */
export const STORAGE_KEY_PREFIX = "stripstream";

/** Scope used when no user is signed in (login, register, public pages). */
export const ANONYMOUS_STORAGE_SCOPE = "anonymous";

/**
 * Normalize the owner of a browser-storage key.
 *
 * The scope is the id of the signed-in user, resolved on the server and passed
 * down through `UserScopeProvider`. Client code must never guess it: the whole
 * point is that two accounts sharing one browser profile do not read each
 * other's state.
 */
export function normalizeStorageScope(scope: string | null | undefined): string {
  return scope?.trim() || ANONYMOUS_STORAGE_SCOPE;
}

/**
 * Build a `localStorage` key scoped to its owner.
 *
 * `localStorage` is shared by every account using the same browser profile, so
 * user-specific keys must be namespaced (e.g.
 * `stripstream:<userId>:recommendations-view-mode`). An unscoped key leaks one
 * account's UI state into the next account opened on the same device.
 */
export function buildStorageKey(scope: string | null | undefined, key: string): string {
  return `${STORAGE_KEY_PREFIX}:${normalizeStorageScope(scope)}:${key}`;
}
