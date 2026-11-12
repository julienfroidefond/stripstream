import { describe, expect, it, vi } from "vitest";

import {
  planPageJump,
  planPageMove,
  resolveInitialPage,
  type PageMoveState,
} from "./page-navigation";

function state(overrides: Partial<PageMoveState> = {}): PageMoveState {
  return {
    currentPage: 1,
    totalPages: 5,
    isDoublePage: false,
    shouldShowDoublePage: () => false,
    nextBookId: null,
    ...overrides,
  };
}

describe("resolveInitialPage", () => {
  it("starts on page 1 without saved progress", () => {
    expect(resolveInitialPage(null, 10, false)).toBe(1);
    expect(resolveInitialPage(0, 10, false)).toBe(1);
  });

  it("restores a saved page", () => {
    expect(resolveInitialPage(4, 10, false)).toBe(4);
  });

  it("ignores saved progress in anonymous mode", () => {
    expect(resolveInitialPage(4, 10, true)).toBe(1);
  });

  it("clamps a saved page to the last page", () => {
    expect(resolveInitialPage(99, 10, false)).toBe(10);
  });

  it("never returns page 0 for an empty book", () => {
    expect(resolveInitialPage(4, 0, false)).toBe(1);
  });
});

describe("planPageMove", () => {
  describe("previous", () => {
    it("bumps at the start of the book", () => {
      expect(planPageMove("previous", state({ currentPage: 1 }))).toEqual({
        kind: "start-bump",
      });
    });

    it("moves back one page in single-page mode", () => {
      expect(planPageMove("previous", state({ currentPage: 3 }))).toEqual({
        kind: "page",
        page: 2,
      });
    });

    it("moves back two pages when the previous spread is visible", () => {
      const shouldShowDoublePage = vi.fn(() => true);
      expect(
        planPageMove(
          "previous",
          state({ currentPage: 5, isDoublePage: true, shouldShowDoublePage })
        )
      ).toEqual({ kind: "page", page: 3 });
      expect(shouldShowDoublePage).toHaveBeenCalledWith(3);
    });

    it("returns to the cover from page 2 in double-page mode", () => {
      expect(
        planPageMove(
          "previous",
          state({ currentPage: 2, isDoublePage: true, shouldShowDoublePage: () => true })
        )
      ).toEqual({ kind: "page", page: 1 });
    });
  });

  describe("next", () => {
    it("moves forward one page in single-page mode without asking the spread", () => {
      const shouldShowDoublePage = vi.fn(() => true);
      expect(
        planPageMove(
          "next",
          state({ currentPage: 2, isDoublePage: false, shouldShowDoublePage })
        )
      ).toEqual({ kind: "page", page: 3 });
      expect(shouldShowDoublePage).not.toHaveBeenCalled();
    });

    it("moves forward two pages when a spread starts here", () => {
      expect(
        planPageMove(
          "next",
          state({ currentPage: 1, isDoublePage: true, shouldShowDoublePage: () => true })
        )
      ).toEqual({ kind: "page", page: 3 });
    });

    it("clamps a double-page step to the last page", () => {
      expect(
        planPageMove(
          "next",
          state({ currentPage: 4, totalPages: 5, isDoublePage: true, shouldShowDoublePage: () => true })
        )
      ).toEqual({ kind: "page", page: 5 });
    });

    it("routes to the next book at the end", () => {
      expect(
        planPageMove("next", state({ currentPage: 5, nextBookId: "book-2" }))
      ).toEqual({ kind: "next-book", bookId: "book-2" });
    });

    it("ends the book when there is no next book", () => {
      expect(planPageMove("next", state({ currentPage: 5 }))).toEqual({ kind: "end" });
    });

    it("ends an empty book instead of returning page 0", () => {
      expect(planPageMove("next", state({ currentPage: 1, totalPages: 0 }))).toEqual({
        kind: "end",
      });
    });
  });
});

describe("planPageJump", () => {
  it("accepts a page inside the book", () => {
    expect(planPageJump(3, 5)).toEqual({ kind: "page", page: 3 });
  });

  it("rejects pages outside the book", () => {
    expect(planPageJump(0, 5)).toEqual({ kind: "out-of-bounds", page: 0 });
    expect(planPageJump(6, 5)).toEqual({ kind: "out-of-bounds", page: 6 });
  });
});
