import { BaseApiService } from "./base-api.service";

interface ImageResponse {
  buffer: Buffer;
  contentType: string | null;
}

export class ImageService extends BaseApiService {
  static async getImage(path: string): Promise<ImageResponse> {
    try {
      const config = await this.getKomgaConfig();
      const url = `${config.serverUrl}${path}`;
      const headers = this.getAuthHeaders(config);

      // Ajout des headers pour accepter les images
      headers.set("Accept", "image/jpeg, image/png, image/gif, image/webp, */*");

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      // Récupérer le type MIME de l'image
      const contentType = response.headers.get("content-type");

      // Convertir la réponse en buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        buffer,
        contentType,
      };
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
    return `/api/komga/books/${bookId}/pages/${pageNumber}`;
  }
}
