import { describe, expect, it } from "vitest";

import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";
import { missingBooksForPage } from "./missing-books-page";

const books = (...volumes: number[]) =>
  volumes.map((volume) => ({ id: `b${volume}`, volume, volumeType: "regular" }) as NormalizedBook);
const special = (volume: number | null) =>
  ({ id: `hs${volume}`, volume, volumeType: "hs" }) as NormalizedBook;
const missing = (...volumes: number[]): NormalizedMissingBook[] =>
  volumes.map((volumeNumber) => ({ title: `T${volumeNumber}`, volumeNumber, coverUrl: null }));

const volumesOf = (items: NormalizedMissingBook[]) => items.map((item) => item.volumeNumber);

describe("missingBooksForPage", () => {
  const all = missing(2, 31, 45, 70);

  it("shows each missing volume on exactly one page", () => {
    const page1 = missingBooksForPage(all, books(1, 3, 30), {
      page: 1,
      totalPages: 3,
      unreadOnly: false,
      previousPageBooks: null,
    });
    const page2 = missingBooksForPage(all, books(32, 44, 46, 60), {
      page: 2,
      totalPages: 3,
      unreadOnly: false,
      previousPageBooks: books(1, 3, 30),
    });
    const page3 = missingBooksForPage(all, books(61, 62), {
      page: 3,
      totalPages: 3,
      unreadOnly: false,
      previousPageBooks: books(32, 44, 46, 60),
    });

    expect(volumesOf(page1)).toEqual([2]);
    expect(volumesOf(page2)).toEqual([31, 45]);
    expect(volumesOf(page3)).toEqual([70]);
  });

  it("hides placeholders in the unread view", () => {
    expect(
      missingBooksForPage(all, books(1), {
        page: 1,
        totalPages: 1,
        unreadOnly: true,
        previousPageBooks: null,
      })
    ).toEqual([]);
  });

  it("keeps every placeholder on a single page", () => {
    expect(
      volumesOf(
        missingBooksForPage(all, books(1), {
          page: 1,
          totalPages: 1,
          unreadOnly: false,
          previousPageBooks: null,
        })
      )
    ).toEqual([2, 31, 45, 70]);
  });

  it("omits placeholders rather than duplicating them without a lower bound", () => {
    expect(
      missingBooksForPage(all, books(40), {
        page: 2,
        totalPages: 2,
        unreadOnly: false,
        previousPageBooks: null,
      })
    ).toEqual([]);
  });

  it("ignores hors-séries and unnumbered books when bounding a page", () => {
    // La page précédente finit par un hors-série n°1 : la borne reste 30.
    const page2 = missingBooksForPage(all, [...books(32, 44, 46, 60), special(99)], {
      page: 2,
      totalPages: 3,
      unreadOnly: false,
      previousPageBooks: [...books(1, 3, 30), special(1), { id: "x", volume: null } as NormalizedBook],
    });
    expect(volumesOf(page2)).toEqual([31, 45]);
  });
});
