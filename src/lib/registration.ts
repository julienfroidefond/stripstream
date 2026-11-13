/**
 * Inscription en libre-service (ADR 0032).
 *
 * Fermée par défaut : seule la valeur `true` de `REGISTRATION_ENABLED` l'ouvre.
 * Une instance auto-hébergée n'expose donc pas un formulaire d'inscription
 * anonyme sans décision explicite ; les comptes sont alors créés par l'admin
 * (`scripts/init-db.ts`) ou en ouvrant temporairement l'inscription.
 */
export function isRegistrationEnabled(
  env: Partial<Record<string, string | undefined>> = process.env
): boolean {
  return env.REGISTRATION_ENABLED?.trim().toLowerCase() === "true";
}
