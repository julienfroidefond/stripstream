/**
 * Fenêtre fixe d'un compteur de quota : l'arithmétique pure partagée par tous
 * les stores. Un store ne décide jamais qu'un appel est autorisé ; il renvoie
 * l'état de la fenêtre après consommation, et `toRateLimitResult` en déduit la
 * décision. Le store SQL doit reproduire exactement ces règles (voir
 * `prisma-store.ts`).
 *
 * Chaque appel est compté, y compris ceux qui dépassent le quota : le compteur
 * grossit au-delà de `limit` jusqu'à la fin de la fenêtre, ce qui rend la règle
 * d'incrément identique dans tous les stores et permet de compter les essais
 * refusés. Seule la décision (`allowed`) dépend du quota.
 */

export interface RateLimitOptions {
  /** Nombre max d'appels autorisés dans la fenêtre. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Nombre d'appels restants dans la fenêtre courante. */
  remaining: number;
  /** Millisecondes avant la réinitialisation de la fenêtre. */
  resetMs: number;
}

export interface FixedWindow {
  /** Appels enregistrés dans la fenêtre. */
  count: number;
  /** Instant d'ouverture de la fenêtre (epoch ms). */
  windowStart: number;
}

/** Consomme un appel dans la fenêtre de la clé, en l'ouvrant si besoin. */
export function advanceWindow(
  current: FixedWindow | null,
  now: number,
  windowMs: number
): FixedWindow {
  if (!current || now - current.windowStart >= windowMs) {
    return { count: 1, windowStart: now };
  }
  return { count: current.count + 1, windowStart: current.windowStart };
}

export function toRateLimitResult(
  window: FixedWindow,
  now: number,
  options: RateLimitOptions
): RateLimitResult {
  return {
    allowed: window.count <= options.limit,
    remaining: Math.max(0, options.limit - window.count),
    resetMs: Math.max(0, options.windowMs - (now - window.windowStart)),
  };
}

/**
 * Fenêtre encore ouverte pour une clé, sans la consommer : `null` si la clé
 * n'a jamais été vue ou si sa fenêtre est échue (`advanceWindow` en rouvrirait
 * une). Sert aux budgets qui ne comptent que certains appels (les échecs de
 * mot de passe) mais doivent bloquer avant de les traiter.
 */
export function activeWindow(
  current: FixedWindow | null,
  now: number,
  windowMs: number
): FixedWindow | null {
  if (!current || now - current.windowStart >= windowMs) return null;
  return current;
}

/**
 * Décision qu'aurait le prochain appel, sans le compter : autorisé tant que
 * le compteur reste sous `limit` (le prochain hit le porterait à `count + 1`).
 */
export function toPeekResult(
  window: FixedWindow | null,
  now: number,
  options: RateLimitOptions
): RateLimitResult {
  if (!window) {
    return { allowed: true, remaining: options.limit, resetMs: 0 };
  }
  return {
    allowed: window.count < options.limit,
    remaining: Math.max(0, options.limit - window.count),
    resetMs: Math.max(0, options.windowMs - (now - window.windowStart)),
  };
}
