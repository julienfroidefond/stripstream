/**
 * Limiteur de requêtes d'images vers les providers.
 *
 * Le Wall peut demander plusieurs dizaines de couvertures d'un coup. Sur un
 * déploiement à une instance (et un provider souvent installé sur la même
 * machine), cette rafale sature les sockets et fait expirer des requêtes qui
 * laissent ensuite des tuiles noires. On garde donc un petit nombre de fetch
 * amont en vol ; le navigateur, lui, continue d'attendre sa réponse.
 *
 * La file ne contient que des promesses en attente : quelques dizaines d'octets
 * par requête. Elle est volontairement locale au process, comme le rate
 * limiter : à revoir avant de passer multi-instance.
 */

export class ImageRequestLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = Math.max(1, maxConcurrent);
  }

  get activeCount(): number {
    return this.active;
  }

  get waitingCount(): number {
    return this.waiting.length;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiting.shift();
    if (next) {
      this.active += 1;
      next();
    }
  }
}

export const imageRequestLimiter = new ImageRequestLimiter(6);
