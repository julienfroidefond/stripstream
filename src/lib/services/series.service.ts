import { BaseApiService } from "./base-api.service";
import { LibraryResponse } from "@/types/library";
import { KomgaBook, KomgaSeries } from "@/types/komga";

export class SeriesService extends BaseApiService {
  static async getSeries(seriesId: string): Promise<KomgaSeries> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `series/${seriesId}`);
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<KomgaSeries>(
        `series-${seriesId}`,
        async () => this.fetchFromApi<KomgaSeries>(url, headers),
        "SERIES"
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
        sort: "metadata.number,asc",
        ...(unreadOnly && { read_status: "UNREAD,IN_PROGRESS" }),
      });
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<LibraryResponse<KomgaBook>>(
        `series-${seriesId}-books-${page}-${size}-${unreadOnly}`,
        async () => this.fetchFromApi<LibraryResponse<KomgaBook>>(url, headers),
        "BOOKS"
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les tomes");
    }
  }
}
