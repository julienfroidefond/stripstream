import { advanceWindow, type FixedWindow } from "./fixed-window";

/**
 * Contrat commun aux stores de quota.
 *
 * `hit` doit être atomique par clé : deux appels concurrents ne peuvent pas
 * lire le même compteur puis l'écrire tous les deux. La fenêtre renvoyée est
 * celle qui vient d'être consommée. Le store ne connaît pas le quota : il
 * compte les appels, `toRateLimitResult` tranche.
 */
export interface RateLimitStore {
  hit(key: string, now: number, windowMs: number): Promise<FixedWindow>;
}

/**
 * Au-delà de ce nombre de clés, le store mémoire balaie les fenêtres
 * périmées. Les fenêtres de l'app durent au plus 60 s ; une heure est donc une
 * marge sûre pour ne jamais oublier une clé encore active.
 */
const SWEEP_THRESHOLD = 1000;
const STALE_WINDOW_MS = 60 * 60 * 1000;

function sweep(buckets: Map<string, FixedWindow>, now: number): void {
  for (const [key, window] of buckets) {
    if (now - window.windowStart > STALE_WINDOW_MS) buckets.delete(key);
  }
}

/**
 * Store local au process : la référence comportementale du module, utilisée en
 * test et comme repli quand le store partagé est indisponible. Il ne survit
 * pas à un redémarrage et n'est pas partagé entre instances.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
  const buckets = new Map<string, FixedWindow>();

  return {
    async hit(key, now, windowMs) {
      const next = advanceWindow(buckets.get(key) ?? null, now, windowMs);
      buckets.set(key, next);

      if (buckets.size > SWEEP_THRESHOLD) sweep(buckets, now);

      return next;
    },
  };
}
