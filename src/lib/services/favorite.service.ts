import prisma from "@/lib/prisma";
import { getCurrentUser } from "../auth-utils";
import { getActiveConnection } from "@/lib/connections";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { isConnectionError } from "../../utils/http-error";
import { getProvider } from "@/lib/providers/provider.factory";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedSeries } from "@/lib/providers/types";
import type { Prisma } from "@/generated/prisma/client";
import logger from "@/lib/logger";

type ProviderType = "komga" | "stripstream";

interface ActiveContext {
  userId: number;
  provider: ProviderType;
  configId: number | null;
}

/**
 * Seam interne : les deux implémentations diffèrent par l'endroit où vit le
 * favori, pas par ce qu'un appelant peut en faire. `list` ne renvoie que des
 * séries qui existent encore.
 */
interface FavoriteStore {
  listIds(): Promise<string[]>;
  isFavorite(seriesId: string): Promise<boolean>;
  add(seriesId: string): Promise<void>;
  remove(seriesId: string): Promise<void>;
  list(): Promise<NormalizedSeries[]>;
}

type Hydration =
  | { id: string; status: "found"; series: NormalizedSeries }
  | { id: string; status: "missing" }
  | { id: string; status: "failed" };

/** Piscine de concurrence bornée : on ne lance pas N requêtes d'un coup. */
const HYDRATION_CONCURRENCY = 3;

function komgaScope(
  userId: number,
  configId: number,
  seriesId?: string
): Prisma.FavoriteWhereInput {
  return seriesId === undefined
    ? { userId, komgaConfigId: configId }
    : { userId, komgaConfigId: configId, seriesId };
}

function logReadFailure(
  error: unknown,
  meta: Record<string, unknown>,
  message: string
): void {
  const payload = { err: error, ...meta };
  // Un provider injoignable n'est pas une erreur applicative : pas de spam.
  if (isConnectionError(error)) logger.warn(payload, message);
  else logger.error(payload, message);
}

/**
 * `null` porté par le provider signifie « absence confirmée » ; une exception
 * signifie « panne ». Seule la première justifie de retirer le favori.
 */
async function hydrateFavorite(
  provider: IMediaProvider,
  id: string
): Promise<Hydration> {
  try {
    const series = await provider.getSeriesById(id);
    return series ? { id, status: "found", series } : { id, status: "missing" };
  } catch (error) {
    logReadFailure(error, { seriesId: id }, "Favorite series lookup failed");
    return { id, status: "failed" };
  }
}

function createKomgaStore(
  userId: number,
  configId: number,
  provider: IMediaProvider | null
): FavoriteStore {
  const listIds = async (): Promise<string[]> => {
    const rows = await prisma.favorite.findMany({
      where: komgaScope(userId, configId),
      select: { seriesId: true },
    });
    return rows.map((row) => row.seriesId);
  };

  return {
    listIds,
    async isFavorite(seriesId) {
      const row = await prisma.favorite.findFirst({
        where: komgaScope(userId, configId, seriesId),
        select: { id: true },
      });
      return row !== null;
    },
    async add(seriesId) {
      // upsert manuel : la contrainte unique dépend de la colonne config concernée
      const row = await prisma.favorite.findFirst({
        where: komgaScope(userId, configId, seriesId),
        select: { id: true },
      });
      if (row) return;
      await prisma.favorite.create({
        data: { userId, seriesId, provider: "komga", komgaConfigId: configId },
      });
    },
    async remove(seriesId) {
      await prisma.favorite.deleteMany({
        where: komgaScope(userId, configId, seriesId),
      });
    },
    async list() {
      if (!provider) throw new AppError(ERROR_CODES.FAVORITE.FETCH_ERROR);

      const ids = await listIds();
      if (ids.length === 0) return [];

      const outcomes: Hydration[] = [];
      for (let i = 0; i < ids.length; i += HYDRATION_CONCURRENCY) {
        const chunk = ids.slice(i, i + HYDRATION_CONCURRENCY);
        outcomes.push(...(await Promise.all(chunk.map((id) => hydrateFavorite(provider, id)))));
      }

      // Seule une absence confirmée nettoie la ligne. Une lecture en échec la
      // conserve : le favori revient au prochain rendu réussi.
      const missing = outcomes
        .filter((outcome): outcome is Extract<Hydration, { status: "missing" }> => outcome.status === "missing")
        .map((outcome) => outcome.id);
      if (missing.length > 0) {
        await prisma.favorite.deleteMany({
          where: { userId, komgaConfigId: configId, seriesId: { in: missing } },
        });
      }

      return outcomes.flatMap((outcome) => (outcome.status === "found" ? [outcome.series] : []));
    },
  };
}

function createBackendStore(provider: IMediaProvider): FavoriteStore {
  return {
    async listIds() {
      const favorites = await provider.getFavorites();
      return favorites.map((series) => series.id);
    },
    isFavorite: (seriesId) => provider.isFavorite(seriesId),
    add: (seriesId) => provider.addToFavorites(seriesId),
    remove: (seriesId) => provider.removeFromFavorites(seriesId),
    list: () => provider.getFavorites(),
  };
}

export class FavoriteService {
  private static async requireContext(): Promise<ActiveContext> {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
    }
    const userId = parseInt(user.id, 10);
    const connection = await getActiveConnection(userId);
    return {
      userId,
      provider: connection.provider,
      configId: connection.configId,
    };
  }

  /**
   * Une seule résolution de connexion pour toutes les opérations. `null`
   * signifie « aucune configuration utilisable », pas une panne : les lectures
   * dégradent, les écritures échouent explicitement.
   */
  private static async resolveStore(ctx: ActiveContext): Promise<FavoriteStore | null> {
    const provider = await getProvider();
    if (ctx.provider === "stripstream") {
      return provider ? createBackendStore(provider) : null;
    }
    if (ctx.configId === null) return null;
    return createKomgaStore(ctx.userId, ctx.configId, provider);
  }

  static async isFavorite(seriesId: string): Promise<boolean> {
    try {
      const ctx = await FavoriteService.requireContext();
      const store = await FavoriteService.resolveStore(ctx);
      return store ? await store.isFavorite(seriesId) : false;
    } catch (error) {
      logReadFailure(error, { seriesId }, "Favorite status check failed");
      return false;
    }
  }

  static async addToFavorites(seriesId: string): Promise<void> {
    try {
      const ctx = await FavoriteService.requireContext();
      const store = await FavoriteService.resolveStore(ctx);
      if (!store) throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR);
      await store.add(seriesId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR, {}, error);
    }
  }

  static async removeFromFavorites(seriesId: string): Promise<void> {
    try {
      const ctx = await FavoriteService.requireContext();
      const store = await FavoriteService.resolveStore(ctx);
      if (!store) throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR);
      await store.remove(seriesId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR, {}, error);
    }
  }

  static async getAllFavoriteIds(): Promise<string[]> {
    try {
      const ctx = await FavoriteService.requireContext();
      const store = await FavoriteService.resolveStore(ctx);
      return store ? await store.listIds() : [];
    } catch (error) {
      logReadFailure(error, {}, "Favorite ids fetch failed");
      return [];
    }
  }

  static async listFavorites(): Promise<NormalizedSeries[]> {
    try {
      const ctx = await FavoriteService.requireContext();
      const store = await FavoriteService.resolveStore(ctx);
      return store ? await store.list() : [];
    } catch (error) {
      logReadFailure(error, {}, "Favorites fetch failed");
      return [];
    }
  }
}
