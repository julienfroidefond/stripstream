import { describe, expect, it, vi } from "vitest";

import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { resolveSeriesPool } from "./series-pool";

function series(
  id: string,
  overrides: Partial<NormalizedSeries> = {}
): NormalizedSeries {
  return {
    id,
    name: `Série ${id}`,
    bookCount: 5,
    booksReadCount: 1,
    thumbnailUrl: "",
    ...overrides,
  };
}

function book(
  id: string,
  overrides: Partial<NormalizedBook> = {}
): NormalizedBook {
  return {
    id,
    libraryId: "lib-1",
    title: `Tome ${id}`,
    number: id,
    seriesId: "s1",
    seriesName: null,
    volume: null,
    pageCount: 100,
    thumbnailUrl: "",
    media: { pageUrlTemplate: "/pages/{page}", thumbnailUrlTemplate: "/pages/{page}" },
    readProgress: null,
    ...overrides,
  };
}

function makeProvider() {
  return {
    getSeriesById: vi.fn<(seriesId: string) => Promise<NormalizedSeries | null>>(
      async () => null
    ),
    getSeries: vi.fn<
      (
        libraryId: string,
        cursor?: string,
        limit?: number,
        unreadOnly?: boolean,
        search?: string
      ) => Promise<{ items: NormalizedSeries[]; nextCursor: string | null }>
    >(async () => ({ items: [], nextCursor: null })),
  };
}

function asProvider(provider: ReturnType<typeof makeProvider>): IMediaProvider {
  return provider as unknown as IMediaProvider;
}

describe("resolveSeriesPool", () => {
  it("returns the known pool without any provider call when every book is covered", async () => {
    const provider = makeProvider();
    const known = [series("s1", { name: "Été" })];

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [book("b1", { seriesId: "s1" }), book("b2", { seriesId: null, seriesName: "Été" })],
      known
    );

    expect(pool).toEqual(known);
    expect(provider.getSeriesById).not.toHaveBeenCalled();
    expect(provider.getSeries).not.toHaveBeenCalled();
  });

  it("resolves missing series by id and appends them after the known pool", async () => {
    const provider = makeProvider();
    provider.getSeriesById.mockImplementation(async (seriesId) => series(seriesId));
    const series2 = "22222222-2222-4222-8222-222222222222";
    const series3 = "33333333-3333-4333-8333-333333333333";

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [book("b1", { seriesId: series2 }), book("b2", { seriesId: series3 })],
      [series("s1")]
    );

    expect(pool.map((item) => item.id)).toEqual(["s1", series2, series3]);
    expect(provider.getSeriesById).toHaveBeenCalledWith(series2);
    expect(provider.getSeriesById).toHaveBeenCalledWith(series3);
    expect(provider.getSeries).not.toHaveBeenCalled();
  });

  it("falls back to a library series search when only the name is exposed", async () => {
    const provider = makeProvider();
    provider.getSeries.mockResolvedValue({
      items: [series("wrong", { name: "Été 2" }), series("s2", { name: "Été" })],
      nextCursor: null,
    });

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [book("b1", { libraryId: "lib-2", seriesId: null, seriesName: "Été" })]
    );

    expect(provider.getSeriesById).not.toHaveBeenCalled();
    expect(provider.getSeries).toHaveBeenCalledWith(
      "lib-2",
      undefined,
      20,
      false,
      "Été"
    );
    expect(pool).toEqual([series("s2", { name: "Été" })]);
  });

  it("queries each missing series only once", async () => {
    const provider = makeProvider();
    provider.getSeriesById.mockImplementation(async (seriesId) => series(seriesId));
    const missing = "22222222-2222-4222-8222-222222222222";

    const pool = await resolveSeriesPool(asProvider(provider), [
      book("b1", { seriesId: missing }),
      book("b2", { seriesId: missing }),
      book("b3", { seriesId: missing.toUpperCase() }),
    ]);

    expect(pool.map((item) => item.id)).toEqual([missing]);
    expect(provider.getSeriesById).toHaveBeenCalledTimes(1);
  });

  it("skips books without a series reference and keeps the known pool intact", async () => {
    const provider = makeProvider();
    const known = [series("s1")];

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [
        book("b1", { seriesId: null, seriesName: null }),
        book("b2", { seriesId: "   ", seriesName: "   " }),
      ],
      known
    );

    expect(pool).toEqual(known);
    expect(provider.getSeriesById).not.toHaveBeenCalled();
    expect(provider.getSeries).not.toHaveBeenCalled();
  });

  it("keeps the pool when both series lookup paths fail", async () => {
    const provider = makeProvider();
    provider.getSeriesById.mockRejectedValue(new Error("not found"));
    provider.getSeries.mockRejectedValue(new Error("search down"));

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [
        book("b1", { seriesId: "missing-id" }),
        book("b2", { seriesId: null, seriesName: "Missing" }),
      ],
      [series("s1")]
    );

    expect(pool).toEqual([series("s1")]);
    expect(provider.getSeriesById).toHaveBeenCalledWith("missing-id");
    expect(provider.getSeries).toHaveBeenCalled();
  });

  it("resolves by id even when the pool has a same-name series", async () => {
    const provider = makeProvider();
    provider.getSeriesById.mockImplementation(async (seriesId) =>
      series(seriesId, { name: "Same" })
    );

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [book("b1", { seriesId: "other", seriesName: "Same" })],
      [series("known", { name: "Same", libraryId: "lib-1" })]
    );

    expect(provider.getSeriesById).toHaveBeenCalledWith("other");
    expect(provider.getSeries).not.toHaveBeenCalled();
    expect(pool.map((item) => item.id)).toEqual(["known", "other"]);
  });

  it("reuses a series already resolved for the same name", async () => {
    const provider = makeProvider();
    provider.getSeries.mockResolvedValue({
      items: [series("s2", { name: "Été" })],
      nextCursor: null,
    });

    const pool = await resolveSeriesPool(asProvider(provider), [
      book("b1", { seriesId: null, seriesName: "Été" }),
      book("b2", { seriesId: null, seriesName: "Été" }),
    ]);

    expect(pool.map((item) => item.id)).toEqual(["s2"]);
    expect(provider.getSeries).toHaveBeenCalledTimes(1);
  });

  it("does not query when the known pool already has the book's library", async () => {
    const provider = makeProvider();
    const known = [
      series("a", { name: "Same", libraryId: "lib-a" }),
      series("b", { name: "Same", libraryId: "lib-b" }),
    ];

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [book("b1", { libraryId: "lib-b", seriesId: null, seriesName: "Same" })],
      known
    );

    expect(pool).toEqual(known);
    expect(provider.getSeries).not.toHaveBeenCalled();
    expect(provider.getSeriesById).not.toHaveBeenCalled();
  });

  it("resolves the same name separately for two libraries", async () => {
    const provider = makeProvider();
    provider.getSeries.mockImplementation(async (libraryId) => ({
      items: [series(`s-${libraryId}`, { name: "Same", libraryId })],
      nextCursor: null,
    }));
    const known = [series("s-lib-a", { name: "Same", libraryId: "lib-a" })];

    const pool = await resolveSeriesPool(
      asProvider(provider),
      [
        book("b1", { libraryId: "lib-a", seriesId: null, seriesName: "Same" }),
        book("b2", { libraryId: "lib-b", seriesId: null, seriesName: "Same" }),
      ],
      known
    );

    expect(pool.map((item) => item.id)).toEqual(["s-lib-a", "s-lib-b"]);
    expect(provider.getSeries).toHaveBeenCalledTimes(1);
    expect(provider.getSeries).toHaveBeenCalledWith(
      "lib-b",
      undefined,
      20,
      false,
      "Same"
    );
  });
});
