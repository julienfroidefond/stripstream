import { BaseApiService } from "./base-api.service";
import type { LibraryResponse } from "@/types/library";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import { BookService } from "./book.service";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import logger from "@/lib/logger";

export class SeriesService extends BaseApiService {
  private static readonly CACHE_TTL = 120; // 2 minutes

  static async getSeries(seriesId: string): Promise<KomgaSeries> {
    try {
      return this.fetchFromApi<KomgaSeries>(
        { path: `series/${seriesId}` },
        {},
        { revalidate: this.CACHE_TTL }
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async getSeriesBooks(
    seriesId: string,
    page: number = 0,
    size: number = 24,
    unreadOnly: boolean = false
  ): Promise<LibraryResponse<KomgaBook>> {
    try {
      const headers = { "Content-Type": "application/json" };

      // Construction du body de recherche pour Komga
      let condition: any;

      if (unreadOnly) {
        // Utiliser allOf pour combiner seriesId avec anyOf pour UNREAD ou IN_PROGRESS
        condition = {
          allOf: [
            {
              seriesId: {
                operator: "is",
                value: seriesId,
              },
            },
            {
              anyOf: [
                {
                  readStatus: {
                    operator: "is",
                    value: "UNREAD",
                  },
                },
                {
                  readStatus: {
                    operator: "is",
                    value: "IN_PROGRESS",
                  },
                },
              ],
            },
          ],
        };
      } else {
        condition = {
          seriesId: {
            operator: "is",
            value: seriesId,
          },
        };
      }

      const searchBody = { condition };

      const params: Record<string, string | string[]> = {
        page: String(page),
        size: String(size),
        sort: "number,asc",
      };

      const response = await this.fetchFromApi<LibraryResponse<KomgaBook>>(
        { path: "books/list", params },
        headers,
        {
          method: "POST",
          body: JSON.stringify(searchBody),
          revalidate: this.CACHE_TTL,
        }
      );

      // Filtrer uniquement les livres supprimés côté client (léger)
      const filteredContent = response.content.filter((book: KomgaBook) => !book.deleted);

      return {
        ...response,
        content: filteredContent,
        numberOfElements: filteredContent.length,
      };
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async getFirstBook(seriesId: string): Promise<string> {
    try {
      const data: LibraryResponse<KomgaBook> = await this.fetchFromApi<LibraryResponse<KomgaBook>>({
        path: `series/${seriesId}/books`,
        params: { page: "0", size: "1" },
      });
      if (!data.content || data.content.length === 0) {
        throw new AppError(ERROR_CODES.SERIES.NO_BOOKS_FOUND);
      }

      return data.content[0].id;
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération du premier livre");
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async getCover(seriesId: string): Promise<Response> {
    try {
      // Récupérer les préférences de l'utilisateur
      const preferences: UserPreferences = await PreferencesService.getPreferences();

      // Si l'utilisateur préfère les vignettes, utiliser la miniature (streaming)
      if (preferences.showThumbnails) {
        return ImageService.streamImage(`series/${seriesId}/thumbnail`);
      }

      // Sinon, récupérer la première page (streaming)
      const firstBookId = await this.getFirstBook(seriesId);
      return BookService.getPage(firstBookId, 1);
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static getCoverUrl(seriesId: string): string {
    return `/api/komga/images/series/${seriesId}/thumbnail`;
  }

  static async getMultipleSeries(seriesIds: string[]): Promise<KomgaSeries[]> {
    try {
      const seriesPromises: Promise<KomgaSeries>[] = seriesIds.map((id: string) =>
        this.getSeries(id)
      );
      const series: KomgaSeries[] = await Promise.all(seriesPromises);
      return series.filter(Boolean);
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }
}
