import { BaseApiService } from "./base-api.service";
import { Library, LibraryResponse } from "@/types/library";
import { Series } from "@/types/series";

export class LibraryService extends BaseApiService {
  static async getLibraries(): Promise<Library[]> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, "libraries");
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<Library[]>(
        "libraries",
        async () => this.fetchFromApi<Library[]>(url, headers),
        "LIBRARIES"
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les bibliothèques");
    }
  }

  static async getLibrarySeries(
    libraryId: string,
    page: number = 0,
    size: number = 20,
    unreadOnly: boolean = false
  ): Promise<LibraryResponse<Series>> {
    try {
      const config = await this.getKomgaConfig();
      const url = this.buildUrl(config, `libraries/${libraryId}/series`, {
        page: page.toString(),
        size: size.toString(),
        ...(unreadOnly && { read_status: "UNREAD" }),
      });
      const headers = this.getAuthHeaders(config);

      return this.fetchWithCache<LibraryResponse<Series>>(
        `library-${libraryId}-series-${page}-${size}-${unreadOnly}`,
        async () => this.fetchFromApi<LibraryResponse<Series>>(url, headers),
        "SERIES"
      );
    } catch (error) {
      return this.handleError(error, "Impossible de récupérer les séries");
    }
  }
}
