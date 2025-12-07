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

  static async getAllSeriesBooks(seriesId: string): Promise<KomgaBook[]> {
    try {
      const headers = { "Content-Type": "application/json" };

      const searchBody = {
        condition: {
          seriesId: {
            operator: "is",
            value: seriesId,
          },
        },
      };

      const cacheKey = `series-${seriesId}-all-books`;
      const response = await this.fetchWithCache<LibraryResponse<KomgaBook>>(
        cacheKey,
        async () =>
          this.fetchFromApi<LibraryResponse<KomgaBook>>(
            {
              path: "books/list",
              params: {
                size: "1000", // On récupère un maximum de livres
              },
            },
            headers,
            {
              method: "POST",
              body: JSON.stringify(searchBody),
            }
          ),
        "BOOKS"
      );

      if (!response.content.length) {
        throw new AppError(ERROR_CODES.SERIES.NO_BOOKS_FOUND);
      }

      return response.content;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
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
      const condition: Record<string, any> = {
        seriesId: {
          operator: "is",
          value: seriesId,
        },
      };

      // Filtre unread natif Komga (readStatus != READ)
      if (unreadOnly) {
        condition.readStatus = {
          operator: "isNot",
          value: "READ",
        };
      }

      const searchBody = { condition };

      // Pour le filtre unread, on récupère plus d'éléments car on filtre aussi les deleted côté client
      // Estimation : ~10% des livres sont supprimés, donc on récupère légèrement plus
      const fetchSize = unreadOnly ? size : size;

      // Clé de cache incluant tous les paramètres
      const cacheKey = `series-${seriesId}-books-p${page}-s${size}-u${unreadOnly}`;

      const response = await this.fetchWithCache<LibraryResponse<KomgaBook>>(
        cacheKey,
        async () => {
          const params: Record<string, string> = {
            page: String(page),
            size: String(fetchSize),
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

      // Filtrer les livres supprimés côté client (léger)
      let filteredContent = response.content.filter((book: KomgaBook) => !book.deleted);

      // Si on a filtré des livres supprimés, prendre uniquement les `size` premiers
      if (filteredContent.length > size) {
        filteredContent = filteredContent.slice(0, size);
      }

      // Note: Les totaux (totalElements, totalPages) restent ceux de Komga
      // Ils sont approximatifs après filtrage côté client mais fonctionnels pour la pagination
      // Le filtrage côté client est léger (seulement deleted)
      return {
        ...response,
        content: filteredContent,
        numberOfElements: filteredContent.length,
        // Garder totalElements et totalPages de Komga pour la pagination
        // Ils seront légèrement inexacts mais fonctionnels
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
      // Invalider aussi l'ancienne clé pour compatibilité
      await cacheService.delete(`series-${seriesId}-all-books`);
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
