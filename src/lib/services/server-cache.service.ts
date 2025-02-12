type CacheEntry = {
  data: any;
  timestamp: number;
  ttl: number;
};

class ServerCacheService {
  private static instance: ServerCacheService;
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();

  // Configuration des temps de cache en secondes (identique à CacheService)
  private static readonly TTL = {
    DEFAULT: 5 * 60, // 5 minutes
    HOME: 5 * 60, // 5 minutes
    LIBRARIES: 10 * 60, // 10 minutes
    SERIES: 5 * 60, // 5 minutes
    BOOKS: 5 * 60, // 5 minutes
    IMAGES: 24 * 60 * 60, // 24 heures
    READ_PROGRESS: 1 * 60, // 1 minute
  };

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
   * Retourne le TTL pour un type de données spécifique
   */
  public getTTL(type: keyof typeof ServerCacheService.TTL): number {
    return ServerCacheService.TTL[type];
  }

  /**
   * Met en cache des données avec une durée de vie
   */
  set(key: string, data: any, type: keyof typeof ServerCacheService.TTL = "DEFAULT"): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ServerCacheService.TTL[type] * 1000,
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
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    type: keyof typeof ServerCacheService.TTL = "DEFAULT"
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      return cached.data as T;
    }

    try {
      const data = await fetcher();
      this.cache.set(key, {
        data,
        expiry: now + ServerCacheService.TTL[type] * 1000,
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
