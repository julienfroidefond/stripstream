type CacheEntry = {
  data: any;
  timestamp: number;
  ttl: number;
};

class ServerCacheService {
  private static instance: ServerCacheService;
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();
  private defaultTTL = 5 * 60; // 5 minutes en secondes

  private constructor() {
    // Private constructor to prevent external instantiation
  }

  public static getInstance(): ServerCacheService {
    if (!ServerCacheService.instance) {
      ServerCacheService.instance = new ServerCacheService();
    }
    return ServerCacheService.instance;
  }

  /**
   * Met en cache des données avec une durée de vie
   */
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000,
    });
  }

  /**
   * Récupère des données du cache si elles sont valides
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (cached.expiry > now) {
      return cached.data;
    }

    this.cache.delete(key);
    return null;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Récupère des données du cache ou exécute la fonction si nécessaire
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      return cached.data as T;
    }

    try {
      const data = await fetcher();
      this.cache.set(key, {
        data,
        expiry: now + ttl * 1000,
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

export const serverCacheService = ServerCacheService.getInstance();
