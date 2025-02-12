import { BaseApiService } from "./base-api.service";
import { Series } from "@/types/series";
import { LibraryResponse } from "@/types/library";
import { KomgaBook } from "@/types/komga";

export class SeriesService extends BaseApiService {
  static async getSeries(seriesId: string): Promise<Series> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `series/${seriesId}`);
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<Series>(
        `series-${seriesId}`,
        async () => {
          const response = await fetch(url, { headers });
          if (!response.ok) {
            throw new Error("Erreur lors de la récupération de la série");
          }
          return response.json();
        },
        5 * 60 // Cache de 5 minutes
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer la série");
    }
  }

  static async getSeriesBooks(
    seriesId: string,
    page: number = 0,
    size: number = 24,
    unreadOnly: boolean = false
  ): Promise<LibraryResponse<KomgaBook>> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `series/${seriesId}/books`, {
        page: page.toString(),
        size: size.toString(),
        sort: "metadata.numberSort,asc",
        ...(unreadOnly && { read_status: "UNREAD,IN_PROGRESS" }),
      });
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<LibraryResponse<KomgaBook>>(
        `series-${seriesId}-books-${page}-${size}-${unreadOnly}`,
        async () => {
          const response = await fetch(url, { headers });
          if (!response.ok) {
            throw new Error("Erreur lors de la récupération des tomes");
          }
          return response.json();
        },
        5 * 60 // Cache de 5 minutes
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les tomes");
    }
  }
}
