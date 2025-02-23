import { BaseApiService } from "./base-api.service";
import { Library, LibraryResponse } from "@/types/library";
import { Series } from "@/types/series";
import { serverCacheService } from "./server-cache.service";

export class LibraryService extends BaseApiService {
  static async getLibraries(): Promise<Library[]> {
    try {
      return this.fetchWithCache<Library[]>(
        "libraries",
        async () => this.fetchFromApi<Library[]>({ path: "libraries" }),
        "LIBRARIES"
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les bibliothèques");
    }
  }

  static async getLibrary(libraryId: string): Promise<Library> {
    const libraries = await this.getLibraries();
    const library = libraries.find((library) => library.id === libraryId);
    if (!library) {
      throw new Error(`Bibliothèque ${libraryId} non trouvée`);
    }
    return library;
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
      return this.handleError(error, "Impossible de récupérer toutes les séries");
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
      return this.handleError(error, "Impossible de récupérer les séries");
    }
  }

  static async clearLibrarySeriesCache(libraryId: string) {
    serverCacheService.deleteAll(`library-${libraryId}-series`);
  }
}
