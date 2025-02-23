import { BaseApiService } from "./base-api.service";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { LibraryResponse } from "@/types/library";
import { serverCacheService } from "./server-cache.service";

interface HomeData {
  ongoing: KomgaSeries[];
  recentlyRead: KomgaBook[];
  onDeck: KomgaBook[];
}

export class HomeService extends BaseApiService {
  static async getHomeData(): Promise<HomeData> {
    try {
      // Appels API parallèles avec cache individuel
      const [ongoing, recentlyRead, onDeck] = await Promise.all([
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
      ]);

      return {
        ongoing: ongoing.content || [],
        recentlyRead: recentlyRead.content || [],
        onDeck: onDeck.content || [],
      };
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les données de la page d'accueil");
    }
  }

  static async clearHomeCache() {
    serverCacheService.delete("home-ongoing");
    serverCacheService.delete("home-recently-read");
    serverCacheService.delete("home-on-deck");
  }
}
