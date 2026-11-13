/**
 * Test de contrat partagé de la pagination (ADR 0021).
 *
 * Le même scénario tourne contre les deux implémentations, transport simulé
 * au niveau de `fetch` : un backend contient N éléments, on parcourt
 * `getSeries` et `getBooks` avec `iteratePages`, et chaque élément doit
 * revenir exactement une fois, dans l'ordre, en `ceil(N / taille)` requêtes.
 * Un provider qui renverrait toujours la même page (le bug historique de
 * Komga) échoue ici.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

import { KomgaProvider } from "./komga/komga.provider";
import { StripstreamProvider } from "./stripstream/stripstream.provider";
import { iteratePages } from "./pagination";
import type { IMediaProvider } from "./provider.interface";

const LIBRARY_ID = "lib-1";
const TOTAL = 23;
const PAGE_SIZE = 5;
const ids = Array.from({ length: TOTAL }, (_, index) => `item-${String(index).padStart(2, "0")}`);

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Un backend simulé : sert la tranche demandée et enregistre le numéro de page reçu. */
interface SimulatedBackend {
  name: string;
  create(): IMediaProvider;
  /** Numéros de page tels que le backend les a reçus (sa propre base). */
  requestedPages: number[];
  /** Numéros de page que le backend doit recevoir pour un parcours complet. */
  expectedBackendPages: number[];
  install(): void;
}

function komgaBackend(): SimulatedBackend {
  const requestedPages: number[] = [];
  return {
    name: "Komga (pages Spring en base 0)",
    requestedPages,
    expectedBackendPages: [0, 1, 2, 3, 4],
    create: () => new KomgaProvider("http://komga.test", "auth"),
    install() {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = new URL(String(input));
          const page = Number(url.searchParams.get("page"));
          const size = Number(url.searchParams.get("size"));
          requestedPages.push(page);
          const slice = ids.slice(page * size, page * size + size);
          const totalPages = Math.ceil(TOTAL / size);
          const content = url.pathname.endsWith("/series/list")
            ? slice.map((id) => ({
                id,
                libraryId: LIBRARY_ID,
                name: id,
                booksCount: 1,
                booksReadCount: 0,
                metadata: { title: id, titleSort: id, genres: [], tags: [] },
                booksMetadata: { authors: [] },
              }))
            : slice.map((id) => ({
                id,
                libraryId: LIBRARY_ID,
                name: id,
                seriesId: "series-1",
                metadata: { title: id },
                media: { pagesCount: 1 },
                readProgress: null,
              }));
          return json({
            content,
            number: page,
            size,
            totalPages,
            totalElements: TOTAL,
            first: page === 0,
            last: page >= totalPages - 1,
            empty: content.length === 0,
            numberOfElements: content.length,
          });
        })
      );
    },
  };
}

function stripstreamBackend(): SimulatedBackend {
  const requestedPages: number[] = [];
  return {
    name: "Stripstream (pages Librarian en base 1)",
    requestedPages,
    expectedBackendPages: [1, 2, 3, 4, 5],
    create: () => new StripstreamProvider("http://stream.test", "token"),
    install() {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = new URL(String(input));
          const page = Number(url.searchParams.get("page"));
          const limit = Number(url.searchParams.get("limit"));
          requestedPages.push(page);
          const slice = ids.slice((page - 1) * limit, page * limit);
          const items = url.pathname.endsWith("/series")
            ? slice.map((id) => ({
                series_id: id,
                name: id,
                library_id: LIBRARY_ID,
                book_count: 1,
                books_read_count: 0,
              }))
            : slice.map((id) => ({ id, library_id: LIBRARY_ID, title: id }));
          return json({ items, total: TOTAL, page, limit });
        })
      );
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each([komgaBackend, stripstreamBackend])("pagination contract", (makeBackend) => {
  const probe = makeBackend();

  describe(probe.name, () => {
    it("getSeries: walking every page yields each series exactly once", async () => {
      const backend = makeBackend();
      backend.install();
      const provider = backend.create();

      const series = await iteratePages(
        (page) => provider.getSeries(LIBRARY_ID, page, PAGE_SIZE),
        { max: 100 }
      );

      expect(series.map((item) => item.id)).toEqual(ids);
      expect(backend.requestedPages).toEqual(backend.expectedBackendPages);
    });

    it("getBooks: walking every page yields each book exactly once", async () => {
      const backend = makeBackend();
      backend.install();
      const provider = backend.create();

      const books = await iteratePages(
        (page) => provider.getBooks({ libraryId: LIBRARY_ID, page, limit: PAGE_SIZE }),
        { max: 100 }
      );

      expect(books.map((item) => item.id)).toEqual(ids);
      expect(backend.requestedPages).toEqual(backend.expectedBackendPages);
    });

    it("reports the page it served, 1-based, with the totals", async () => {
      const backend = makeBackend();
      backend.install();
      const provider = backend.create();

      const first = await provider.getBooks({ libraryId: LIBRARY_ID, limit: PAGE_SIZE });
      const third = await provider.getBooks({ libraryId: LIBRARY_ID, page: 3, limit: PAGE_SIZE });

      expect(first).toMatchObject({ page: 1, totalPages: 5, totalElements: TOTAL });
      expect(third).toMatchObject({ page: 3, totalPages: 5, totalElements: TOTAL });
      expect(third.items.map((item) => item.id)).toEqual(ids.slice(10, 15));
    });
  });
});
