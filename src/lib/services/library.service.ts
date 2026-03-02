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

type KomgaCondition = Record<string, unknown>;

const sortSeriesDeterministically = <T extends { id: string; metadata?: { titleSort?: string } }>(
  items: T[]
): T[] => {
  return [...items].sort((a, b) => {
    const titleA = a.metadata?.titleSort ?? "";
    const titleB = b.metadata?.titleSort ?? "";
    const titleComparison = titleA.localeCompare(titleB);

    if (titleComparison !== 0) {
      return titleComparison;
    }

    return a.id.localeCompare(b.id);
  });
};

export const LIBRARY_SERIES_CACHE_TAG = "library-series";

export class LibraryService extends BaseApiService {
  private static readonly CACHE_TTL = 300; // 5 minutes

  static async getLibraries(): Promise<KomgaLibrary[]> {
    try {
      const libraries = await this.fetchFromApi<KomgaLibraryRaw[]>(
        { path: "libraries" },
        {},
        { revalidate: this.CACHE_TTL }
      );

      // Enrich each library with book counts (parallel requests)
      const enrichedLibraries = await Promise.all(
        libraries.map(async (library) => {
          try {
            const booksResponse = await this.fetchFromApi<{ totalElements: number }>(
              {
                path: "books",
                params: { library_id: library.id, size: "0" },
              },
              {},
              { revalidate: this.CACHE_TTL }
            );
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
      let condition: KomgaCondition;

      if (unreadOnly) {
        condition = {
          allOf: [
            { libraryId: { operator: "is", value: libraryId } },
            {
              anyOf: [
                { readStatus: { operator: "is", value: "UNREAD" } },
                { readStatus: { operator: "is", value: "IN_PROGRESS" } },
              ],
            },
          ],
        };
      } else {
        condition = { libraryId: { operator: "is", value: libraryId } };
      }

      const searchBody: { condition: KomgaCondition; fullTextSearch?: string } = { condition };

      const params: Record<string, string | string[]> = {
        page: String(page),
        size: String(size),
        sort: "metadata.titleSort,asc",
      };

      if (search) {
        searchBody.fullTextSearch = search;
      }

      const response = await this.fetchFromApi<LibraryResponse<Series>>(
        { path: "series/list", params },
        headers,
        {
          method: "POST",
          body: JSON.stringify(searchBody),
          revalidate: this.CACHE_TTL,
          tags: [LIBRARY_SERIES_CACHE_TAG],
        }
      );

      const filteredContent = response.content.filter((series) => !series.deleted);
      const sortedContent = sortSeriesDeterministically(filteredContent);

      return {
        ...response,
        content: sortedContent,
        numberOfElements: sortedContent.length,
      };
    } catch (error) {
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }

  static async scanLibrary(libraryId: string, deep: boolean = false): Promise<void> {
    try {
      await this.fetchFromApi(
        { path: `libraries/${libraryId}/scan`, params: { deep: String(deep) } },
        {},
        { method: "POST", noJson: true, revalidate: 0 } // bypass cache on mutations
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.LIBRARY.SCAN_ERROR, { libraryId }, error);
    }
  }
}
