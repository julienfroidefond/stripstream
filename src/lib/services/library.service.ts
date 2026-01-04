import { BaseApiService } from "./base-api.service";
import type { LibraryResponse } from "@/types/library";
import type { Series } from "@/types/series";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { KomgaLibrary } from "@/types/komga";

// Raw library type from Komga API (without booksCount)
interface KomgaLibraryRaw {
  id: string;
  name: string;
  root: string;
  unavailable: boolean;
}

export class LibraryService extends BaseApiService {
  static async getLibraries(): Promise<KomgaLibrary[]> {
    try {
      const libraries = await this.fetchFromApi<KomgaLibraryRaw[]>({ path: "libraries" });

      // Enrich each library with book counts
      const enrichedLibraries = await Promise.all(
        libraries.map(async (library) => {
          try {
            const booksResponse = await this.fetchFromApi<{ totalElements: number }>({
              path: "books",
              params: { library_id: library.id, size: "0" },
            });
            return {
              ...library,
              importLastModified: "",
              lastModified: "",
              booksCount: booksResponse.totalElements,
              booksReadCount: 0,
            } as KomgaLibrary;
          } catch {
            return {
              ...library,
              importLastModified: "",
              lastModified: "",
              booksCount: 0,
              booksReadCount: 0,
            } as KomgaLibrary;
          }
        })
      );

      return enrichedLibraries;
    } catch (error) {
      throw new AppError(ERROR_CODES.LIBRARY.FETCH_ERROR, {}, error);
    }
  }

  static async getLibrary(libraryId: string): Promise<KomgaLibrary> {
    try {
      return this.fetchFromApi<KomgaLibrary>({ path: `libraries/${libraryId}` });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.LIBRARY.FETCH_ERROR, {}, error);
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
      let condition: any;

      if (unreadOnly) {
        // Utiliser allOf pour combiner libraryId avec anyOf pour UNREAD ou IN_PROGRESS
        condition = {
          allOf: [
            {
              libraryId: {
                operator: "is",
                value: libraryId,
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
          libraryId: {
            operator: "is",
            value: libraryId,
          },
        };
      }

      const searchBody = { condition };

      const params: Record<string, string | string[]> = {
        page: String(page),
        size: String(size),
        sort: "metadata.titleSort,asc",
      };

      // Filtre de recherche Komga (recherche dans le titre)
      if (search) {
        params.search = search;
      }

      const response = await this.fetchFromApi<LibraryResponse<Series>>(
        { path: "series/list", params },
        headers,
        {
          method: "POST",
          body: JSON.stringify(searchBody),
        }
      );

      // Filtrer uniquement les séries supprimées côté client (léger)
      const filteredContent = response.content.filter((series) => !series.deleted);

      return {
        ...response,
        content: filteredContent,
        numberOfElements: filteredContent.length,
      };
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
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
