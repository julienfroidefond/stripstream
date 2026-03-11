import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

export class BookService {
  static async getPage(bookId: string, pageNumber: number): Promise<Response> {
    try {
      const adjustedPageNumber = pageNumber - 1;
      return ImageService.streamImage(
        `books/${bookId}/pages/${adjustedPageNumber}?zero_based=true`
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static async getCover(bookId: string): Promise<Response> {
    try {
      const preferences = await PreferencesService.getPreferences();
      if (preferences.showThumbnails) {
        return ImageService.streamImage(`books/${bookId}/thumbnail`);
      }
      return this.getPage(bookId, 1);
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }

  static async getPageThumbnail(bookId: string, pageNumber: number): Promise<Response> {
    try {
      return ImageService.streamImage(
        `books/${bookId}/pages/${pageNumber}/thumbnail?zero_based=true`
      );
    } catch (error) {
      throw new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR, {}, error);
    }
  }
}
