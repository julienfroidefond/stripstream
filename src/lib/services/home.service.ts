import { BaseApiService } from "./base-api.service";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import type { LibraryResponse } from "@/types/library";
import { getServerCacheService } from "./server-cache.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

export interface HomeData {
  ongoing: KomgaSeries[];
  ongoingBooks: KomgaBook[];
  recentlyRead: KomgaBook[];
  onDeck: KomgaBook[];
  latestSeries: KomgaSeries[];
}

export class HomeService extends BaseApiService {
  static async getHomeData(): Promise<HomeData> {
    try {
      const [ongoing, ongoingBooks, recentlyRead, onDeck, latestSeries] = await Promise.all([
        this.fetchWithCache<LibraryResponse<KomgaSeries>>(
          "home-ongoing",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaSeries>>({
              path: "series",
              params: {
                read_status: "IN_PROGRESS",
                sort: "readDate,desc",
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaBook>>(
          "home-ongoing-books",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaBook>>({
              path: "books",
              params: {
                read_status: "IN_PROGRESS",
                sort: "readProgress.readDate,desc",
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaBook>>(
          "home-recently-read",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaBook>>({
              path: "books/latest",
              params: {
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaBook>>(
          "home-on-deck",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaBook>>({
              path: "books/ondeck",
              params: {
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
        this.fetchWithCache<LibraryResponse<KomgaSeries>>(
          "home-latest-series",
          async () =>
            this.fetchFromApi<LibraryResponse<KomgaSeries>>({
              path: "series/latest",
              params: {
                page: "0",
                size: "10",
                media_status: "READY",
              },
            }),
          "HOME"
        ),
      ]);

      return {
        ongoing: ongoing.content || [],
        ongoingBooks: ongoingBooks.content || [], // Nouveau champ
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

  static async invalidateHomeCache(): Promise<void> {
    try {
      const cacheService = await getServerCacheService();
      await cacheService.delete("home-ongoing");
      await cacheService.delete("home-ongoing-books"); // Nouvelle clé de cache
      await cacheService.delete("home-recently-read");
      await cacheService.delete("home-on-deck");
      await cacheService.delete("home-latest-series");
    } catch (error) {
      throw new AppError(ERROR_CODES.CACHE.DELETE_ERROR, {}, error);
    }
  }
}
