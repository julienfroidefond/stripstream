import { BaseApiService } from "./base-api.service";
import type { KomgaBook, KomgaBookWithPages, TTLConfig } from "@/types/komga";
import type { ImageResponse } from "./image.service";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { ConfigDBService } from "./config-db.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { SeriesService } from "./series.service";
import type { Series } from "@/types/series";
import logger from "@/lib/logger";

export class BookService extends BaseApiService {
  private static async getImageCacheMaxAge(): Promise<number> {
    try {
      const ttlConfig: TTLConfig | null = await ConfigDBService.getTTLConfig();
      const maxAge = ttlConfig?.imageCacheMaxAge ?? 2592000;
      return maxAge;
    } catch (error) {
      logger.error({ err: error }, '[ImageCache] Error fetching TTL config');
      return 2592000; // 30 jours par défaut en cas d'erreur
    }
  }
  static async getBook(bookId: string): Promise<KomgaBookWithPages> {
    try {
      return this.fetchWithCache<KomgaBookWithPages>(
        `book-${bookId}`,
        async () => {
          // Récupération parallèle des détails du tome et des pages
          const [book, pages] = await Promise.all([
            this.fetchFromApi<KomgaBook>({ path: `books/${bookId}` }),
            this.fetchFromApi<{ number: number }[]>({ path: `books/${bookId}/pages` })
          ]);

          return {
            book,
            pages: pages.map((page: any) => page.number),
          };
        },
        "BOOKS"
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.NOT_FOUND, {}, error);
    }
  }
  public static async getNextBook(bookId: string, seriesId: string): Promise<KomgaBook | null> {
    const books = await SeriesService.getAllSeriesBooks(seriesId);
    const currentIndex = books.findIndex((book) => book.id === bookId);
    return books[currentIndex + 1] || null;
  }

  static async updateReadProgress(
    bookId: string,
    page: number,
    completed: boolean = false
  ): Promise<void> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `books/${bookId}/read-progress`);
      const headers = this.getAuthHeaders(config);
      headers.set("Content-Type", "application/json");

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ page, completed }),
      });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR, {}, error);
    }
  }

  static async deleteReadProgress(bookId: string): Promise<void> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `books/${bookId}/read-progress`);
      const headers = this.getAuthHeaders(config);
      headers.set("Content-Type", "application/json");

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.BOOK.PROGRESS_DELETE_ERROR, {}, error);
    }
  }

  static async getPage(bookId: string, pageNumber: number): Promise<Response> {
    try {
      // Ajuster le numéro de page pour l'API Komga (zero-based)
      const adjustedPageNumber = pageNumber - 1;
      const response: ImageResponse = await ImageService.getImage(
        `books/${bookId}/pages/${adjustedPageNumber}?zero_based=true`
      );
      
      // Convertir le Buffer Node.js en ArrayBuffer proprement
      const arrayBuffer = response.buffer.buffer.slice(
        response.buffer.byteOffset,
        response.buffer.byteOffset + response.buffer.byteLength
      ) as ArrayBuffer;
      
      const maxAge = await this.getImageCacheMaxAge();
      
      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": response.contentType || "image/jpeg",
          "Cache-Control": `public, max-age=${maxAge}, immutable`,
        },
      });
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static async getCover(bookId: string): Promise<Response> {
    try {
      // Récupérer les préférences de l'utilisateur
      const preferences = await PreferencesService.getPreferences();
      const maxAge = await this.getImageCacheMaxAge();

      // Si l'utilisateur préfère les vignettes, utiliser la miniature
      if (preferences.showThumbnails) {
        const response: ImageResponse = await ImageService.getImage(`books/${bookId}/thumbnail`);
        return new Response(response.buffer.buffer as ArrayBuffer, {
          headers: {
            "Content-Type": response.contentType || "image/jpeg",
            "Cache-Control": `public, max-age=${maxAge}, immutable`,
          },
        });
      }

      // Sinon, récupérer la première page
      return this.getPage(bookId, 1);
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static getPageUrl(bookId: string, pageNumber: number): string {
    return `/api/komga/images/books/${bookId}/pages/${pageNumber}`;
  }

  static getPageThumbnailUrl(bookId: string, pageNumber: number): string {
    return `/api/komga/images/books/${bookId}/pages/${pageNumber}/thumbnail`;
  }

  static async getPageThumbnail(bookId: string, pageNumber: number): Promise<Response> {
    try {
      const response: ImageResponse = await ImageService.getImage(
        `books/${bookId}/pages/${pageNumber}/thumbnail?zero_based=true`
      );
      const maxAge = await this.getImageCacheMaxAge();
      
      return new Response(response.buffer.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": response.contentType || "image/jpeg",
          "Cache-Control": `public, max-age=${maxAge}, immutable`,
        },
      });
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static getCoverUrl(bookId: string): string {
    return `/api/komga/images/books/${bookId}/thumbnail`;
  }

  static async getRandomBookFromLibraries(libraryIds: string[]): Promise<string> {
    try {
      if (libraryIds.length === 0) {
        throw new AppError(ERROR_CODES.LIBRARY.NOT_FOUND, { message: "Aucune bibliothèque sélectionnée" });
      }

      const { LibraryService } = await import("./library.service");

      // Essayer d'abord d'utiliser le cache des bibliothèques
      const allSeriesFromCache: Series[] = [];
      
      for (const libraryId of libraryIds) {
        try {
          // Essayer de récupérer les séries depuis le cache (rapide si en cache)
          const series = await LibraryService.getAllLibrarySeries(libraryId);
          allSeriesFromCache.push(...series);
        } catch {
          // Si erreur, on continue avec les autres bibliothèques
        }
      }

      if (allSeriesFromCache.length > 0) {
        // Choisir une série au hasard parmi toutes celles trouvées
        const randomSeriesIndex = Math.floor(Math.random() * allSeriesFromCache.length);
        const randomSeries = allSeriesFromCache[randomSeriesIndex];

        // Récupérer les books de cette série
        const books = await SeriesService.getAllSeriesBooks(randomSeries.id);

        if (books.length > 0) {
          const randomBookIndex = Math.floor(Math.random() * books.length);
          return books[randomBookIndex].id;
        }
      }

      // Si pas de cache, faire une requête légère : prendre une page de séries d'une bibliothèque au hasard
      const randomLibraryIndex = Math.floor(Math.random() * libraryIds.length);
      const randomLibraryId = libraryIds[randomLibraryIndex];
      
      // Récupérer juste une page de séries (pas toutes)
      const seriesResponse = await LibraryService.getLibrarySeries(randomLibraryId, 0, 20);
      
      if (seriesResponse.content.length === 0) {
        throw new AppError(ERROR_CODES.BOOK.NOT_FOUND, { message: "Aucune série trouvée dans les bibliothèques sélectionnées" });
      }

      // Choisir une série au hasard parmi celles récupérées
      const randomSeriesIndex = Math.floor(Math.random() * seriesResponse.content.length);
      const randomSeries = seriesResponse.content[randomSeriesIndex];

      // Récupérer les books de cette série
      const books = await SeriesService.getAllSeriesBooks(randomSeries.id);

      if (books.length === 0) {
        throw new AppError(ERROR_CODES.BOOK.NOT_FOUND, { message: "Aucun livre trouvé dans la série" });
      }

      const randomBookIndex = Math.floor(Math.random() * books.length);
      return books[randomBookIndex].id;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }
}
