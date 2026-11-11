import { describe, expect, it } from "vitest";

import { getSeriesReadingState, isSeriesRead } from "./series-reading-status";

describe("getSeriesReadingState", () => {
  it("treats an empty series as no-books, never read", () => {
    expect(getSeriesReadingState({ bookCount: 0, booksReadCount: 0 })).toEqual({
      status: "no-books",
      read: 0,
      total: 0,
      progress: 0,
      percent: 0,
    });
    expect(isSeriesRead({ bookCount: 0, booksReadCount: 0 })).toBe(false);
  });

  it("resolves a fully read series", () => {
    expect(getSeriesReadingState({ bookCount: 8, booksReadCount: 8 })).toEqual({
      status: "read",
      read: 8,
      total: 8,
      progress: 1,
      percent: 100,
    });
  });

  it("clamps an over-read series to a finished state", () => {
    expect(getSeriesReadingState({ bookCount: 8, booksReadCount: 11 })).toEqual({
      status: "read",
      read: 8,
      total: 8,
      progress: 1,
      percent: 100,
    });
  });

  it("reports an in-progress series with a normalized ratio", () => {
    expect(getSeriesReadingState({ bookCount: 8, booksReadCount: 3 })).toEqual({
      status: "in-progress",
      read: 3,
      total: 8,
      progress: 3 / 8,
      percent: 38,
    });
  });

  it("reports an unread series", () => {
    expect(getSeriesReadingState({ bookCount: 4, booksReadCount: 0 })).toEqual({
      status: "unread",
      read: 0,
      total: 4,
      progress: 0,
      percent: 0,
    });
  });

  it("normalizes provider counts that are negative, fractional or absent", () => {
    expect(
      getSeriesReadingState({
        bookCount: 4.9,
        booksReadCount: Number.NaN,
      })
    ).toEqual({
      status: "unread",
      read: 0,
      total: 4,
      progress: 0,
      percent: 0,
    });

    expect(
      getSeriesReadingState({
        bookCount: -2,
        booksReadCount: 3,
      })
    ).toEqual({
      status: "no-books",
      read: 0,
      total: 0,
      progress: 0,
      percent: 0,
    });
  });
});
