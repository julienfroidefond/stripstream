import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { User } from "@/types/komga";

export class FavoriteService {
  private static readonly FAVORITES_CHANGE_EVENT = "favoritesChanged";

  private static dispatchFavoritesChanged() {
    // Dispatch l'événement pour notifier les changements
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

  /**
   * Vérifie si une série est dans les favoris
   */
  static async isFavorite(seriesId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      const favorite = await prisma.favorite.findFirst({
        where: {
          userId,
          seriesId: seriesId,
        },
      });
      return !!favorite;
    } catch (error) {
      console.error("Erreur lors de la vérification du favori:", error);
      return false;
    }
  }

  /**
   * Ajoute une série aux favoris
   */
  static async addToFavorites(seriesId: string): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      await prisma.favorite.upsert({
        where: {
          userId_seriesId: {
            userId,
            seriesId,
          },
        },
        update: {},
        create: {
          userId,
          seriesId,
        },
      });

      this.dispatchFavoritesChanged();
    } catch (error) {
      throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR, {}, error);
    }
  }

  /**
   * Retire une série des favoris
   */
  static async removeFromFavorites(seriesId: string): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      const userId = parseInt(user.id, 10);

      await prisma.favorite.deleteMany({
        where: {
          userId,
          seriesId,
        },
      });

      this.dispatchFavoritesChanged();
    } catch (error) {
      throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR, {}, error);
    }
  }

  /**
   * Récupère tous les IDs des séries favorites
   */
  static async getAllFavoriteIds(): Promise<string[]> {
    const user = await this.getCurrentUser();
    const userId = parseInt(user.id, 10);

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { seriesId: true },
    });
    return favorites.map((favorite) => favorite.seriesId);
  }

  static async addFavorite(seriesId: string) {
    const user = await this.getCurrentUser();
    const userId = parseInt(user.id, 10);

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_seriesId: {
          userId,
          seriesId,
        },
      },
      update: {},
      create: {
        userId,
        seriesId,
      },
    });
    return favorite;
  }

  static async removeFavorite(seriesId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    const userId = parseInt(user.id, 10);

    const result = await prisma.favorite.deleteMany({
      where: {
        userId,
        seriesId,
      },
    });
    return result.count > 0;
  }
}
