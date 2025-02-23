import { BaseApiService } from "./base-api.service";

interface ImageResponse {
  buffer: Buffer;
  contentType: string | null;
}

export class ImageService extends BaseApiService {
  static async getImage(path: string): Promise<ImageResponse> {
    try {
      const headers = { Accept: "image/jpeg, image/png, image/gif, image/webp, */*" };

      return this.fetchWithCache<ImageResponse>(
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
    } catch (error) {
      console.error("Erreur lors de la récupération de l'image:", error);
      return this.handleError(error, "Impossible de récupérer l'image");
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
