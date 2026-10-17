import { KomgaImageService } from "./image.service";
import { PreferencesService } from "../preferences.service";
import { ConfigDBService } from "../config-db.service";
import { ERROR_CODES } from "../../../constants/errorCodes";
import { AppError } from "../../../utils/errors";
import { codeForHttpStatus } from "@/utils/http-error";
import logger from "@/lib/logger";

const KOMGA_FILE_HTTP_CODES = {
  UNAUTHORIZED: ERROR_CODES.KOMGA.UNAUTHORIZED,
  FORBIDDEN: ERROR_CODES.KOMGA.FORBIDDEN,
  NOT_FOUND: ERROR_CODES.KOMGA.NOT_FOUND,
  SERVER_ERROR: ERROR_CODES.KOMGA.SERVER_ERROR,
  HTTP_ERROR: ERROR_CODES.KOMGA.HTTP_ERROR,
};

/**
 * Couverture d'un livre côté Komga : utilise la thumbnail si l'utilisateur l'a
 * activée dans ses préférences, sinon stream la première page. Les URL Komga
 * triviales (page X, thumbnail page X) sont construites directement dans les
 * routes via `KomgaImageService.streamImage`.
 */
export class KomgaBookService {
  static async getCover(bookId: string, conditionalHeaders?: HeadersInit): Promise<Response> {
    try {
      const preferences = await PreferencesService.getPreferences();
      if (preferences.showThumbnails) {
        return KomgaImageService.streamImage(`books/${bookId}/thumbnail`, undefined, conditionalHeaders);
      }
      // Première page (zero_based=true → page 0 = première)
      return KomgaImageService.streamImage(`books/${bookId}/pages/0?zero_based=true`, undefined, conditionalHeaders);
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  /**
   * Ouvre un flux sur le fichier source d'un livre Komga (`/api/v1/books/{id}/file`).
   * Le corps est relayé tel quel par la route ; on garde donc les erreurs
   * status-aware (404 fichier absent) au lieu de les aplatir.
   */
  static async streamFile(bookId: string): Promise<Response> {
    try {
      const config = await ConfigDBService.getConfig();
      if (!config) throw new AppError(ERROR_CODES.KOMGA.MISSING_CONFIG);

      const url = new URL(`${config.url}/api/v1/books/${bookId}/file`).toString();
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${config.authHeader}` },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new AppError(codeForHttpStatus(response.status, KOMGA_FILE_HTTP_CODES), {
          status: response.status,
          statusText: response.statusText,
        });
      }

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.warn({ err: error, bookId }, "Komga book file request failed");
      throw new AppError(ERROR_CODES.KOMGA.CONNECTION_ERROR, {}, error);
    }
  }
}
