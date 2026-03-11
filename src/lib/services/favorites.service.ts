import { FavoriteService } from "./favorite.service";
import { getProvider } from "@/lib/providers/provider.factory";
import type { NormalizedSeries } from "@/lib/providers/types";
import logger from "@/lib/logger";

export class FavoritesService {
  static async getFavorites(context?: {
    requestPath?: string;
    requestPathname?: string;
  }): Promise<NormalizedSeries[]> {
    try {
      const [favoriteIds, provider] = await Promise.all([
        FavoriteService.getAllFavoriteIds(),
        getProvider(),
      ]);

      if (favoriteIds.length === 0 || !provider) {
        return [];
      }

      const promises = favoriteIds.map(async (id: string) => {
        try {
          return await provider.getSeriesById(id);
        } catch (error) {
          logger.error(
            {
              err: error,
              seriesId: id,
              requestPath: context?.requestPath,
              requestPathname: context?.requestPathname,
            },
            "Error fetching favorite series"
          );
          // Si la série n'existe plus, la retirer des favoris
          try {
            await FavoriteService.removeFromFavorites(id);
          } catch {
            // Ignore cleanup errors
          }
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((series): series is NormalizedSeries => series !== null);
    } catch (error) {
      logger.error(
        {
          err: error,
          requestPath: context?.requestPath,
          requestPathname: context?.requestPathname,
        },
        "Error fetching favorites"
      );
      return [];
    }
  }
}
