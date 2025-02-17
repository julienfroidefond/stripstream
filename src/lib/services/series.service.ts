import { BaseApiService } from "./base-api.service";
import { LibraryResponse } from "@/types/library";
import { KomgaBook, KomgaSeries } from "@/types/komga";
import { BookService } from "./book.service";
import { ImageService } from "./image.service";

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

  static async getFirstBook(seriesId: string): Promise<string> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `series/${seriesId}/books`);
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<string>(
        `series-first-book-${seriesId}`,
        async () => {
          const response = await fetch(`${url}?page=0&size=1`, { headers });
          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }

          const data = await response.json();
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

  static async getFirstPage(seriesId: string): Promise<Response> {
    try {
      // Récupérer l'ID du premier livre
      const firstBookId = await this.getFirstBook(seriesId);
      return await BookService.getPage(firstBookId, 1);
    } catch (error) {
      // En cas d'erreur, on essaie de récupérer le thumbnail comme fallback
      try {
        const response = await ImageService.getImage(`series/${seriesId}/thumbnail`);
        return new Response(response.buffer, {
          headers: {
            "Content-Type": response.contentType || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch (fallbackError) {
        throw this.handleError(fallbackError, "Impossible de récupérer l'image de la série");
      }
    }
  }

  static async getThumbnail(seriesId: string): Promise<Response> {
    try {
      const response = await ImageService.getImage(`series/${seriesId}/thumbnail`);
      return new Response(response.buffer, {
        headers: {
          "Content-Type": response.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      throw this.handleError(error, "Impossible de récupérer la miniature de la série");
    }
  }
}
