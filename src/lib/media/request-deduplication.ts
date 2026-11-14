/**
 * Service de déduplication des requêtes côté serveur
 * Évite de lancer plusieurs requêtes identiques vers Komga simultanément
 */
type PendingRequest<T> = Promise<T>;

class RequestDeduplicationService {
  // Map pour tracker les requêtes en cours par clé unique
  private pendingRequests = new Map<string, PendingRequest<unknown>>();

  /**
   * Exécute une requête de manière dédupliquée
   * Si une requête identique est déjà en cours, on attend son résultat
   * au lieu d'en lancer une nouvelle
   */
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60000 // 60 secondes max pour éviter les fuites mémoire
  ): Promise<T> {
    // Vérifier si une requête identique est déjà en cours
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // Créer une nouvelle promesse pour cette requête
    const promise = fetcher()
      .then((result) => {
        // Nettoyer uniquement si cette entrée est toujours la nôtre. Le
        // timeout peut avoir supprimé cette promesse puis une nouvelle
        // requête peut avoir réutilisé la même clé entre-temps.
        if (this.pendingRequests.get(key) === promise) {
          this.pendingRequests.delete(key);
        }
        return result;
      })
      .catch((error) => {
        if (this.pendingRequests.get(key) === promise) {
          this.pendingRequests.delete(key);
        }
        throw error;
      });

    // Stocker la promesse en cours
    this.pendingRequests.set(key, promise);

    // Timeout de sécurité pour éviter les fuites mémoire
    setTimeout(() => {
      // Ne pas supprimer une requête plus récente qui aurait remplacé cette
      // entrée après l'expiration de la précédente.
      if (this.pendingRequests.get(key) === promise) {
        this.pendingRequests.delete(key);
      }
    }, ttl);

    return promise;
  }

  /**
   * Nettoie toutes les requêtes en cours (pour les tests)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Retourne le nombre de requêtes en cours
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Singleton instance
export const requestDeduplicationService = new RequestDeduplicationService();
