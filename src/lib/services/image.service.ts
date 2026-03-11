import { ConfigDBService } from "./config-db.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import logger from "@/lib/logger";

const IMAGE_CACHE_MAX_AGE = 2592000;

export class ImageService {
  static async streamImage(
    path: string,
    cacheMaxAge: number = IMAGE_CACHE_MAX_AGE
  ): Promise<Response> {
    try {
      const config = await ConfigDBService.getConfig();
      if (!config) throw new AppError(ERROR_CODES.KOMGA.MISSING_CONFIG);

      const url = new URL(`${config.url}/api/v1/${path}`).toString();
      const headers = new Headers({
        Authorization: `Basic ${config.authHeader}`,
        Accept: "image/jpeg, image/png, image/gif, image/webp, */*",
      });

      const response = await fetch(url, { headers });
      if (!response.ok) throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: response.status });

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/jpeg",
          "Content-Length": response.headers.get("content-length") || "",
          "Cache-Control": `public, max-age=${cacheMaxAge}, immutable`,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors du streaming de l'image");
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, {}, error);
    }
  }
}
