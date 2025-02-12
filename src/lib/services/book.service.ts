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
        "BOOKS"
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer le tome");
    }
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
        throw new Error("Erreur lors de la mise à jour de la progression");
      }
    } catch (error) {
      return this.handleError(error, "Impossible de mettre à jour la progression");
    }
  }

  static getPageUrl(bookId: string, pageNumber: number): string {
    return `/api/komga/books/${bookId}/pages/${pageNumber}`;
  }

  static getThumbnailUrl(bookId: string): string {
    return `/api/komga/images/books/${bookId}/thumbnail`;
  }
}
