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
                size: "5000", // On récupère un maximum de livres
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
      const headers = { "Content-Type": "application/json" };

      // Construction du body de recherche pour Komga
      const condition: Record<string, any> = {
        libraryId: {
          operator: "is",
          value: libraryId,
        },
      };

      const searchBody = { condition };

      // Pour le filtre unread, on récupère plus d'éléments car on filtre côté client
      // Estimation : ~50% des séries sont unread, donc on récupère 2x pour être sûr
      const fetchSize = unreadOnly ? size * 2 : size;

      // Clé de cache incluant tous les paramètres
      const cacheKey = `library-${libraryId}-series-p${page}-s${size}-u${unreadOnly}-q${
        search || ""
      }`;

      const response = await this.fetchWithCache<LibraryResponse<Series>>(
        cacheKey,
        async () => {
          const params: Record<string, string> = {
            page: String(page),
            size: String(fetchSize),
            sort: "metadata.titleSort,asc",
          };

          // Filtre de recherche Komga (recherche dans le titre)
          if (search) {
            params.search = search;
          }

          return this.fetchFromApi<LibraryResponse<Series>>(
            { path: "series/list", params },
            headers,
            {
              method: "POST",
              body: JSON.stringify(searchBody),
            }
          );
        },
        "SERIES"
      );

      // Filtrer les séries supprimées côté client (léger)
      let filteredContent = response.content.filter((series) => !series.deleted);

      // Filtre unread côté client (Komga n'a pas de filtre natif pour booksReadCount < booksCount)
      if (unreadOnly) {
        filteredContent = filteredContent.filter(
          (series) => series.booksReadCount < series.booksCount
        );
        // Prendre uniquement les `size` premiers après filtrage
        filteredContent = filteredContent.slice(0, size);
      }

      // Note: Les totaux (totalElements, totalPages) restent ceux de Komga
      // Ils sont approximatifs après filtrage côté client mais fonctionnels pour la pagination
      // Le filtrage côté client est léger (seulement deleted + unread)
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

  static async invalidateLibrarySeriesCache(libraryId: string): Promise<void> {
    try {
      const cacheService = await getServerCacheService();
      // Invalider toutes les clés de cache pour cette bibliothèque
      // Format: library-{id}-series-p{page}-s{size}-u{unread}-q{search}
      await cacheService.deleteAll(`library-${libraryId}-series-`);
      // Invalider aussi l'ancienne clé pour compatibilité
      await cacheService.delete(`library-${libraryId}-all-series`);
    } catch (error) {
      throw new AppError(ERROR_CODES.CACHE.DELETE_ERROR, {}, error);
    }
  }

  static async scanLibrary(libraryId: string, deep: boolean = false): Promise<void> {
    try {
      await this.fetchFromApi(
        {
          path: `libraries/${libraryId}/scan`,
          params: { deep: String(deep) },
        },
        {},
        { method: "POST", noJson: true }
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.LIBRARY.SCAN_ERROR, { libraryId }, error);
    }
  }
}
