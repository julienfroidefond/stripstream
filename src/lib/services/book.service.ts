import { BaseApiService } from "./base-api.service";
import { KomgaBook } from "@/types/komga";

export class BookService extends BaseApiService {
  static async getBook(bookId: string): Promise<{ book: KomgaBook; pages: number[] }> {
    try {
      const config = await this.getKomgaConfig();
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<{ book: KomgaBook; pages: number[] }>(
        `book-${bookId}`,
        async () => {
          // Récupération des détails du tome
          const bookResponse = await fetch(this.buildUrl(config, `books/${bookId}`), { headers });
          if (!bookResponse.ok) {
            throw new Error("Erreur lors de la récupération des détails du tome");
          }
          const book = await bookResponse.json();

          // Récupération des pages du tome
          const pagesResponse = await fetch(this.buildUrl(config, `books/${bookId}/pages`), {
            headers,
          });
          if (!pagesResponse.ok) {
            throw new Error("Erreur lors de la récupération des pages du tome");
          }
          const pages = await pagesResponse.json();

          return {
            book,
            pages: pages.map((page: any) => page.number),
          };
        },
        5 * 60 // Cache de 5 minutes
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer le tome");
    }
  }

  static getPageUrl(bookId: string, pageNumber: number): string {
    return `/api/komga/books/${bookId}/pages/${pageNumber}`;
  }

  static getThumbnailUrl(bookId: string): string {
    return `/api/komga/images/books/${bookId}/thumbnail`;
  }
}
