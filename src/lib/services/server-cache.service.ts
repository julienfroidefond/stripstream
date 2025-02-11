type CacheEntry = {
  data: any;
  timestamp: number;
  ttl: number;
};

class ServerCacheService {
  private static instance: ServerCacheService;
  private cache: Map<string, CacheEntry>;
  private defaultTTL = 5 * 60; // 5 minutes en secondes

  private constructor() {
    this.cache = new Map();
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
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Récupère des données du cache si elles sont valides
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
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
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cachedData = this.get(key);
    if (cachedData) {
      return cachedData;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

export const serverCacheService = ServerCacheService.getInstance();
