import { describe, expect, it, vi } from "vitest";

import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";
import { lowerBoundBeforePage, missingBooksForPage } from "./missing-books-page";

const books = (...volumes: number[]) =>
  volumes.map((volume) => ({ id: `b${volume}`, volume, volumeType: "regular" }) as NormalizedBook);
const special = (volume: number | null) =>
  ({ id: `hs${volume}`, volume, volumeType: "hs" }) as NormalizedBook;
const missing = (...volumes: number[]): NormalizedMissingBook[] =>
  volumes.map((volumeNumber) => ({ title: `T${volumeNumber}`, volumeNumber, coverUrl: null }));

const volumesOf = (items: NormalizedMissingBook[]) => items.map((item) => item.volumeNumber);
const NONE = Number.NEGATIVE_INFINITY;

describe("missingBooksForPage", () => {
  const all = missing(2, 31, 45, 70);
  const window = (page: number, totalPages: number, lowerBound: number | null) => ({
    page,
    totalPages,
    unreadOnly: false,
    lowerBound,
  });

  it("shows each missing volume on exactly one page", () => {
    expect(volumesOf(missingBooksForPage(all, books(1, 3, 30), window(1, 3, NONE)))).toEqual([2]);
    expect(volumesOf(missingBooksForPage(all, books(32, 44, 46, 60), window(2, 3, 30)))).toEqual([
      31, 45,
    ]);
    expect(volumesOf(missingBooksForPage(all, books(61, 62), window(3, 3, 60)))).toEqual([70]);
  });

  it("bounds a page with its regular numbered volumes only", () => {
    const page = [...books(32, 44), special(99), { id: "x", volume: null } as NormalizedBook];
    expect(volumesOf(missingBooksForPage(all, page, window(2, 3, 30)))).toEqual([31]);
  });

  it("passes the gaps of a page without numbered volumes to the next page", () => {
    // Page 2 : uniquement des hors-séries. Page 3 reprend après le tome 30.
    expect(missingBooksForPage(all, [special(1), special(2)], window(2, 3, 30))).toEqual([]);
    expect(volumesOf(missingBooksForPage(all, books(40, 50), window(3, 4, 30)))).toEqual([31, 45]);
  });

  it("hides placeholders in the unread view and without a known lower bound", () => {
    expect(missingBooksForPage(all, books(1), { ...window(1, 1, NONE), unreadOnly: true })).toEqual(
      []
    );
    expect(missingBooksForPage(all, books(40), window(2, 2, null))).toEqual([]);
  });
});

describe("lowerBoundBeforePage", () => {
  it("has no lower bound on the first page", async () => {
    const fetchPage = vi.fn();
    await expect(lowerBoundBeforePage(1, fetchPage)).resolves.toBe(NONE);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("walks back past pages without regular numbered volumes", async () => {
    const pages: Record<number, NormalizedBook[]> = {
      1: books(1, 3, 30),
      2: [special(1), special(2)],
    };
    await expect(lowerBoundBeforePage(3, async (page) => pages[page])).resolves.toBe(30);
    await expect(
      lowerBoundBeforePage(3, async () => [special(5)])
    ).resolves.toBe(NONE);
  });

  it("is unknown when a previous page cannot be read", async () => {
    await expect(lowerBoundBeforePage(2, async () => null)).resolves.toBeNull();
  });
});
