import { BaseApiService } from "./base-api.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import logger from "@/lib/logger";

// Cache HTTP navigateur : 30 jours (immutable car les thumbnails ne changent pas)
const IMAGE_CACHE_MAX_AGE = 2592000;

export class ImageService extends BaseApiService {
  /**
   * Stream an image directly from Komga without buffering in memory
   * Returns a Response that can be directly returned to the client
   */
  static async streamImage(
    path: string,
    cacheMaxAge: number = IMAGE_CACHE_MAX_AGE
  ): Promise<Response> {
    try {
      const headers = { Accept: "image/jpeg, image/png, image/gif, image/webp, */*" };

      const response = await this.fetchFromApi<Response>({ path }, headers, { isImage: true });

      // Stream the response body directly without buffering
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/jpeg",
          "Content-Length": response.headers.get("content-length") || "",
          "Cache-Control": `public, max-age=${cacheMaxAge}, immutable`,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors du streaming de l'image");
      throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, {}, error);
    }
  }

  static getSeriesThumbnailUrl(seriesId: string): string {
    return `/api/komga/images/series/${seriesId}/thumbnail`;
  }

  static getBookThumbnailUrl(bookId: string): string {
    return `/api/komga/images/books/${bookId}/thumbnail`;
  }

  static getBookPageUrl(bookId: string, pageNumber: number): string {
    return `/api/komga/images/books/${bookId}/pages/${pageNumber}`;
  }

  static getBookPageThumbnailUrl(bookId: string, pageNumber: number): string {
    return `/api/komga/images/books/${bookId}/pages/${pageNumber}/thumbnail`;
  }
}
