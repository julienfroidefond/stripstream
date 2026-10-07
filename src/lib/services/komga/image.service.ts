import { ConfigDBService } from "../config-db.service";
import { ERROR_CODES } from "../../../constants/errorCodes";
import { AppError } from "../../../utils/errors";
import logger from "@/lib/logger";

const IMAGE_CACHE_MAX_AGE = 2592000;

/**
 * Stream une image depuis le serveur Komga actif (URL + Basic Auth de la
 * KomgaConfig active).
 *
 * Note d'archi : Stripstream a son propre flot via `StripstreamClient.fetchImage`
 * appelé depuis les routes `/api/stripstream/images/...`. Il n'y a volontairement
 * pas de dispatcher commun car les deux backends servent leurs images via des
 * URLs distinctes (`/api/komga/images/...` vs `/api/stripstream/images/...`)
 * encodées dès la phase d'adaptation par chaque provider.
 */
export class KomgaImageService {
  static async streamImage(
    path: string,
    cacheMaxAge: number = IMAGE_CACHE_MAX_AGE,
    conditionalHeaders?: HeadersInit
  ): Promise<Response> {
    try {
      const config = await ConfigDBService.getConfig();
      if (!config) throw new AppError(ERROR_CODES.KOMGA.MISSING_CONFIG);

      const url = new URL(`${config.url}/api/v1/${path}`).toString();
      const headers = new Headers({
        Authorization: `Basic ${config.authHeader}`,
        Accept: "image/jpeg, image/png, image/gif, image/webp, */*",
      });
      if (conditionalHeaders) {
        const requestHeaders = new Headers(conditionalHeaders);
        for (const header of ["if-none-match", "if-modified-since"]) {
          const value = requestHeaders.get(header);
          if (value) headers.set(header, value);
        }
      }

      const response = await fetch(url, { headers });
      if (!response.ok && response.status !== 304) {
        throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: response.status });
      }

      const responseHeaders = new Headers({
        "Cache-Control": `public, max-age=${cacheMaxAge}, immutable`,
      });
      for (const header of ["content-type", "content-length", "etag", "last-modified"]) {
        const value = response.headers.get(header);
        if (value) responseHeaders.set(header, value);
      }

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors du streaming de l'image");
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, {}, error);
    }
  }
}
