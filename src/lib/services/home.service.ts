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
      const config = await this.getKomgaConfig();
      const headers = this.getAuthHeaders(config);

      // Construction des URLs avec des paramètres optimisés
      const ongoingUrl = this.buildUrl(config, "series", {
        read_status: "IN_PROGRESS",
        sort: "readDate,desc",
        page: "0",
        size: "10",
        media_status: "READY",
      });

      const recentlyReadUrl = this.buildUrl(config, "books/latest", {
        page: "0",
        size: "10",
        media_status: "READY",
      });

      const onDeckUrl = this.buildUrl(config, "books/ondeck", {
        page: "0",
        size: "10",
        media_status: "READY",
      });

      // Appels API parallèles avec cache individuel
      const [ongoing, recentlyRead, onDeck] = await Promise.all([
        this.fetchWithCache<LibraryResponse<KomgaSeries>>(
          "home-ongoing",
          async () => this.fetchFromApi<LibraryResponse<KomgaSeries>>(ongoingUrl, headers),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaBook>>(
          "home-recently-read",
          async () => this.fetchFromApi<LibraryResponse<KomgaBook>>(recentlyReadUrl, headers),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaBook>>(
          "home-on-deck",
          async () => this.fetchFromApi<LibraryResponse<KomgaBook>>(onDeckUrl, headers),
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
