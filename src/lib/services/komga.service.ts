import { KomgaUser, KomgaLibrary, KomgaSeries, KomgaBook, ReadProgress } from "@/types/komga";
import { AuthConfig } from "@/types/auth";
import { storageService } from "./storage.service";

class KomgaService {
  private static instance: KomgaService;

  private constructor() {}

  public static getInstance(): KomgaService {
    if (!KomgaService.instance) {
      KomgaService.instance = new KomgaService();
    }
    return KomgaService.instance;
  }

  /**
   * Crée les headers d'authentification
   */
  private getAuthHeaders(config?: AuthConfig): Headers {
    const headers = new Headers();
    const credentials = config || storageService.getCredentials();

    if (credentials?.credentials) {
      const { username, password } = credentials.credentials;
      headers.set("Authorization", `Basic ${btoa(`${username}:${password}`)}`);
    }

    return headers;
  }

  /**
   * Vérifie les credentials en récupérant l'utilisateur courant
   */
  async checkCredentials(config: AuthConfig): Promise<KomgaUser> {
    const response = await fetch(`${config.serverUrl}/api/v1/libraries`, {
      headers: this.getAuthHeaders(config),
    });

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    return response.json();
  }

  /**
   * Récupère les bibliothèques
   */
  async getLibraries(): Promise<KomgaLibrary[]> {
    const credentials = storageService.getCredentials();
    if (!credentials) throw new Error("Not authenticated");

    const response = await fetch(`${credentials.serverUrl}/api/v1/libraries`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch libraries");
    }

    return response.json();
  }

  /**
   * Récupère l'URL de la couverture d'une bibliothèque
   */
  getLibraryThumbnailUrl(libraryId: string): string {
    const credentials = storageService.getCredentials();
    if (!credentials) throw new Error("Not authenticated");

    return `${credentials.serverUrl}/api/v1/libraries/${libraryId}/thumbnail`;
  }

  /**
   * Récupère les séries d'une bibliothèque
   */
  async getLibrarySeries(libraryId: string): Promise<KomgaSeries[]> {
    const credentials = storageService.getCredentials();
    if (!credentials) throw new Error("Not authenticated");

    const response = await fetch(`${credentials.serverUrl}/api/v1/libraries/${libraryId}/series`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch series");
    }

    return response.json();
  }

  /**
   * Récupère les livres d'une série
   */
  async getSeriesBooks(seriesId: string): Promise<KomgaBook[]> {
    const credentials = storageService.getCredentials();
    if (!credentials) throw new Error("Not authenticated");

    const response = await fetch(`${credentials.serverUrl}/api/v1/series/${seriesId}/books`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch books");
    }

    return response.json();
  }

  /**
   * Récupère l'URL de la couverture d'un livre
   */
  getBookThumbnailUrl(bookId: string): string {
    const credentials = storageService.getCredentials();
    if (!credentials) throw new Error("Not authenticated");

    return `${credentials.serverUrl}/api/v1/books/${bookId}/thumbnail`;
  }

  /**
   * Récupère l'URL de lecture d'un livre
   */
  getBookReadingUrl(bookId: string): string {
    const credentials = storageService.getCredentials();
    if (!credentials) throw new Error("Not authenticated");

    return `${credentials.serverUrl}/api/v1/books/${bookId}/pages/1`;
  }

  /**
   * Récupère la progression de lecture d'une série
   */
  async getSeriesReadProgress(seriesId: string): Promise<ReadProgress> {
    const credentials = storageService.getCredentials();
    if (!credentials) throw new Error("Not authenticated");

    const response = await fetch(
      `${credentials.serverUrl}/api/v1/series/${seriesId}/read-progress`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch series read progress");
    }

    return response.json();
  }
}

export const komgaService = KomgaService.getInstance();
