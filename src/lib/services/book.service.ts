import { BaseApiService } from "./base-api.service";
import type { KomgaBook, KomgaBookWithPages } from "@/types/komga";
import type { ImageResponse } from "./image.service";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { SeriesService } from "./series.service";

export class BookService extends BaseApiService {
  static async getBook(bookId: string): Promise<KomgaBookWithPages> {
    try {
      return this.fetchWithCache<KomgaBookWithPages>(
        `book-${bookId}`,
        async () => {
          // Récupération des détails du tome
          const book = await this.fetchFromApi<KomgaBook>({ path: `books/${bookId}` });

          // Si c'est un EPUB, on ne récupère pas les pages car l'API renvoie une erreur
          if (book.media.mediaProfile === "EPUB") {
            return {
              book,
              pages: [], // Pas de pages pour les EPUB via l'API standard
            };
          }

          // Récupération des pages du tome (uniquement pour les formats image)
          const pages = await this.fetchFromApi<{ number: number }[]>({
            path: `books/${bookId}/pages`,
          });

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
      // D'abord, récupérons les informations du livre pour vérifier s'il s'agit d'un EPUB
      const bookData = await this.fetchFromApi<KomgaBook>({ path: `books/${bookId}` });

      // Si c'est un EPUB ou si le numéro de page est 0 (convention pour récupérer le fichier complet)
      if (bookData.media.mediaProfile === "EPUB" || pageNumber === 0) {
        // Pour les EPUB, on utilise la méthode getEpubFile
        return this.getEpubFile(bookId);
      }

      // Pour les formats image, on continue comme avant
      // Ajuster le numéro de page pour l'API Komga (zero-based)
      const adjustedPageNumber = pageNumber - 1;
      const response: ImageResponse = await ImageService.getImage(
        `books/${bookId}/pages/${adjustedPageNumber}?zero_based=true`
      );
      return new Response(response.buffer, {
        headers: {
          "Content-Type": response.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
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

      // Si l'utilisateur préfère les vignettes, utiliser la miniature
      if (preferences.showThumbnails) {
        const response: ImageResponse = await ImageService.getImage(`books/${bookId}/thumbnail`);
        return new Response(response.buffer, {
          headers: {
            "Content-Type": response.contentType || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
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
      return new Response(response.buffer, {
        headers: {
          "Content-Type": response.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static getCoverUrl(bookId: string): string {
    return `/api/komga/images/books/${bookId}/thumbnail`;
  }

  static async getEpubFile(bookId: string): Promise<Response> {
    try {
      const bookData = await this.fetchFromApi<KomgaBook>({ path: `books/${bookId}` });

      const config = await this.getKomgaConfig();

      const url = this.buildUrl(config, `books/${bookId}/file`);

      const headers = this.getAuthHeaders(config);
      headers.set("Accept", "application/octet-stream");

      const response = await fetch(url, {
        headers,
        method: "GET",
        cache: "no-store", // Désactiver le cache
      });

      if (!response.ok) {
        try {
          const errorText = await response.text();
          console.error(`Erreur: ${response.status} ${response.statusText}`, errorText);
        } catch (e) {
          console.error(`Impossible de lire le corps de l'erreur`);
        }
        throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
      }

      const buffer = await response.arrayBuffer();

      return new Response(buffer, {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `inline; filename="${bookData.name.replace(
            /[^a-z0-9]/gi,
            "_"
          )}.epub"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } catch (error) {
      console.error("Erreur dans getEpubFile:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }
}
