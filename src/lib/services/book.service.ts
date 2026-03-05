import { BaseApiService } from "./base-api.service";
import type { KomgaBook, KomgaBookWithPages } from "@/types/komga";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

type ErrorWithStatusParams = AppError & { params?: { status?: number } };

export class BookService extends BaseApiService {
  private static readonly CACHE_TTL = 60; // 1 minute

  static async getBook(bookId: string): Promise<KomgaBookWithPages> {
    try {
      // Récupération parallèle des détails du tome et des pages
      const [book, pages] = await Promise.all([
        this.fetchFromApi<KomgaBook>(
          { path: `books/${bookId}` },
          {},
          { revalidate: this.CACHE_TTL }
        ),
        this.fetchFromApi<{ number: number }[]>(
          { path: `books/${bookId}/pages` },
          {},
          { revalidate: this.CACHE_TTL }
        ),
      ]);

      return {
        book,
        pages: pages.map((page) => page.number),
      };
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.NOT_FOUND, {}, error);
    }
  }

  public static async getNextBook(bookId: string, _seriesId: string): Promise<KomgaBook | null> {
    try {
      // Utiliser l'endpoint natif Komga pour obtenir le livre suivant
      return await this.fetchFromApi<KomgaBook>({ path: `books/${bookId}/next` });
    } catch (error) {
      // Si le livre suivant n'existe pas, Komga retourne 404
      // On retourne null dans ce cas
      if (
        error instanceof AppError &&
        error.code === ERROR_CODES.KOMGA.HTTP_ERROR &&
        (error as ErrorWithStatusParams).params?.status === 404
      ) {
        return null;
      }
      // Pour les autres erreurs, on les propage
      throw error;
    }
  }

  static async getBookSeriesId(bookId: string): Promise<string> {
    try {
      const book = await this.fetchFromApi<KomgaBook>(
        { path: `books/${bookId}` },
        {},
        { revalidate: this.CACHE_TTL }
      );
      return book.seriesId;
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.NOT_FOUND, {}, error);
    }
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
      // Stream directement sans buffer en mémoire
      return ImageService.streamImage(
        `books/${bookId}/pages/${adjustedPageNumber}?zero_based=true`
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static async getCover(bookId: string): Promise<Response> {
    try {
      // Récupérer les préférences de l'utilisateur
      const preferences = await PreferencesService.getPreferences();

      // Si l'utilisateur préfère les vignettes, utiliser la miniature (streaming)
      if (preferences.showThumbnails) {
        return ImageService.streamImage(`books/${bookId}/thumbnail`);
      }

      // Sinon, récupérer la première page (streaming)
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
      // Stream directement sans buffer en mémoire
      return ImageService.streamImage(
        `books/${bookId}/pages/${pageNumber}/thumbnail?zero_based=true`
      );
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
        throw new AppError(ERROR_CODES.LIBRARY.NOT_FOUND, {
          message: "Aucune bibliothèque sélectionnée",
        });
      }

      // Use books/list directly with library filter to avoid extra series/list call
      const randomLibraryIndex = Math.floor(Math.random() * libraryIds.length);
      const randomLibraryId = libraryIds[randomLibraryIndex];

      // Random page offset for variety (assuming most libraries have at least 100 books)
      const randomPage = Math.floor(Math.random() * 5); // Pages 0-4

      const searchBody = {
        condition: {
          libraryId: {
            operator: "is",
            value: randomLibraryId,
          },
        },
      };

      const booksResponse = await this.fetchFromApi<{
        content: KomgaBook[];
        totalElements: number;
      }>(
        {
          path: "books/list",
          params: { page: String(randomPage), size: "20", sort: "metadata.numberSort,asc" },
        },
        { "Content-Type": "application/json" },
        { method: "POST", body: JSON.stringify(searchBody) }
      );

      if (booksResponse.content.length === 0) {
        // Fallback to page 0 if random page was empty
        const fallbackResponse = await this.fetchFromApi<{
          content: KomgaBook[];
          totalElements: number;
        }>(
          {
            path: "books/list",
            params: { page: "0", size: "20", sort: "metadata.numberSort,asc" },
          },
          { "Content-Type": "application/json" },
          { method: "POST", body: JSON.stringify(searchBody) }
        );

        if (fallbackResponse.content.length === 0) {
          throw new AppError(ERROR_CODES.BOOK.NOT_FOUND, {
            message: "Aucun livre trouvé dans les bibliothèques sélectionnées",
          });
        }

        const randomBookIndex = Math.floor(Math.random() * fallbackResponse.content.length);
        return fallbackResponse.content[randomBookIndex].id;
      }

      const randomBookIndex = Math.floor(Math.random() * booksResponse.content.length);
      return booksResponse.content[randomBookIndex].id;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }
}
