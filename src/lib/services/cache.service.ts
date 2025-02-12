class CacheService {
  private static instance: CacheService;
  private cacheName = "komga-cache-v1";

  private static readonly fiveMinutes = 5 * 60;
  private static readonly tenMinutes = 10 * 60;
  private static readonly twentyFourHours = 24 * 60 * 60;
  private static readonly oneMinute = 1 * 60;
  private static readonly noCache = 0;

  // Configuration des temps de cache en secondes
  private static readonly TTL = {
    DEFAULT: CacheService.fiveMinutes, // 5 minutes
    HOME: CacheService.fiveMinutes, // 5 minutes
    LIBRARIES: CacheService.tenMinutes, // 10 minutes
    SERIES: CacheService.fiveMinutes, // 5 minutes
    BOOKS: CacheService.fiveMinutes, // 5 minutes
    IMAGES: CacheService.twentyFourHours, // 24 heures
    READ_PROGRESS: CacheService.oneMinute, // 1 minute
  };
  // private static readonly TTL = {
  //   DEFAULT: CacheService.noCache, // 5 minutes
  //   HOME: CacheService.noCache, // 5 minutes
  //   LIBRARIES: CacheService.noCache, // 10 minutes
  //   SERIES: CacheService.noCache, // 5 minutes
  //   BOOKS: CacheService.noCache, // 5 minutes
  //   IMAGES: CacheService.noCache, // 24 heures
  //   READ_PROGRESS: CacheService.noCache, // 1 minute
  // };

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Retourne le TTL pour un type de données spécifique
   */
  public getTTL(type: keyof typeof CacheService.TTL): number {
    return CacheService.TTL[type];
  }

  /**
   * Met en cache une réponse avec une durée de vie
   */
  async set(
    key: string,
    response: Response,
    ttl: number = CacheService.TTL.DEFAULT
  ): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const cache = await caches.open(this.cacheName);
      const headers = new Headers(response.headers);
      headers.append("x-cache-timestamp", Date.now().toString());
      headers.append("x-cache-ttl", ttl.toString());

      const cachedResponse = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

      await cache.put(key, cachedResponse);
    } catch (error) {
      console.error("Erreur lors de la mise en cache:", error);
    }
  }

  /**
   * Récupère une réponse du cache si elle est valide
   */
  async get(key: string): Promise<Response | null> {
    if (typeof window === "undefined") return null;

    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(key);

      if (!response) return null;

      // Vérifier si la réponse est expirée
      const timestamp = parseInt(response.headers.get("x-cache-timestamp") || "0");
      const ttl = parseInt(response.headers.get("x-cache-ttl") || "0");
      const now = Date.now();

      if (now - timestamp > ttl * 1000) {
        await cache.delete(key);
        return null;
      }

      return response;
    } catch (error) {
      console.error("Erreur lors de la lecture du cache:", error);
      return null;
    }
  }

  /**
   * Supprime une entrée du cache
   */
  async delete(key: string): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const cache = await caches.open(this.cacheName);
      await cache.delete(key);
    } catch (error) {
      console.error("Erreur lors de la suppression du cache:", error);
    }
  }

  /**
   * Vide le cache
   */
  async clear(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      await caches.delete(this.cacheName);
    } catch (error) {
      console.error("Erreur lors du nettoyage du cache:", error);
    }
  }

  /**
   * Récupère une réponse du cache ou fait l'appel API si nécessaire
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<Response>,
    type: keyof typeof CacheService.TTL = "DEFAULT"
  ): Promise<Response> {
    const cachedResponse = await this.get(key);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetcher();
    const clonedResponse = response.clone();
    await this.set(key, clonedResponse, CacheService.TTL[type]);
    return response;
  }
}

export const cacheService = CacheService.getInstance();
