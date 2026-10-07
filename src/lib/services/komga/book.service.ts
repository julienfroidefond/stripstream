import { KomgaImageService } from "./image.service";
import { PreferencesService } from "../preferences.service";
import { ERROR_CODES } from "../../../constants/errorCodes";
import { AppError } from "../../../utils/errors";

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
}
