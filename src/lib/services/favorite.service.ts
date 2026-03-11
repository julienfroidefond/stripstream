import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { User } from "@/types/komga";
import logger from "@/lib/logger";

export class FavoriteService {
  private static readonly FAVORITES_CHANGE_EVENT = "favoritesChanged";

  private static dispatchFavoritesChanged() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(FavoriteService.FAVORITES_CHANGE_EVENT));
    }
  }

  private static async getCurrentUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    return user;
  }

  private static async getCurrentUserWithProvider(): Promise<{ userId: number; provider: string }> {
    const user = await FavoriteService.getCurrentUser();
    const userId = parseInt(user.id, 10);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProvider: true },
    });
    const provider = dbUser?.activeProvider ?? "komga";
    return { userId, provider };
  }

  /**
   * Vérifie si une série est dans les favoris (pour le provider actif)
   */
  static async isFavorite(seriesId: string): Promise<boolean> {
    try {
      const { userId, provider } = await this.getCurrentUserWithProvider();

      const favorite = await prisma.favorite.findFirst({
        where: { userId, seriesId, provider },
      });
      return !!favorite;
    } catch (error) {
      logger.error({ err: error, seriesId }, "Erreur lors de la vérification du favori");
      return false;
    }
  }

  /**
   * Ajoute une série aux favoris (pour le provider actif)
   */
  static async addToFavorites(seriesId: string): Promise<void> {
    try {
      const { userId, provider } = await this.getCurrentUserWithProvider();

      await prisma.favorite.upsert({
        where: {
          userId_provider_seriesId: { userId, provider, seriesId },
        },
        update: {},
        create: { userId, provider, seriesId },
      });

      this.dispatchFavoritesChanged();
    } catch (error) {
      throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR, {}, error);
    }
  }

  /**
   * Retire une série des favoris (pour le provider actif)
   */
  static async removeFromFavorites(seriesId: string): Promise<void> {
    try {
      const { userId, provider } = await this.getCurrentUserWithProvider();

      await prisma.favorite.deleteMany({
        where: { userId, seriesId, provider },
      });

      this.dispatchFavoritesChanged();
    } catch (error) {
      throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR, {}, error);
    }
  }

  /**
   * Récupère tous les IDs des séries favorites (pour le provider actif)
   */
  static async getAllFavoriteIds(): Promise<string[]> {
    const { userId, provider } = await this.getCurrentUserWithProvider();

    const favorites = await prisma.favorite.findMany({
      where: { userId, provider },
      select: { seriesId: true },
    });
    return favorites.map((favorite) => favorite.seriesId);
  }

}
