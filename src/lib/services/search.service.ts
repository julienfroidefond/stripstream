import type { KomgaBook, KomgaSeries } from "@/types/komga";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { BaseApiService } from "./base-api.service";

interface SearchResponse<T> {
  content: T[];
}

export interface GlobalSearchResult {
  series: KomgaSeries[];
  books: KomgaBook[];
}

export class SearchService extends BaseApiService {
  private static readonly CACHE_TTL = 30;

  static async globalSearch(query: string, limit: number = 6): Promise<GlobalSearchResult> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return { series: [], books: [] };
    }

    const headers = { "Content-Type": "application/json" };
    const searchBody = {
      fullTextSearch: trimmedQuery,
    };

    try {
      const [seriesResponse, booksResponse] = await Promise.all([
        this.fetchFromApi<SearchResponse<KomgaSeries>>(
          { path: "series/list", params: { page: "0", size: String(limit) } },
          headers,
          {
            method: "POST",
            body: JSON.stringify(searchBody),
            revalidate: this.CACHE_TTL,
          }
        ),
        this.fetchFromApi<SearchResponse<KomgaBook>>(
          { path: "books/list", params: { page: "0", size: String(limit) } },
          headers,
          {
            method: "POST",
            body: JSON.stringify(searchBody),
            revalidate: this.CACHE_TTL,
          }
        ),
      ]);

      return {
        series: seriesResponse.content.filter((item) => !item.deleted),
        books: booksResponse.content.filter((item) => !item.deleted),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }
}
