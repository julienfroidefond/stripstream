import { BaseApiService } from "./base-api.service";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import type { LibraryResponse } from "@/types/library";
import type { HomeData } from "@/types/home";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

export type { HomeData };

export class HomeService extends BaseApiService {
  private static readonly CACHE_TTL = 120; // 2 minutes

  static async getHomeData(): Promise<HomeData> {
    try {
      const [ongoing, ongoingBooks, recentlyRead, onDeck, latestSeries] = await Promise.all([
        this.fetchFromApi<LibraryResponse<KomgaSeries>>(
          {
            path: "series",
            params: {
              read_status: "IN_PROGRESS",
              sort: "readDate,desc",
              page: "0",
              size: "10",
              media_status: "READY",
            },
          },
          {},
          { revalidate: this.CACHE_TTL }
        ),
        this.fetchFromApi<LibraryResponse<KomgaBook>>(
          {
            path: "books",
            params: {
              read_status: "IN_PROGRESS",
              sort: "readProgress.readDate,desc",
              page: "0",
              size: "10",
              media_status: "READY",
            },
          },
          {},
          { revalidate: this.CACHE_TTL }
        ),
        this.fetchFromApi<LibraryResponse<KomgaBook>>(
          {
            path: "books/latest",
            params: {
              page: "0",
              size: "10",
              media_status: "READY",
            },
          },
          {},
          { revalidate: this.CACHE_TTL }
        ),
        this.fetchFromApi<LibraryResponse<KomgaBook>>(
          {
            path: "books/ondeck",
            params: {
              page: "0",
              size: "10",
              media_status: "READY",
            },
          },
          {},
          { revalidate: this.CACHE_TTL }
        ),
        this.fetchFromApi<LibraryResponse<KomgaSeries>>(
          {
            path: "series/latest",
            params: {
              page: "0",
              size: "10",
              media_status: "READY",
            },
          },
          {},
          { revalidate: this.CACHE_TTL }
        ),
      ]);

      return {
        ongoing: ongoing.content || [],
        ongoingBooks: ongoingBooks.content || [],
        recentlyRead: recentlyRead.content || [],
        onDeck: onDeck.content || [],
        latestSeries: latestSeries.content || [],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.HOME.FETCH_ERROR, {}, error);
    }
  }
}
