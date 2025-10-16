import prisma from "@/lib/prisma";
import { DebugService } from "./debug.service";
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

      return DebugService.measureMongoOperation("isFavorite", async () => {
        const favorite = await prisma.favorite.findFirst({
          where: {
            userId: user.id,
            seriesId: seriesId,
          },
        });
        return !!favorite;
      });
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

      await DebugService.measureMongoOperation("addToFavorites", async () => {
        await prisma.favorite.upsert({
          where: {
            userId_seriesId: {
              userId: user.id,
              seriesId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            seriesId,
          },
        });
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

      await DebugService.measureMongoOperation("removeFromFavorites", async () => {
        await prisma.favorite.deleteMany({
          where: {
            userId: user.id,
            seriesId,
          },
        });
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

    return DebugService.measureMongoOperation("getAllFavoriteIds", async () => {
      const favorites = await prisma.favorite.findMany({
        where: { userId: user.id },
        select: { seriesId: true },
      });
      return favorites.map((favorite) => favorite.seriesId);
    });
  }

  static async addFavorite(seriesId: string) {
    const user = await this.getCurrentUser();

    return DebugService.measureMongoOperation("addFavorite", async () => {
      const favorite = await prisma.favorite.upsert({
        where: {
          userId_seriesId: {
            userId: user.id,
            seriesId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          seriesId,
        },
      });
      return favorite;
    });
  }

  static async removeFavorite(seriesId: string): Promise<boolean> {
    const user = await this.getCurrentUser();

    return DebugService.measureMongoOperation("removeFavorite", async () => {
      const result = await prisma.favorite.deleteMany({
        where: {
          userId: user.id,
          seriesId,
        },
      });
      return result.count > 0;
    });
  }
}
