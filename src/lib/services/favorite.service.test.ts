import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    favorite: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/connections", () => ({ getActiveConnection: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import prisma from "@/lib/prisma";
import { getActiveConnection } from "@/lib/connections";
import logger from "@/lib/logger";
import { FavoriteService, type FavoriteContext } from "./favorite.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import {
  createProviderCapabilities,
  type IMediaProvider,
  type ProviderCapabilities,
} from "@/lib/providers/provider.interface";
import type { NormalizedSeries } from "@/lib/providers/types";

const db = prisma.favorite as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
};

function series(id: string): NormalizedSeries {
  return { id, name: `Série ${id}` } as NormalizedSeries;
}

function fakeProvider(
  overrides: Partial<IMediaProvider> = {},
  capabilities: Partial<ProviderCapabilities> = {}
): IMediaProvider {
  return {
    getSeriesById: vi.fn(async (id: string) => series(id)),
    capabilities: createProviderCapabilities(capabilities),
    ...overrides,
  } as unknown as IMediaProvider;
}

/**
 * L'identité est injectée : le service ne lit pas la session, aucun mock
 * d'`auth-utils` ni de la fabrique de provider n'est nécessaire.
 */
function as(provider: IMediaProvider | null, userId = 1): FavoriteContext {
  return { userId, provider };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveConnection).mockResolvedValue({ provider: "komga", configId: 7 });
  db.findMany.mockResolvedValue([]);
  db.findFirst.mockResolvedValue(null);
  db.create.mockResolvedValue({});
  db.deleteMany.mockResolvedValue({ count: 0 });
});

describe("FavoriteService.listFavorites — Komga", () => {
  it("keeps the favorite when the provider read fails transiently", async () => {
    db.findMany.mockResolvedValue([{ seriesId: "a" }, { seriesId: "b" }]);
    const provider = fakeProvider({
      getSeriesById: vi.fn(async (id: string) => {
        if (id === "b") throw new AppError(ERROR_CODES.KOMGA.SERVER_ERROR);
        return series(id);
      }),
    });

    const favorites = await FavoriteService.listFavorites(as(provider));

    expect(favorites.map((item) => item.id)).toEqual(["a"]);
    expect(db.deleteMany).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it("prunes only a series the provider confirms absent", async () => {
    db.findMany.mockResolvedValue([{ seriesId: "a" }, { seriesId: "b" }]);
    const provider = fakeProvider({
      getSeriesById: vi.fn(async (id: string) => (id === "b" ? null : series(id))),
    });

    const favorites = await FavoriteService.listFavorites(as(provider));

    expect(favorites.map((item) => item.id)).toEqual(["a"]);
    expect(db.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, komgaConfigId: 7, seriesId: { in: ["b"] } },
    });
  });

  it("logs a connection failure as a warning, not an error", async () => {
    db.findMany.mockResolvedValue([{ seriesId: "a" }]);
    const provider = fakeProvider({
      getSeriesById: vi.fn(async () => {
        throw Object.assign(new Error("fetch failed"), { code: "ECONNREFUSED" });
      }),
    });

    await FavoriteService.listFavorites(as(provider));

    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe("FavoriteService — store selection", () => {
  it("writes Komga favorites to SQLite, scoped to the active config", async () => {
    const provider = fakeProvider();

    await FavoriteService.addToFavorites(as(provider), "x");

    expect(db.create).toHaveBeenCalledWith({
      data: { userId: 1, seriesId: "x", provider: "komga", komgaConfigId: 7 },
    });
    expect(provider.capabilities.favorites).toBeNull();
  });

  it("delegates favorites to a provider that declares the capability", async () => {
    const addToFavorites = vi.fn(async () => undefined);
    const provider = fakeProvider(
      {},
      {
        favorites: {
          getFavorites: vi.fn(async () => []),
          isFavorite: vi.fn(async () => false),
          addToFavorites,
          removeFromFavorites: vi.fn(async () => undefined),
        },
      }
    );
    vi.mocked(getActiveConnection).mockResolvedValue({
      provider: "stripstream",
      configId: 9,
    });

    await FavoriteService.addToFavorites(as(provider), "x");

    expect(addToFavorites).toHaveBeenCalledWith("x");
    expect(db.create).not.toHaveBeenCalled();
  });

  it("scopes the favorite lookup to the active config", async () => {
    db.findFirst.mockResolvedValue(null);

    await expect(FavoriteService.isFavorite(as(fakeProvider()), "x")).resolves.toBe(false);

    expect(db.findFirst).toHaveBeenCalledWith({
      where: { userId: 1, komgaConfigId: 7, seriesId: "x" },
      select: { id: true },
    });
  });
});

describe("FavoriteService — no usable connection", () => {
  beforeEach(() => {
    vi.mocked(getActiveConnection).mockResolvedValue({
      provider: "stripstream",
      configId: null,
    });
  });

  it("degrades reads instead of throwing", async () => {
    await expect(FavoriteService.isFavorite(as(null), "x")).resolves.toBe(false);
    await expect(FavoriteService.listFavorites(as(null))).resolves.toEqual([]);
    await expect(FavoriteService.getAllFavoriteIds(as(null))).resolves.toEqual([]);
  });

  it("fails writes explicitly", async () => {
    await expect(FavoriteService.addToFavorites(as(null), "x")).rejects.toMatchObject({
      code: ERROR_CODES.FAVORITE.ADD_ERROR,
    });
    await expect(FavoriteService.removeFromFavorites(as(null), "x")).rejects.toMatchObject({
      code: ERROR_CODES.FAVORITE.DELETE_ERROR,
    });
  });
});

describe("FavoriteService — injected identity", () => {
  it("scopes the Komga store to the userId it receives", async () => {
    db.findMany.mockResolvedValue([{ seriesId: "a" }]);

    await FavoriteService.getAllFavoriteIds(as(fakeProvider(), 42));

    expect(getActiveConnection).toHaveBeenCalledWith(42);
    expect(db.findMany).toHaveBeenCalledWith({
      where: { userId: 42, komgaConfigId: 7 },
      select: { seriesId: true },
    });
  });

  it("uses the provider it is handed instead of resolving one", async () => {
    const getFavorites = vi.fn(async () => [series("s")]);
    const provider = fakeProvider(
      {},
      {
        favorites: {
          getFavorites,
          isFavorite: vi.fn(async () => true),
          addToFavorites: vi.fn(async () => undefined),
          removeFromFavorites: vi.fn(async () => undefined),
        },
      }
    );

    await expect(FavoriteService.listFavorites(as(provider))).resolves.toEqual([series("s")]);
    expect(getFavorites).toHaveBeenCalledTimes(1);
    expect(db.findMany).not.toHaveBeenCalled();
  });
});

describe("FavoriteService — idempotent Komga writes", () => {
  it("treats a concurrent duplicate add (P2002) as success", async () => {
    // Double clic : les deux soumissions ont vu « absent », la seconde
    // insertion heurte la contrainte unique alors que le favori existe.
    db.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    await expect(FavoriteService.addToFavorites(as(fakeProvider()), "x")).resolves.toBeUndefined();
  });

  it("still fails an add on any other database error", async () => {
    db.create.mockRejectedValueOnce(new Error("database is locked"));

    await expect(FavoriteService.addToFavorites(as(fakeProvider()), "x")).rejects.toMatchObject({
      code: ERROR_CODES.FAVORITE.ADD_ERROR,
    });
  });

  it("removes an absent favorite without failing", async () => {
    db.deleteMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      FavoriteService.removeFromFavorites(as(fakeProvider()), "x")
    ).resolves.toBeUndefined();
  });
});
