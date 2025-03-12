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
        console.error("Erreur lors de la mise à jour de la progression:", response.body);
        const errorText = await response.text();
        console.error("Erreur lors de la mise à jour de la progression:", errorText);
        throw new AppError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la progression:", error);
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

  static async getEpubPositions(bookId: string): Promise<any> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `books/${bookId}/positions`);
      const headers = this.getAuthHeaders(config);

      // Ajouter l'en-tête Accept spécifique requis par l'API Komga
      headers.set("Accept", "application/vnd.readium.position-list+json");

      console.log("Récupération des positions EPUB:", url);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        console.error("Erreur lors de la récupération des positions EPUB:", response.status);
        const errorText = await response.text();
        console.error("Détails de l'erreur:", errorText);
        throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
      }

      const positions = await response.json();
      console.log(
        "Positions EPUB brutes reçues:",
        JSON.stringify(positions).substring(0, 200) + "..."
      );

      // Vérifier si les positions sont dans un format attendu
      if (positions && Array.isArray(positions)) {
        console.log("Format détecté: tableau de positions");
        return { positions };
      } else if (positions && positions.positions && Array.isArray(positions.positions)) {
        console.log("Format détecté: objet avec propriété positions");
        return positions;
      } else {
        console.warn("Format de positions inconnu:", positions);
        // Retourner un format par défaut pour éviter les erreurs
        return { positions: [] };
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des positions EPUB:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static async updateEpubProgression(
    bookId: string,
    progression: number,
    position: number = 0,
    href: string = "OEBPS/Page_1.html",
    modified: string = new Date().toISOString(),
    deviceId: string = "unused",
    deviceName: string = "StripStream Web Reader"
  ): Promise<void> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `books/${bookId}/progression`);
      const headers = this.getAuthHeaders(config);
      headers.set("Content-Type", "application/json");

      // Créer l'objet de progression avec le format exact qui fonctionne
      const progressionData = {
        device: {
          id: deviceId,
          name: deviceName,
        },
        locator: {
          href: href,
          type: "application/xhtml+xml",
          locations: {
            fragment: [],
            progression: 0,
            position: position,
            totalProgression: progression,
          },
        },
        modified: modified,
      };

      console.log("Envoi de la progression EPUB:", progressionData);

      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(progressionData),
      });

      if (!response.ok) {
        console.error("Erreur lors de la mise à jour de la progression EPUB:", response.status);
        const errorText = await response.text();
        console.error("Détails de l'erreur:", errorText);
        throw new AppError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la progression EPUB:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR, {}, error);
    }
  }
}
