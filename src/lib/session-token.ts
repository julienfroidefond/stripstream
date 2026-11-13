/**
 * Revalidation du JWT de session contre la base (ADR 0032).
 *
 * Les rôles ne sont plus figés dans le jeton pour 30 jours : à chaque lecture
 * de session (`auth()`), le callback `jwt` relit l'utilisateur. Un compte
 * supprimé, ou dont la `sessionVersion` a changé (mot de passe changé ou
 * réinitialisé), invalide le jeton ; un changement de rôle est pris en compte
 * à la requête suivante. La lecture est une recherche par clé primaire en
 * SQLite local : son coût est négligeable devant le rendu d'une page.
 */

/** Champs du JWT que l'application lit ou écrit. */
export interface SessionTokenClaims {
  sub?: string;
  /** Rôles sérialisés en JSON (le jeton doit rester clonable). */
  roles?: unknown;
  /** Version de session au moment de la connexion ; absente sur les jetons antérieurs. */
  sessionVersion?: unknown;
}

export interface SessionUserRecord {
  roles: unknown;
  sessionVersion: number;
}

export type LoadSessionUser = (userId: number) => Promise<SessionUserRecord | null>;

function toRoles(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((role): role is string => typeof role === "string") : [];
}

/** Rôles lus depuis le jeton (`[]` si la valeur est absente ou corrompue). */
export function rolesFromToken(token: SessionTokenClaims): string[] {
  if (typeof token.roles !== "string") return [];
  try {
    return toRoles(JSON.parse(token.roles));
  } catch {
    return [];
  }
}

/**
 * Jeton à jour, ou `null` pour fermer la session. Un jeton émis avant
 * l'introduction de `sessionVersion` est traité comme version 0, la valeur par
 * défaut de la colonne : la mise à jour ne déconnecte personne.
 */
export async function revalidateSessionToken<T extends SessionTokenClaims>(
  token: T,
  loadUser: LoadSessionUser
): Promise<T | null> {
  const userId = Number(token.sub);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const user = await loadUser(userId);
  if (!user) return null;

  const tokenVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
  if (tokenVersion !== user.sessionVersion) return null;

  return {
    ...token,
    roles: JSON.stringify(toRoles(user.roles)),
    sessionVersion: user.sessionVersion,
  };
}
