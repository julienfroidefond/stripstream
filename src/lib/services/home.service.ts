import { BaseApiService } from "./base-api.service";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { LibraryResponse } from "@/types/library";

interface HomeData {
  ongoing: KomgaSeries[];
  recentlyRead: KomgaBook[];
  popular: KomgaSeries[];
}

export class HomeService extends BaseApiService {
  static async getHomeData(): Promise<HomeData> {
    try {
      const config = await this.getKomgaConfig();
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<HomeData>(
        "home",
        async () => {
          // Appels API parallèles
          const [ongoingResponse, recentlyReadResponse, popularResponse] = await Promise.all([
            // Séries en cours
            fetch(
              this.buildUrl(config, "series", {
                read_status: "IN_PROGRESS",
                sort: "readDate,desc",
                page: "0",
                size: "20",
                media_status: "READY",
              }),
              { headers }
            ),
            // Derniers livres lus
            fetch(
              this.buildUrl(config, "books", {
                read_status: "READ",
                sort: "readDate,desc",
                page: "0",
                size: "20",
              }),
              { headers }
            ),
            // Séries populaires
            fetch(
              this.buildUrl(config, "series", {
                page: "0",
                size: "20",
                sort: "metadata.titleSort,asc",
                media_status: "READY",
              }),
              { headers }
            ),
          ]);

          // Vérifier les réponses
          if (!ongoingResponse.ok || !recentlyReadResponse.ok || !popularResponse.ok) {
            throw new Error("Erreur lors de la récupération des données");
          }

          // Récupérer les données
          const [ongoing, recentlyRead, popular] = (await Promise.all([
            ongoingResponse.json(),
            recentlyReadResponse.json(),
            popularResponse.json(),
          ])) as [
            LibraryResponse<KomgaSeries>,
            LibraryResponse<KomgaBook>,
            LibraryResponse<KomgaSeries>
          ];

          return {
            ongoing: ongoing.content || [],
            recentlyRead: recentlyRead.content || [],
            popular: popular.content || [],
          };
        },
        5 * 60 // Cache de 5 minutes
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les données de la page d'accueil");
    }
  }
}
