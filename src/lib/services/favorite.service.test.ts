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

vi.mock("@/lib/active-connection", () => ({ getActiveConnection: vi.fn() }));
vi.mock("@/lib/providers/provider.factory", () => ({ getProvider: vi.fn() }));
vi.mock("@/lib/auth-utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import prisma from "@/lib/prisma";
import { getActiveConnection } from "@/lib/active-connection";
import { getProvider } from "@/lib/providers/provider.factory";
import { getCurrentUser } from "@/lib/auth-utils";
import logger from "@/lib/logger";
import { FavoriteService } from "./favorite.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
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

function fakeProvider(overrides: Partial<IMediaProvider> = {}): IMediaProvider {
  return {
    getSeriesById: vi.fn(async (id: string) => series(id)),
    getFavorites: vi.fn(async () => []),
    isFavorite: vi.fn(async () => false),
    addToFavorites: vi.fn(async () => undefined),
    removeFromFavorites: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as IMediaProvider;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "1",
    email: "reader@example.com",
    roles: [],
    authenticated: true,
  });
  vi.mocked(getActiveConnection).mockResolvedValue({ provider: "komga", configId: 7 });
  vi.mocked(getProvider).mockResolvedValue(fakeProvider());
  db.findMany.mockResolvedValue([]);
  db.findFirst.mockResolvedValue(null);
  db.create.mockResolvedValue({});
  db.deleteMany.mockResolvedValue({ count: 0 });
});

describe("FavoriteService.listFavorites — Komga", () => {
  it("keeps the favorite when the provider read fails transiently", async () => {
    db.findMany.mockResolvedValue([{ seriesId: "a" }, { seriesId: "b" }]);
    vi.mocked(getProvider).mockResolvedValue(
      fakeProvider({
        getSeriesById: vi.fn(async (id: string) => {
          if (id === "b") throw new AppError(ERROR_CODES.KOMGA.SERVER_ERROR);
          return series(id);
        }),
      })
    );

    const favorites = await FavoriteService.listFavorites();

    expect(favorites.map((item) => item.id)).toEqual(["a"]);
    expect(db.deleteMany).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it("prunes only a series the provider confirms absent", async () => {
    db.findMany.mockResolvedValue([{ seriesId: "a" }, { seriesId: "b" }]);
    vi.mocked(getProvider).mockResolvedValue(
      fakeProvider({
        getSeriesById: vi.fn(async (id: string) => (id === "b" ? null : series(id))),
      })
    );

    const favorites = await FavoriteService.listFavorites();

    expect(favorites.map((item) => item.id)).toEqual(["a"]);
    expect(db.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, komgaConfigId: 7, seriesId: { in: ["b"] } },
    });
  });

  it("logs a connection failure as a warning, not an error", async () => {
    db.findMany.mockResolvedValue([{ seriesId: "a" }]);
    vi.mocked(getProvider).mockResolvedValue(
      fakeProvider({
        getSeriesById: vi.fn(async () => {
          throw Object.assign(new Error("fetch failed"), { code: "ECONNREFUSED" });
        }),
      })
    );

    await FavoriteService.listFavorites();

    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe("FavoriteService — store selection", () => {
  it("writes Komga favorites to SQLite, scoped to the active config", async () => {
    const provider = fakeProvider();
    vi.mocked(getProvider).mockResolvedValue(provider);

    await FavoriteService.addToFavorites("x");

    expect(db.create).toHaveBeenCalledWith({
      data: { userId: 1, seriesId: "x", provider: "komga", komgaConfigId: 7 },
    });
    expect(provider.addToFavorites).not.toHaveBeenCalled();
  });

  it("delegates Stripstream favorites to the backend and never touches SQLite", async () => {
    const provider = fakeProvider();
    vi.mocked(getActiveConnection).mockResolvedValue({
      provider: "stripstream",
      configId: 9,
    });
    vi.mocked(getProvider).mockResolvedValue(provider);

    await FavoriteService.addToFavorites("x");

    expect(provider.addToFavorites).toHaveBeenCalledWith("x");
    expect(db.create).not.toHaveBeenCalled();
  });

  it("scopes the favorite lookup to the active config", async () => {
    db.findFirst.mockResolvedValue(null);

    await expect(FavoriteService.isFavorite("x")).resolves.toBe(false);

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
    vi.mocked(getProvider).mockResolvedValue(null);
  });

  it("degrades reads instead of throwing", async () => {
    await expect(FavoriteService.isFavorite("x")).resolves.toBe(false);
    await expect(FavoriteService.listFavorites()).resolves.toEqual([]);
    await expect(FavoriteService.getAllFavoriteIds()).resolves.toEqual([]);
  });

  it("fails writes explicitly", async () => {
    await expect(FavoriteService.addToFavorites("x")).rejects.toMatchObject({
      code: ERROR_CODES.FAVORITE.ADD_ERROR,
    });
    await expect(FavoriteService.removeFromFavorites("x")).rejects.toMatchObject({
      code: ERROR_CODES.FAVORITE.DELETE_ERROR,
    });
  });
});
