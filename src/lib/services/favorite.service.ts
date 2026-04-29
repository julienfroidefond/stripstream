import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { FAVORITES_CACHE_TAG } from "../../constants/cacheConstants";
import type { User } from "@/types/komga";
import logger from "@/lib/logger";

// Lecture cachée par (userId, provider, seriesId), invalidée via FAVORITES_CACHE_TAG.
const cachedIsFavorite = (userId: number, provider: string, seriesId: string) =>
  unstable_cache(
    async () => {
      const favorite = await prisma.favorite.findFirst({
        where: { userId, seriesId, provider },
      });
      return !!favorite;
    },
    ["favorite-is", String(userId), provider, seriesId],
    { tags: [FAVORITES_CACHE_TAG] }
  )();

const cachedFavoriteIds = (userId: number, provider: string) =>
  unstable_cache(
    async () => {
      const favorites = await prisma.favorite.findMany({
        where: { userId, provider },
        select: { seriesId: true },
      });
      return favorites.map((f) => f.seriesId);
    },
    ["favorite-ids", String(userId), provider],
    { tags: [FAVORITES_CACHE_TAG] }
  )();

export class FavoriteService {
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

  static async isFavorite(seriesId: string): Promise<boolean> {
    try {
      const { userId, provider } = await this.getCurrentUserWithProvider();
      return await cachedIsFavorite(userId, provider, seriesId);
    } catch (error) {
      logger.error({ err: error, seriesId }, "Erreur lors de la vérification du favori");
      return false;
    }
  }

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
    } catch (error) {
      throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR, {}, error);
    }
  }

  static async removeFromFavorites(seriesId: string): Promise<void> {
    try {
      const { userId, provider } = await this.getCurrentUserWithProvider();
      await prisma.favorite.deleteMany({
        where: { userId, seriesId, provider },
      });
    } catch (error) {
      throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR, {}, error);
    }
  }

  static async getAllFavoriteIds(): Promise<string[]> {
    const { userId, provider } = await this.getCurrentUserWithProvider();
    return cachedFavoriteIds(userId, provider);
  }
}
