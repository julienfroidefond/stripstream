import { BaseApiService } from "./base-api.service";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { LibraryResponse } from "@/types/library";
import { getServerCacheService } from "./server-cache.service";

interface HomeData {
  ongoing: KomgaSeries[];
  recentlyRead: KomgaBook[];
  onDeck: KomgaBook[];
  latestSeries: KomgaSeries[];
}

export class HomeService extends BaseApiService {
  static async getHomeData(): Promise<HomeData> {
    try {
      // Appels API parallèles avec cache individuel
      const [ongoing, recentlyRead, onDeck, latestSeries] = await Promise.all([
        this.fetchWithCache<LibraryResponse<KomgaSeries>>(
          "home-ongoing",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaSeries>>({
              path: "series",
              params: {
                read_status: "IN_PROGRESS",
                sort: "readDate,desc",
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaBook>>(
          "home-recently-read",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaBook>>({
              path: "books/latest",
              params: {
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaBook>>(
          "home-on-deck",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaBook>>({
              path: "books/ondeck",
              params: {
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaSeries>>(
          "home-latest-series",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaSeries>>({
              path: "series/latest",
              params: {
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
      ]);

      return {
        ongoing: ongoing.content || [],
        recentlyRead: recentlyRead.content || [],
        onDeck: onDeck.content || [],
        latestSeries: latestSeries.content || [],
      };
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les données de la page d'accueil");
    }
  }

  static async invalidateHomeCache(): Promise<void> {
    const cacheService = await getServerCacheService();
    await cacheService.delete("home-ongoing");
    await cacheService.delete("home-recently-read");
    await cacheService.delete("home-on-deck");
    await cacheService.delete("home-latest-series");
  }
}
