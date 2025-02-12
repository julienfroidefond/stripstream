import { TTLConfig } from "@/types/cache";

class ClientCacheService {
  private static instance: ClientCacheService;
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();

  private static readonly DEFAULT_TTL = {
    DEFAULT: 5 * 60,
    HOME: 5 * 60,
    LIBRARIES: 24 * 60 * 60,
    SERIES: 5 * 60,
    BOOKS: 5 * 60,
    IMAGES: 24 * 60 * 60,
  };

  private constructor() {
    // Private constructor to prevent external instantiation
  }

  public static getInstance(): ClientCacheService {
    if (!ClientCacheService.instance) {
      ClientCacheService.instance = new ClientCacheService();
    }
    return ClientCacheService.instance;
  }

  /**
   * Retourne le TTL pour un type de données spécifique
   */
  public getTTL(type: keyof typeof ClientCacheService.DEFAULT_TTL): number {
    try {
      const ttlConfig = localStorage.getItem("ttlConfig");
      if (ttlConfig) {
        const config = JSON.parse(ttlConfig) as TTLConfig;
        const key = `${type.toLowerCase()}TTL` as keyof TTLConfig;
        if (config[key]) {
          // Convertir les minutes en secondes
          return config[key] * 60;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la lecture de la configuration TTL:", error);
    }

    return ClientCacheService.DEFAULT_TTL[type];
  }

  /**
   * Met en cache des données avec une durée de vie
   */
  set(key: string, data: any, type: keyof typeof ClientCacheService.DEFAULT_TTL = "DEFAULT"): void {
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
    type: keyof typeof ClientCacheService.DEFAULT_TTL = "DEFAULT"
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

export const clientCacheService = ClientCacheService.getInstance();
