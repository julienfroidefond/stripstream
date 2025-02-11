class CacheService {
  private static instance: CacheService;
  private cacheName = "komga-cache-v1";
  private defaultTTL = 5 * 60; // 5 minutes en secondes

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Met en cache une réponse avec une durée de vie
   */
  async set(key: string, response: Response, ttl: number = this.defaultTTL): Promise<void> {
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
    ttl: number = this.defaultTTL
  ): Promise<Response> {
    const cachedResponse = await this.get(key);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetcher();
    const clonedResponse = response.clone();
    await this.set(key, clonedResponse, ttl);
    return response;
  }
}

export const cacheService = CacheService.getInstance();
