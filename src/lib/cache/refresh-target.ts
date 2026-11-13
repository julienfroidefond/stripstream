import type { RefreshScope } from "./invalidation";

const REFRESH_SCOPES: readonly RefreshScope[] = ["home", "library", "series", "book"];

/** Budget par utilisateur de `revalidateForRefresh` : une boucle cliente ne vide pas le cache en continu. */
export const REFRESH_RATE_LIMIT = { limit: 30, windowMs: 60_000 } as const;

const MAX_ID_LENGTH = 256;

/** Caractères qui changeraient la forme du chemin revalidé (`/libraries/${id}`). */
const FORBIDDEN_ID_CHARS = new Set(["/", "\\", "?", "#", "%"]);

function isSafeId(id: string): boolean {
  if (id.length === 0 || id.length > MAX_ID_LENGTH || id.trim() !== id) return false;
  for (const char of id) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || FORBIDDEN_ID_CHARS.has(char)) return false;
  }
  return true;
}

export function isRefreshScope(value: unknown): value is RefreshScope {
  return typeof value === "string" && (REFRESH_SCOPES as readonly string[]).includes(value);
}

/**
 * Cible de rafraîchissement venue du client : un scope connu et un
 * identifiant de ressource qui ne sort pas de son segment de route (il finit
 * dans un `revalidatePath` et un tag). `home` ignore l'identifiant.
 */
export function isValidRefreshTarget(scope: unknown, id: unknown): scope is RefreshScope {
  if (!isRefreshScope(scope) || typeof id !== "string") return false;
  return scope === "home" || isSafeId(id);
}
