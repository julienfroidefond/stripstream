import { FavoriteService } from "./favorite.service";
import { SeriesService } from "./series.service";
import type { KomgaSeries } from "@/types/komga";
import logger from "@/lib/logger";

export class FavoritesService {
  static async getFavorites(context?: {
    requestPath?: string;
    requestPathname?: string;
  }): Promise<KomgaSeries[]> {
    try {
      const favoriteIds = await FavoriteService.getAllFavoriteIds();

      if (favoriteIds.length === 0) {
        return [];
      }

      // Fetch toutes les séries en parallèle
      const promises = favoriteIds.map(async (id: string) => {
        try {
          return await SeriesService.getSeries(id);
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
      return results.filter((series): series is KomgaSeries => series !== null);
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
