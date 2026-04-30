import type { KomgaBook } from "@/types/komga";
import { KomgaImageService } from "./image.service";
import { PreferencesService } from "../preferences.service";
import { ConfigDBService } from "../config-db.service";
import { ERROR_CODES } from "../../../constants/errorCodes";
import { AppError } from "../../../utils/errors";
import logger from "@/lib/logger";

/**
 * Helpers de fetch d'images de séries côté Komga (cover via thumbnail ou
 * première page du premier livre). Utilisé exclusivement par les routes
 * `/api/komga/...`. Stripstream a son propre flot.
 */
export class KomgaSeriesService {
  private static async getFirstBook(seriesId: string): Promise<string> {
    const config = await ConfigDBService.getConfig();
    if (!config) throw new AppError(ERROR_CODES.KOMGA.MISSING_CONFIG);

    const url = new URL(`${config.url}/api/v1/series/${seriesId}/books`);
    url.searchParams.set("page", "0");
    url.searchParams.set("size", "1");

    const headers = new Headers({
      Authorization: `Basic ${config.authHeader}`,
      Accept: "application/json",
    });

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);

    const data: { content: KomgaBook[] } = await response.json();
    if (!data.content?.length) throw new AppError(ERROR_CODES.SERIES.NO_BOOKS_FOUND);

    return data.content[0].id;
  }

  static async getCover(seriesId: string): Promise<Response> {
    try {
      const preferences = await PreferencesService.getPreferences();
      if (preferences.showThumbnails) {
        return KomgaImageService.streamImage(`series/${seriesId}/thumbnail`);
      }
      const firstBookId = await KomgaSeriesService.getFirstBook(seriesId);
      // Première page du premier livre (zero_based=true → page 0)
      return KomgaImageService.streamImage(`books/${firstBookId}/pages/0?zero_based=true`);
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération de la couverture de la série");
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }
}
