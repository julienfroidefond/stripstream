import type { KomgaBook } from "@/types/komga";
import { BookService } from "./book.service";
import { ImageService } from "./image.service";
import { PreferencesService } from "./preferences.service";
import { ConfigDBService } from "./config-db.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import logger from "@/lib/logger";

export class SeriesService {
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
        return ImageService.streamImage(`series/${seriesId}/thumbnail`);
      }
      const firstBookId = await SeriesService.getFirstBook(seriesId);
      return BookService.getPage(firstBookId, 1);
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération de la couverture de la série");
      throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
    }
  }
}
