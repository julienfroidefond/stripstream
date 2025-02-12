import { BaseApiService } from "./base-api.service";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { LibraryResponse } from "@/types/library";

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

      return this.fetchWithCache<HomeData>(
        "home",
        async () => {
          // Construction des URLs
          const ongoingUrl = this.buildUrl(config, "series", {
            read_status: "IN_PROGRESS",
            sort: "readDate,desc",
            page: "0",
            size: "20",
            media_status: "READY",
          });

          const recentlyReadUrl = this.buildUrl(config, "books", {
            read_status: "READ",
            sort: "readDate,desc",
            page: "0",
            size: "20",
            media_status: "READY",
          });

          const onDeckUrl = this.buildUrl(config, "books/ondeck", {
            page: "0",
            size: "20",
          });

          // Appels API parallèles avec fetchFromApi
          const [ongoing, recentlyRead, onDeck] = await Promise.all([
            this.fetchFromApi<LibraryResponse<KomgaSeries>>(ongoingUrl, headers),
            this.fetchFromApi<LibraryResponse<KomgaBook>>(recentlyReadUrl, headers),
            this.fetchFromApi<LibraryResponse<KomgaBook>>(onDeckUrl, headers),
          ]);

          return {
            ongoing: ongoing.content || [],
            recentlyRead: recentlyRead.content || [],
            onDeck: onDeck.content || [],
          };
        },
        "HOME"
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les données de la page d'accueil");
    }
  }
}
