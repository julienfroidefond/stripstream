import { BaseApiService } from "./base-api.service";
import type { LibraryResponse } from "@/types/library";
import type { KomgaBook, KomgaSeries, TTLConfig } from "@/types/komga";
import { BookService } from "./book.service";
import type { ImageResponse } from "./image.service";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { ConfigDBService } from "./config-db.service";
import { getServerCacheService } from "./server-cache.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import type { ServerCacheService } from "./server-cache.service";
import logger from "@/lib/logger";

export class SeriesService extends BaseApiService {
  private static async getImageCacheMaxAge(): Promise<number> {
    try {
      const ttlConfig: TTLConfig | null = await ConfigDBService.getTTLConfig();
      const maxAge = ttlConfig?.imageCacheMaxAge ?? 2592000;
      return maxAge;
    } catch (error) {
      logger.error({ err: error }, "[ImageCache] Error fetching TTL config");
      return 2592000; // 30 jours par défaut en cas d'erreur
    }
  }
  static async getSeries(seriesId: string): Promise<KomgaSeries> {
    try {
      return this.fetchWithCache<KomgaSeries>(
        `series-${seriesId}`,
        async () => this.fetchFromApi<KomgaSeries>({ path: `series/${seriesId}` }),
        "SERIES"
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async invalidateSeriesCache(seriesId: string): Promise<void> {
    try {
      const cacheService = await getServerCacheService();
      await cacheService.delete(`series-${seriesId}`);
    } catch (error) {
      throw new AppError(ERROR_CODES.CACHE.DELETE_ERROR, {}, error);
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

      // Clé de cache incluant tous les paramètres
      const cacheKey = `series-${seriesId}-books-p${page}-s${size}-u${unreadOnly}`;

      const response = await this.fetchWithCache<LibraryResponse<KomgaBook>>(
        cacheKey,
        async () => {
          const params: Record<string, string | string[]> = {
            page: String(page),
            size: String(size),
            sort: "number,asc",
          };

          return this.fetchFromApi<LibraryResponse<KomgaBook>>(
            { path: "books/list", params },
            headers,
            {
              method: "POST",
              body: JSON.stringify(searchBody),
            }
          );
        },
        "BOOKS"
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

  static async invalidateSeriesBooksCache(seriesId: string): Promise<void> {
    try {
      const cacheService: ServerCacheService = await getServerCacheService();
      // Invalider toutes les clés de cache pour cette série
      // Format: series-{id}-books-p{page}-s{size}-u{unread}
      await cacheService.deleteAll(`series-${seriesId}-books-`);
    } catch (error) {
      throw new AppError(ERROR_CODES.CACHE.DELETE_ERROR, {}, error);
    }
  }

  static async getFirstBook(seriesId: string): Promise<string> {
    try {
      return this.fetchWithCache<string>(
        `series-first-book-${seriesId}`,
        async () => {
          const data: LibraryResponse<KomgaBook> = await this.fetchFromApi<
            LibraryResponse<KomgaBook>
          >({
            path: `series/${seriesId}/books`,
            params: { page: "0", size: "1" },
          });
          if (!data.content || data.content.length === 0) {
            throw new AppError(ERROR_CODES.SERIES.NO_BOOKS_FOUND);
          }

          return data.content[0].id;
        },
        "SERIES"
      );
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération du premier livre");
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async getCover(seriesId: string): Promise<Response> {
    try {
      // Récupérer les préférences de l'utilisateur
      const preferences: UserPreferences = await PreferencesService.getPreferences();
      const maxAge = await this.getImageCacheMaxAge();

      // Si l'utilisateur préfère les vignettes, utiliser la miniature
      if (preferences.showThumbnails) {
        const response: ImageResponse = await ImageService.getImage(`series/${seriesId}/thumbnail`);
        return new Response(response.buffer.buffer as ArrayBuffer, {
          headers: {
            "Content-Type": response.contentType || "image/jpeg",
            "Cache-Control": `public, max-age=${maxAge}, immutable`,
          },
        });
      }

      // Sinon, récupérer la première page
      const firstBookId = await this.getFirstBook(seriesId);
      const response = await BookService.getPage(firstBookId, 1);
      return response;
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
