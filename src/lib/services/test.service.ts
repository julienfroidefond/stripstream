import { BaseApiService } from "./base-api.service";
import { AuthConfig } from "@/types/auth";
import { KomgaLibrary } from "@/types/komga";

export class TestService extends BaseApiService {
  static async testConnection(config: AuthConfig): Promise<{ libraries: KomgaLibrary[] }> {
    try {
      const url = this.buildUrl(config, "libraries");
      const headers = this.getAuthHeaders(config);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erreur lors du test de connexion");
      }

      const libraries = await response.json();
      return { libraries };
    } catch (error) {
      console.error("Erreur lors du test de connexion:", error);
      if (error instanceof Error && error.message.includes("fetch")) {
        throw new Error(
          "Impossible de se connecter au serveur. Vérifiez l'URL et que le serveur est accessible."
        );
      }
      throw error instanceof Error ? error : new Error("Erreur lors du test de connexion");
    }
  }
}
