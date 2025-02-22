import { BaseApiService } from "./base-api.service";
import { LibraryResponse } from "@/types/library";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { BookService } from "./book.service";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { serverCacheService } from "./server-cache.service";

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

  static async clearSeriesCache(seriesId: string) {
    serverCacheService.delete(`series-${seriesId}`);
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
        async () => this.fetchFromApi<LibraryResponse<KomgaBook>>(url, headers),
        "BOOKS"
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les tomes");
    }
  }

  static async clearSeriesBooksCache(seriesId: string) {
    serverCacheService.deleteAll(`series-${seriesId}-books`);
  }

  static async getFirstBook(seriesId: string): Promise<string> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `series/${seriesId}/books`);
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<string>(
        `series-first-book-${seriesId}`,
        async () => {
          const data = await this.fetchFromApi<LibraryResponse<KomgaBook>>(
            `series/${seriesId}/books?page=0&size=1`,
            headers
          );
          if (!data.content || data.content.length === 0) {
            throw new Error("Aucun livre trouvé dans la série");
          }

          return data.content[0].id;
        },
        "SERIES"
      );
    } catch (error) {
      console.error("Erreur lors de la récupération du premier livre:", error);
      return this.handleError(error, "Impossible de récupérer le premier livre");
    }
  }

  static async getCover(seriesId: string): Promise<Response> {
    try {
      // Récupérer les préférences de l'utilisateur
      const preferences = await PreferencesService.getPreferences();

      // Si l'utilisateur préfère les vignettes, utiliser la miniature
      if (preferences.showThumbnails) {
        const response = await ImageService.getImage(`series/${seriesId}/thumbnail`);
        return new Response(response.buffer, {
          headers: {
            "Content-Type": response.contentType || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }

      // Sinon, récupérer la première page
      const firstBookId = await this.getFirstBook(seriesId);
      const response = await BookService.getPage(firstBookId, 1);
      return response;
    } catch (error) {
      throw this.handleError(error, "Impossible de récupérer la couverture");
    }
  }

  static getCoverUrl(seriesId: string): string {
    return `/api/komga/images/series/${seriesId}/thumbnail`;
  }

  static async getMultipleSeries(seriesIds: string[]): Promise<KomgaSeries[]> {
    try {
      const seriesPromises = seriesIds.map((id) => this.getSeries(id));
      const series = await Promise.all(seriesPromises);
      return series.filter(Boolean);
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les séries");
    }
  }
}
