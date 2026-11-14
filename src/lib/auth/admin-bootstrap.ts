/**
 * Décision pure de `scripts/init-db.ts` pour le compte administrateur initial.
 *
 * Le script tourne à chaque démarrage du conteneur. Il ne crée l'admin que si
 * le compte n'existe pas encore ET qu'un mot de passe explicite est fourni
 * (`ADMIN_DEFAULT_PASSWORD`) : il n'y a plus de mot de passe par défaut connu
 * de tous. Un compte existant n'est jamais modifié (ni rôle ni mot de passe) :
 * un admin rétrogradé depuis l'interface reste rétrogradé après redémarrage.
 *
 * Module sans dépendance : il est copié tel quel dans l'image Docker pour le
 * script (voir `Dockerfile`).
 */

/** Longueur minimale acceptée pour le mot de passe initial. */
export const ADMIN_BOOTSTRAP_MIN_PASSWORD_LENGTH = 8;

/**
 * Code de sortie du script quand il refuse de créer l'admin faute de mot de
 * passe. `docker-entrypoint.sh` le tolère pour ne pas boucler au démarrage ;
 * toute autre erreur reste bloquante.
 */
export const ADMIN_BOOTSTRAP_REFUSED_EXIT_CODE = 3;

export type AdminBootstrapPlan =
  | { action: "keep" }
  | { action: "create"; password: string }
  | { action: "refuse"; reason: "missing-password" | "weak-password" };

export function planAdminBootstrap(input: {
  adminExists: boolean;
  password: string | undefined;
}): AdminBootstrapPlan {
  if (input.adminExists) return { action: "keep" };

  const password = input.password ?? "";
  if (password.trim() === "") return { action: "refuse", reason: "missing-password" };
  if (password.length < ADMIN_BOOTSTRAP_MIN_PASSWORD_LENGTH) {
    return { action: "refuse", reason: "weak-password" };
  }
  return { action: "create", password };
}
