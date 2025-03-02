import { BaseApiService } from "./base-api.service";
import type { LibraryResponse } from "@/types/library";
import type { Series } from "@/types/series";
import { getServerCacheService } from "./server-cache.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { KomgaLibrary } from "@/types/komga";

export class LibraryService extends BaseApiService {
  static async getLibraries(): Promise<KomgaLibrary[]> {
    try {
      return this.fetchWithCache<KomgaLibrary[]>(
        "libraries",
        async () => this.fetchFromApi<KomgaLibrary[]>({ path: "libraries" }),
        "LIBRARIES"
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.LIBRARY.FETCH_ERROR, {}, error);
    }
  }

  static async getLibrary(libraryId: string): Promise<KomgaLibrary> {
    try {
      const libraries = await this.getLibraries();
      const library = libraries.find((library) => library.id === libraryId);
      if (!library) {
        throw new AppError(ERROR_CODES.LIBRARY.NOT_FOUND, { libraryId });
      }
      return library;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.LIBRARY.FETCH_ERROR, {}, error);
    }
  }

  static async getAllLibrarySeries(libraryId: string): Promise<Series[]> {
    try {
      const headers = { "Content-Type": "application/json" };

      const searchBody = {
        condition: {
          libraryId: {
            operator: "is",
            value: libraryId,
          },
        },
      };

      const cacheKey = `library-${libraryId}-all-series`;
      const response = await this.fetchWithCache<LibraryResponse<Series>>(
        cacheKey,
        async () =>
          this.fetchFromApi<LibraryResponse<Series>>(
            {
              path: "series/list",
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
        "SERIES"
      );

      return response.content;
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async getLibrarySeries(
    libraryId: string,
    page: number = 0,
    size: number = 20,
    unreadOnly: boolean = false,
    search?: string
  ): Promise<LibraryResponse<Series>> {
    try {
      // Récupérer toutes les séries depuis le cache
      const allSeries = await this.getAllLibrarySeries(libraryId);
      // Filtrer les séries
      let filteredSeries = allSeries;

      if (unreadOnly) {
        filteredSeries = filteredSeries.filter(
          (series) => series.booksReadCount < series.booksCount
        );
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredSeries = filteredSeries.filter((series) =>
          series.metadata.title.toLowerCase().includes(searchLower)
        );
      }

      // Trier les séries
      filteredSeries.sort((a, b) => a.metadata.titleSort.localeCompare(b.metadata.titleSort));

      // Calculer la pagination
      const totalElements = filteredSeries.length;
      const totalPages = Math.ceil(totalElements / size);
      const startIndex = page * size;
      const endIndex = Math.min(startIndex + size, totalElements);
      const paginatedSeries = filteredSeries.slice(startIndex, endIndex);

      // Construire la réponse
      return {
        content: paginatedSeries,
        empty: paginatedSeries.length === 0,
        first: page === 0,
        last: page >= totalPages - 1,
        number: page,
        numberOfElements: paginatedSeries.length,
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

  static async invalidateLibrarySeriesCache(libraryId: string): Promise<void> {
    try {
      const cacheService = await getServerCacheService();
      const cacheKey = `library-${libraryId}-all-series`;
      await cacheService.delete(cacheKey);
    } catch (error) {
      throw new AppError(ERROR_CODES.CACHE.DELETE_ERROR, {}, error);
    }
  }
}
