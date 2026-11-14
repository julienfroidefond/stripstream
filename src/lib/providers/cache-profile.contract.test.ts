/**
 * Test de contrat des profils de cache (ADR 0028).
 *
 * Pour une même lecture, Komga et Stripstream doivent remettre à leur
 * mécanisme de cache le même profil (`cacheProfile.*`) : même TTL, mêmes tags.
 * On intercepte `ProviderTransport.request` (les deux providers y passent) et
 * `unstable_cache` (les flux d'accueil Komga), sans réseau.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const unstableCacheOptions = vi.hoisted(() => [] as unknown[]);

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, _keys: string[], options: unknown) => {
    unstableCacheOptions.push(options);
    return fn;
  },
}));

import { cacheProfile, type CacheProfile } from "@/lib/cache/profiles";

import { KomgaProvider } from "./komga/komga.provider";
import { ProviderTransport, type ProviderRequestOptions } from "./provider-transport";
import { StripstreamProvider } from "./stripstream/stripstream.provider";

interface RecordedRequest {
  path: string;
  options: ProviderRequestOptions;
}

let requests: RecordedRequest[] = [];

const emptyKomgaPage = { content: [], number: 0, size: 20, totalPages: 1, totalElements: 0 };
const emptyStripstreamPage = { items: [], total: 0, page: 1, limit: 20 };

function fakeResponse(path: string): unknown {
  // Komga
  if (path === "series/list" || path === "books/list") return emptyKomgaPage;
  if (path === "series/latest" || path === "books/latest" || path === "books/ondeck") {
    return emptyKomgaPage;
  }
  // Stripstream
  if (path === "series" || path === "books") return emptyStripstreamPage;
  if (path.endsWith("/details")) return { series_id: "s1" };
  if (path.endsWith("/progress")) return { status: "reading", current_page: 3 };
  if (path === "search") return { hits: [], series_hits: [] };
  if (path === "books/ongoing" || path === "series/ongoing") return [];
  // Communs
  if (path === "libraries") return [];
  if (path.startsWith("books/")) return { id: "b1", readProgress: null };
  return null;
}

/** Ne garde que ce qu'un profil décide : TTL, tags, politique `no-store`. */
function profileOf(options: ProviderRequestOptions | unknown): CacheProfile {
  const { revalidate, tags, cache } = (options ?? {}) as ProviderRequestOptions;
  return {
    ...(revalidate !== undefined ? { revalidate } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(cache !== undefined ? { cache } : {}),
  } as CacheProfile;
}

function profilesFor(predicate: (path: string) => boolean): CacheProfile[] {
  return requests.filter(({ path }) => predicate(path)).map(({ options }) => profileOf(options));
}

beforeEach(() => {
  requests = [];
  unstableCacheOptions.length = 0;
  vi.spyOn(ProviderTransport.prototype, "request").mockImplementation(
    async (path: string, _params?: unknown, options: ProviderRequestOptions = {}) => {
      requests.push({ path, options });
      return fakeResponse(path) as never;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const komga = (): KomgaProvider => new KomgaProvider("http://komga.test", "auth");
const stripstream = (): StripstreamProvider => new StripstreamProvider("http://stripstream.test", "token");

describe("cache profiles — Komga and Stripstream hand over the same profile", () => {
  it("getBooks for a series of a library", async () => {
    const expected = cacheProfile.books({ seriesId: "s1", libraryId: "lib1" });

    await komga().getBooks({ seriesId: "s1", libraryId: "lib1" });
    const komgaProfiles = profilesFor((path) => path === "books/list");
    requests = [];
    await stripstream().getBooks({ seriesId: "s1", libraryId: "lib1" });
    const stripstreamProfiles = profilesFor((path) => path === "books");

    expect(komgaProfiles).toEqual([expected]);
    expect(stripstreamProfiles).toEqual([expected]);
  });

  it("getBooks for a whole library", async () => {
    const expected = cacheProfile.books({ libraryId: "lib1" });

    await komga().getBooks({ libraryId: "lib1" });
    const komgaProfiles = profilesFor((path) => path === "books/list");
    requests = [];
    await stripstream().getBooks({ libraryId: "lib1" });
    const stripstreamProfiles = profilesFor((path) => path === "books");

    expect(komgaProfiles).toEqual([expected]);
    expect(stripstreamProfiles).toEqual([expected]);
  });

  it("getSeries of a library", async () => {
    const expected = cacheProfile.librarySeries("lib1");

    await komga().getSeries("lib1");
    const komgaProfiles = profilesFor((path) => path === "series/list");
    requests = [];
    await stripstream().getSeries("lib1");
    const stripstreamProfiles = profilesFor((path) => path === "series");

    expect(komgaProfiles).toEqual([expected]);
    expect(stripstreamProfiles).toEqual([expected]);
  });

  it("getLibraries", async () => {
    await komga().getLibraries();
    const komgaProfiles = profilesFor((path) => path === "libraries");
    requests = [];
    await stripstream().getLibraries();
    const stripstreamProfiles = profilesFor((path) => path === "libraries");

    expect(komgaProfiles).toEqual([cacheProfile.libraries()]);
    expect(stripstreamProfiles).toEqual([cacheProfile.libraries()]);
  });

  it("getReadProgress", async () => {
    await komga().getReadProgress("b1");
    const komgaProfiles = profilesFor(() => true);
    requests = [];
    await stripstream().getReadProgress("b1");
    const stripstreamProfiles = profilesFor(() => true);

    expect(komgaProfiles).toEqual([cacheProfile.readProgress()]);
    expect(stripstreamProfiles).toEqual([cacheProfile.readProgress()]);
  });

  it("getBook keeps the reader position out of every cache", async () => {
    await komga().getBook("b1");
    const komgaProfiles = profilesFor((path) => path === "books/b1");
    requests = [];
    await stripstream()
      .getBook("b1")
      .catch(() => undefined);
    const stripstreamProfiles = profilesFor((path) => path === "books/b1");

    expect(komgaProfiles).toEqual([cacheProfile.readerBook()]);
    expect(stripstreamProfiles).toEqual([cacheProfile.readerBook()]);
  });

  it("search", async () => {
    await komga().search("tintin");
    const komgaProfiles = profilesFor(() => true);
    requests = [];
    await stripstream().search("tintin");
    const stripstreamProfiles = profilesFor((path) => path === "search");

    expect(komgaProfiles).toEqual([cacheProfile.search(), cacheProfile.search()]);
    expect(stripstreamProfiles).toEqual([cacheProfile.search()]);
  });

  it("home feeds (unstable_cache on Komga, fetch options on Stripstream)", async () => {
    await komga().getHomeOngoingSeries();
    await komga().getHomeLatestSeries();
    await komga().getHomeRecentlyRead();
    await komga().getHomeContinueReadingData();
    const komgaProfiles = unstableCacheOptions.map(profileOf);

    await stripstream().getHomeOngoingSeries();
    await stripstream().getHomeLatestSeries();
    await stripstream().getHomeRecentlyRead();
    await stripstream().getHomeContinueReadingData();
    const stripstreamProfiles = requests
      .filter(({ path }) => ["series/ongoing", "series", "books", "books/ongoing"].includes(path))
      .map(({ options }) => profileOf(options));

    expect(komgaProfiles).toEqual(Array(4).fill(cacheProfile.home()));
    expect(stripstreamProfiles).toEqual(Array(4).fill(cacheProfile.home()));
  });

  it("getSeriesById expires with the series' read progress", async () => {
    const expected = cacheProfile.seriesDetail("s1");

    await komga().getSeriesById("s1").catch(() => null);
    const komgaProfiles = profilesFor((path) => path === "series/s1");
    requests = [];
    await stripstream().getSeriesById("s1").catch(() => null);
    const stripstreamProfiles = profilesFor((path) => path === "series/s1/details");

    expect(komgaProfiles).toEqual([expected]);
    expect(stripstreamProfiles).toEqual([expected]);
  });

  it("getNextBook", async () => {
    await komga().getNextBook("b1");
    const komgaProfiles = profilesFor((path) => path === "books/b1/next");
    requests = [];
    await stripstream().getNextBook("b1");
    const stripstreamProfiles = profilesFor((path) => path === "books/b1");

    expect(komgaProfiles).toEqual([cacheProfile.nextBook()]);
    expect(stripstreamProfiles).toEqual([cacheProfile.nextBook()]);
  });

  it("reading stats", async () => {
    await komga().getReadingStats();
    const komgaProfiles = profilesFor(() => true);
    requests = [];
    await stripstream().getReadingStats();
    const stripstreamProfiles = profilesFor(() => true);

    expect(new Set(komgaProfiles.map((profile) => JSON.stringify(profile)))).toEqual(
      new Set([JSON.stringify(cacheProfile.stats())])
    );
    expect(new Set(stripstreamProfiles.map((profile) => JSON.stringify(profile)))).toEqual(
      new Set([JSON.stringify(cacheProfile.stats())])
    );
  });
});
