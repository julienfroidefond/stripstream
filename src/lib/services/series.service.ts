import { BaseApiService } from "./base-api.service";
import type { LibraryResponse } from "@/types/library";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import { BookService } from "./book.service";
import type { ImageResponse } from "./image.service";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { getServerCacheService } from "./server-cache.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { UserPreferences } from "@/types/preferences";
import type { ServerCacheService } from "./server-cache.service";

export class SeriesService extends BaseApiService {
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
      // Récupérer tous les livres depuis le cache
      const allBooks: KomgaBook[] = await this.getAllSeriesBooks(seriesId);

      // Filtrer les livres
      let filteredBooks = allBooks;

      // Filtrer les livres supprimés (fichiers manquants sur le filesystem)
      filteredBooks = filteredBooks.filter((book: KomgaBook) => !book.deleted);

      if (unreadOnly) {
        filteredBooks = filteredBooks.filter(
          (book: KomgaBook) => !book.readProgress || !book.readProgress.completed
        );
      }

      // Trier les livres par numéro
      filteredBooks.sort((a: KomgaBook, b: KomgaBook) => a.number - b.number);

      // Calculer la pagination
      const totalElements = filteredBooks.length;
      const totalPages = Math.ceil(totalElements / size);
      const startIndex = page * size;
      const endIndex = Math.min(startIndex + size, totalElements);
      const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

      // Construire la réponse
      return {
        content: paginatedBooks,
        empty: paginatedBooks.length === 0,
        first: page === 0,
        last: page >= totalPages - 1,
        number: page,
        numberOfElements: paginatedBooks.length,
        pageable: {
          offset: startIndex,
          pageNumber: page,
          pageSize: size,
          paged: true,
          sort: {
            empty: false,
            sorted: true,
            unsorted: false,
          },
          unpaged: false,
        },
        size,
        sort: {
          empty: false,
          sorted: true,
          unsorted: false,
        },
        totalElements,
        totalPages,
      };
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async invalidateSeriesBooksCache(seriesId: string): Promise<void> {
    const cacheService: ServerCacheService = await getServerCacheService();
    await cacheService.delete(`series-${seriesId}-all-books`);
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
      console.error("Erreur lors de la récupération du premier livre:", error);
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async getCover(seriesId: string): Promise<Response> {
    try {
      // Récupérer les préférences de l'utilisateur
      const preferences: UserPreferences = await PreferencesService.getPreferences();

      // Si l'utilisateur préfère les vignettes, utiliser la miniature
      if (preferences.showThumbnails) {
        const response: ImageResponse = await ImageService.getImage(`series/${seriesId}/thumbnail`);
        return new Response(response.buffer.buffer as ArrayBuffer, {
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
