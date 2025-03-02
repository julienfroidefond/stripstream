import { BaseApiService } from "./base-api.service";
import type { AuthConfig } from "@/types/auth";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { KomgaLibrary } from "@/types/komga";

export class TestService extends BaseApiService {
  static async testConnection(config: AuthConfig): Promise<{ libraries: KomgaLibrary[] }> {
    try {
      const url = this.buildUrl(config, "libraries");
      const headers = this.getAuthHeaders(config);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(ERROR_CODES.KOMGA.CONNECTION_ERROR, { message: errorData.message });
      }

      const libraries = await response.json();
      return { libraries };
    } catch (error) {
      console.error("Erreur lors du test de connexion:", error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes("fetch")) {
        throw new AppError(ERROR_CODES.KOMGA.SERVER_UNREACHABLE);
      }
      throw new AppError(ERROR_CODES.KOMGA.CONNECTION_ERROR, {}, error);
    }
  }
}
