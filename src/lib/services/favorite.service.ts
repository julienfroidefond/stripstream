import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { FAVORITES_CACHE_TAG } from "../../constants/cacheConstants";
import { getProvider } from "@/lib/providers/provider.factory";
import type { User } from "@/types/komga";
import type { NormalizedSeries } from "@/lib/providers/types";
import logger from "@/lib/logger";

type ProviderType = "komga" | "stripstream";

interface ActiveContext {
  userId: number;
  provider: ProviderType;
  /** id de la config (komga ou stripstream) à laquelle scoper les favoris */
  configId: number | null;
}

// Lecture cachée par (userId, provider, configId, seriesId), invalidée via FAVORITES_CACHE_TAG.
const cachedIsFavorite = (
  userId: number,
  provider: ProviderType,
  configId: number | null,
  seriesId: string
) =>
  unstable_cache(
    async () => {
      if (configId === null) return false;
      const where =
        provider === "komga"
          ? { userId, seriesId, komgaConfigId: configId }
          : { userId, seriesId, stripstreamConfigId: configId };
      const favorite = await prisma.favorite.findFirst({ where });
      return !!favorite;
    },
    ["favorite-is", String(userId), provider, String(configId ?? "none"), seriesId],
    { tags: [FAVORITES_CACHE_TAG] }
  )();

const cachedFavoriteIds = (userId: number, provider: ProviderType, configId: number | null) =>
  unstable_cache(
    async () => {
      if (configId === null) return [];
      const where =
        provider === "komga"
          ? { userId, komgaConfigId: configId }
          : { userId, stripstreamConfigId: configId };
      const favorites = await prisma.favorite.findMany({
        where,
        select: { seriesId: true },
      });
      return favorites.map((f) => f.seriesId);
    },
    ["favorite-ids", String(userId), provider, String(configId ?? "none")],
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

  /**
   * Résout le contexte actif de l'utilisateur :
   *   - le type de provider courant (komga/stripstream)
   *   - l'id de la config active correspondante (peut être null si aucune)
   */
  private static async getActiveContext(): Promise<ActiveContext> {
    const user = await FavoriteService.getCurrentUser();
    const userId = parseInt(user.id, 10);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeProvider: true,
        activeKomgaConfigId: true,
        activeStripstreamConfigId: true,
      },
    });
    const provider = (dbUser?.activeProvider ?? "komga") as ProviderType;
    const configId =
      provider === "komga"
        ? dbUser?.activeKomgaConfigId ?? null
        : dbUser?.activeStripstreamConfigId ?? null;
    return { userId, provider, configId };
  }

  static async isFavorite(seriesId: string): Promise<boolean> {
    try {
      const ctx = await this.getActiveContext();
      return await cachedIsFavorite(ctx.userId, ctx.provider, ctx.configId, seriesId);
    } catch (error) {
      logger.error({ err: error, seriesId }, "Erreur lors de la vérification du favori");
      return false;
    }
  }

  static async addToFavorites(seriesId: string): Promise<void> {
    try {
      const ctx = await this.getActiveContext();
      if (ctx.configId === null) {
        throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR);
      }

      const data =
        ctx.provider === "komga"
          ? {
              userId: ctx.userId,
              seriesId,
              provider: "komga",
              komgaConfigId: ctx.configId,
            }
          : {
              userId: ctx.userId,
              seriesId,
              provider: "stripstream",
              stripstreamConfigId: ctx.configId,
            };

      // upsert manuel : la contrainte unique dépend de la colonne config concernée
      const existing =
        ctx.provider === "komga"
          ? await prisma.favorite.findFirst({
              where: { userId: ctx.userId, seriesId, komgaConfigId: ctx.configId },
              select: { id: true },
            })
          : await prisma.favorite.findFirst({
              where: { userId: ctx.userId, seriesId, stripstreamConfigId: ctx.configId },
              select: { id: true },
            });

      if (!existing) {
        await prisma.favorite.create({ data });
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR, {}, error);
    }
  }

  static async removeFromFavorites(seriesId: string): Promise<void> {
    try {
      const ctx = await this.getActiveContext();
      if (ctx.configId === null) return;

      const where =
        ctx.provider === "komga"
          ? { userId: ctx.userId, seriesId, komgaConfigId: ctx.configId }
          : { userId: ctx.userId, seriesId, stripstreamConfigId: ctx.configId };
      await prisma.favorite.deleteMany({ where });
    } catch (error) {
      throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR, {}, error);
    }
  }

  static async getAllFavoriteIds(): Promise<string[]> {
    const ctx = await this.getActiveContext();
    return cachedFavoriteIds(ctx.userId, ctx.provider, ctx.configId);
  }

  /**
   * Récupère les favoris enrichis (NormalizedSeries) de l'utilisateur courant
   * en combinant les IDs cachés avec un appel `getSeriesById` au provider actif.
   * Si une série n'existe plus (provider 404), elle est silencieusement retirée
   * des favoris pour éviter les listes pollués.
   */
  static async listFavorites(context?: {
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

      const promises = favoriteIds.map(async (id) => {
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
          // Cleanup silencieux : la série n'existe plus côté provider
          try {
            await FavoriteService.removeFromFavorites(id);
          } catch {
            // ignore cleanup errors
          }
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((s): s is NormalizedSeries => s !== null);
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
