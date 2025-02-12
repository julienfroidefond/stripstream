type CacheEntry = {
  data: any;
  timestamp: number;
  ttl: number;
};

class ServerCacheService {
  private static instance: ServerCacheService;
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();

  private static readonly fiveMinutes = 5 * 60;
  private static readonly tenMinutes = 10 * 60;
  private static readonly twentyFourHours = 24 * 60 * 60;
  private static readonly oneMinute = 1 * 60;
  private static readonly noCache = 0;

  // Configuration des temps de cache en secondes
  private static readonly DEFAULT_TTL = {
    DEFAULT: ServerCacheService.fiveMinutes,
    HOME: ServerCacheService.fiveMinutes,
    LIBRARIES: ServerCacheService.twentyFourHours,
    SERIES: ServerCacheService.fiveMinutes,
    BOOKS: ServerCacheService.fiveMinutes,
    IMAGES: ServerCacheService.twentyFourHours,
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
  public getTTL(type: keyof typeof ServerCacheService.DEFAULT_TTL): number {
    // Essayer de récupérer la configuration utilisateur
    try {
      const ttlConfig = localStorage.getItem("ttlConfig");
      if (ttlConfig) {
        const config = JSON.parse(ttlConfig);
        const key = `${type.toLowerCase()}TTL` as keyof typeof config;
        if (config[key]) {
          // Convertir les minutes en secondes
          return config[key] * 60;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la lecture de la configuration TTL:", error);
    }

    // Utiliser la valeur par défaut si pas de configuration utilisateur
    return ServerCacheService.DEFAULT_TTL[type];
  }

  /**
   * Met en cache des données avec une durée de vie
   */
  set(key: string, data: any, type: keyof typeof ServerCacheService.DEFAULT_TTL = "DEFAULT"): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.getTTL(type) * 1000,
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
    type: keyof typeof ServerCacheService.DEFAULT_TTL = "DEFAULT"
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      console.log("Cache hit for key:", key);
      return cached.data as T;
    }

    try {
      const data = await fetcher();
      this.cache.set(key, {
        data,
        expiry: now + this.getTTL(type) * 1000,
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
