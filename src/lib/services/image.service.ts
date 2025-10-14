import { BaseApiService } from "./base-api.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

export interface ImageResponse {
  buffer: Buffer;
  contentType: string | null;
}

export class ImageService extends BaseApiService {
  static async getImage(path: string): Promise<ImageResponse> {
    try {
      const headers = { Accept: "image/jpeg, image/png, image/gif, image/webp, */*" };

      const result = await this.fetchWithCache<ImageResponse>(
        `image-${path}`,
        async () => {
          const response = await this.fetchFromApi<Response>({ path }, headers, { isImage: true });
          const contentType = response.headers.get("content-type");
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          return {
            buffer,
            contentType,
          };
        },
        "IMAGES"
      );

      return result;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'image:", error);
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
