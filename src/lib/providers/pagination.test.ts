import { describe, expect, it, vi } from "vitest";

import { iteratePages, normalizePageNumber, pageCount, type Page } from "./pagination";

function pagesOf(chunks: string[][], totalPages = chunks.length) {
  return vi.fn(async (page: number): Promise<Page<string>> => ({
    items: chunks[page - 1] ?? [],
    page,
    totalPages,
    totalElements: chunks.flat().length,
  }));
}

describe("pageCount", () => {
  it("rounds up and never drops below one page", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(20, 20)).toBe(1);
    expect(pageCount(21, 20)).toBe(2);
    expect(pageCount(5, 0)).toBe(5);
  });
});

describe("normalizePageNumber", () => {
  it("defaults to the first page for anything that is not an integer >= 1", () => {
    expect(normalizePageNumber(undefined)).toBe(1);
    expect(normalizePageNumber(0)).toBe(1);
    expect(normalizePageNumber(-2)).toBe(1);
    expect(normalizePageNumber(1.5)).toBe(1);
    expect(normalizePageNumber(Number.NaN)).toBe(1);
    expect(normalizePageNumber(4)).toBe(4);
  });
});

describe("iteratePages", () => {
  it("reads pages 1..totalPages once each and keeps their order", async () => {
    const fetchPage = pagesOf([["a", "b"], ["c", "d"], ["e"]]);

    await expect(iteratePages(fetchPage, { max: 10 })).resolves.toEqual(["a", "b", "c", "d", "e"]);
    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([1, 2, 3]);
  });

  it("stops at max pages", async () => {
    const fetchPage = pagesOf([["a"], ["b"], ["c"], ["d"]]);

    await expect(iteratePages(fetchPage, { max: 2 })).resolves.toEqual(["a", "b"]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("stops on the first empty page even when more are announced", async () => {
    const fetchPage = pagesOf([["a"], [], ["c"]], 3);

    await expect(iteratePages(fetchPage, { max: 10 })).resolves.toEqual(["a"]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("does not request a second page when the first is empty or the only one", async () => {
    const empty = pagesOf([[]], 4);
    await expect(iteratePages(empty, { max: 10 })).resolves.toEqual([]);
    expect(empty).toHaveBeenCalledTimes(1);

    const single = pagesOf([["a"]]);
    await iteratePages(single, { max: 10 });
    expect(single).toHaveBeenCalledTimes(1);
  });

  it("fetches the remaining pages in parallel batches when asked", async () => {
    let inFlight = 0;
    let peak = 0;
    const chunks = [["a"], ["b"], ["c"], ["d"], ["e"]];
    const fetchPage = async (page: number): Promise<Page<string>> => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return { items: chunks[page - 1] ?? [], page, totalPages: 5, totalElements: 5 };
    };

    await expect(iteratePages(fetchPage, { max: 5, concurrency: 2 })).resolves.toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
    expect(peak).toBe(2);
  });

  it("returns nothing for a non-positive max", async () => {
    const fetchPage = pagesOf([["a"]]);

    await expect(iteratePages(fetchPage, { max: 0 })).resolves.toEqual([]);
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
