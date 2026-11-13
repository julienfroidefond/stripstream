import prisma from "@/lib/prisma";
import { getActiveConnection } from "@/lib/connections";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { isConnectionError } from "../../utils/http-error";
import type {
  FavoritesCapability,
  IMediaProvider,
} from "@/lib/providers/provider.interface";
import type { NormalizedSeries } from "@/lib/providers/types";
import type { Prisma } from "@/generated/prisma/client";
import logger from "@/lib/logger";

/**
 * Identité et provider de l'appelant. Le service ne lit ni la session ni la
 * fabrique de provider (ADR 0029) : la page reçoit les deux de la gateway de
 * surface, l'action du runner. `provider: null` signifie « aucune connexion
 * utilisable » et dégrade comme avant.
 */
export interface FavoriteContext {
  userId: number;
  provider: IMediaProvider | null;
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

/** Violation de contrainte unique Prisma (`P2002`). */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
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
      // Idempotent : la contrainte unique `(userId, komgaConfigId, seriesId)`
      // tranche la course d'un double clic. Une violation signifie « déjà
      // favori », donc un succès — un `findFirst` préalable ne fermait pas la
      // fenêtre entre la lecture et l'insertion.
      try {
        await prisma.favorite.create({
          data: { userId, seriesId, provider: "komga", komgaConfigId: configId },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    },
    async remove(seriesId) {
      // Idempotent aussi : retirer un favori absent supprime zéro ligne.
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

function createBackendStore(favorites: FavoritesCapability): FavoriteStore {
  return {
    async listIds() {
      const series = await favorites.getFavorites();
      return series.map((item) => item.id);
    },
    isFavorite: (seriesId) => favorites.isFavorite(seriesId),
    add: (seriesId) => favorites.addToFavorites(seriesId),
    remove: (seriesId) => favorites.removeFromFavorites(seriesId),
    list: () => favorites.getFavorites(),
  };
}

export class FavoriteService {
  /**
   * Une seule résolution de store pour toutes les opérations. `null`
   * signifie « aucune configuration utilisable », pas une panne : les lectures
   * dégradent, les écritures échouent explicitement.
   */
  private static async resolveStore({
    userId,
    provider,
  }: FavoriteContext): Promise<FavoriteStore | null> {
    const favorites = provider?.capabilities.favorites ?? null;
    if (favorites) return createBackendStore(favorites);

    // Komga ne déclare pas de favoris backend : ils restent dans la table
    // locale, scoped à la config active. Un autre provider sans capacité n'a
    // pas de repli local.
    const connection = await getActiveConnection(userId);
    if (connection.provider === "komga" && connection.configId !== null) {
      return createKomgaStore(userId, connection.configId, provider);
    }
    return null;
  }

  static async isFavorite(context: FavoriteContext, seriesId: string): Promise<boolean> {
    try {
      const store = await FavoriteService.resolveStore(context);
      return store ? await store.isFavorite(seriesId) : false;
    } catch (error) {
      logReadFailure(error, { seriesId }, "Favorite status check failed");
      return false;
    }
  }

  static async addToFavorites(context: FavoriteContext, seriesId: string): Promise<void> {
    try {
      const store = await FavoriteService.resolveStore(context);
      if (!store) throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR);
      await store.add(seriesId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.FAVORITE.ADD_ERROR, {}, error);
    }
  }

  static async removeFromFavorites(context: FavoriteContext, seriesId: string): Promise<void> {
    try {
      const store = await FavoriteService.resolveStore(context);
      if (!store) throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR);
      await store.remove(seriesId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_CODES.FAVORITE.DELETE_ERROR, {}, error);
    }
  }

  static async getAllFavoriteIds(context: FavoriteContext): Promise<string[]> {
    try {
      const store = await FavoriteService.resolveStore(context);
      return store ? await store.listIds() : [];
    } catch (error) {
      logReadFailure(error, {}, "Favorite ids fetch failed");
      return [];
    }
  }

  static async listFavorites(context: FavoriteContext): Promise<NormalizedSeries[]> {
    try {
      const store = await FavoriteService.resolveStore(context);
      return store ? await store.list() : [];
    } catch (error) {
      logReadFailure(error, {}, "Favorites fetch failed");
      return [];
    }
  }
}
