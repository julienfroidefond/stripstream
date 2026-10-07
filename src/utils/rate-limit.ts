/**
 * Rate-limiter in-memory simple par utilisateur. Utilisé pour les actions
 * sensibles (test de connexion provider) afin d'empêcher des tentatives en
 * boucle. Pas adapté à un déploiement multi-instance (l'état est local au
 * process Node) mais suffisant pour le scope actuel (single-node SQLite).
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
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

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= options.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: options.limit - 1, resetMs: options.windowMs };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: options.windowMs - (now - existing.windowStart),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: options.limit - existing.count,
    resetMs: options.windowMs - (now - existing.windowStart),
  };
}
