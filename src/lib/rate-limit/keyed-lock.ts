/**
 * Exclusion mutuelle par clé, dans le processus.
 *
 * Le blocage par email lit le compteur d'échecs (`peekRateLimit`), compare le
 * mot de passe, puis compte l'échec : sans sérialisation, N tentatives
 * parallèles lisent toutes « sous la limite » avant qu'aucun échec ne soit
 * enregistré. En les faisant passer une par une, chaque lecture voit l'échec
 * précédent. La garantie vaut pour un processus (le déploiement actuel) ; elle
 * ne couvre pas plusieurs instances partageant la base.
 */
export class KeyedLock {
  private readonly tails = new Map<string, Promise<void>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);

    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}
