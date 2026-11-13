import { describe, expect, it, vi } from "vitest";

import {
  lastVisiblePage,
  planPageJump,
  planPageMove,
  progressPageFor,
  resolveInitialPage,
  spreadStartFor,
  type PageMoveState,
} from "./page-navigation";

/** The reader's real spread predicate: the cover and the last page are alone. */
function spreadBook(totalPages: number, currentPage: number): PageMoveState {
  return {
    currentPage,
    totalPages,
    isDoublePage: true,
    shouldShowDoublePage: (page) => page !== 1 && page < totalPages,
    nextBookId: null,
  };
}

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
          state({ currentPage: 6, isDoublePage: true, shouldShowDoublePage })
        )
      ).toEqual({ kind: "page", page: 4 });
      expect(shouldShowDoublePage).toHaveBeenCalledWith(4);
    });

    it("keeps the even pairs when going back from the last page of an odd book", () => {
      expect(planPageMove("previous", spreadBook(9, 9))).toEqual({ kind: "page", page: 8 });
      expect(planPageMove("previous", spreadBook(9, 8))).toEqual({ kind: "page", page: 6 });
    });

    it("realigns on an even spread after a jump to an odd page", () => {
      expect(planPageMove("previous", spreadBook(12, 5))).toEqual({ kind: "page", page: 4 });
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

    it("treats a spread that contains the last page as the end of the book", () => {
      // 9 pages: 1, 2-3, 4-5, 6-7, 8-9. "Next" on 8-9 must not show 9 alone.
      expect(planPageMove("next", spreadBook(9, 8))).toEqual({ kind: "end" });
      expect(planPageMove("next", { ...spreadBook(9, 8), nextBookId: "book-2" })).toEqual({
        kind: "next-book",
        bookId: "book-2",
      });
    });

    it("walks an odd book in even pairs up to the final spread", () => {
      const visited: number[] = [];
      let page = 1;
      for (;;) {
        visited.push(page);
        const move = planPageMove("next", spreadBook(9, page));
        if (move.kind !== "page") break;
        page = move.page;
      }
      expect(visited).toEqual([1, 2, 4, 6, 8]);
    });

    it("shows the last page of an even book alone after the last spread", () => {
      expect(planPageMove("next", spreadBook(10, 8))).toEqual({ kind: "page", page: 10 });
      expect(planPageMove("next", spreadBook(10, 10))).toEqual({ kind: "end" });
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

  it("lands on the start of the spread that contains the target", () => {
    expect(planPageJump(9, 9, spreadBook(9, 1))).toEqual({ kind: "page", page: 8 });
    expect(planPageJump(5, 9, spreadBook(9, 1))).toEqual({ kind: "page", page: 4 });
    expect(planPageJump(1, 9, spreadBook(9, 1))).toEqual({ kind: "page", page: 1 });
    expect(planPageJump(10, 10, spreadBook(10, 1))).toEqual({ kind: "page", page: 10 });
  });
});

describe("spread helpers", () => {
  it("knows the last visible page", () => {
    expect(lastVisiblePage(8, spreadBook(9, 8))).toBe(9);
    expect(lastVisiblePage(1, spreadBook(9, 1))).toBe(1);
    expect(lastVisiblePage(8, state({ totalPages: 9 }))).toBe(8);
  });

  it("records a final spread as the last page", () => {
    expect(progressPageFor(8, 9, spreadBook(9, 8))).toBe(9);
    expect(progressPageFor(6, 9, spreadBook(9, 6))).toBe(6);
    expect(progressPageFor(8, 9, state({ totalPages: 9 }))).toBe(8);
  });

  it("aligns spreads on even pages", () => {
    expect(spreadStartFor(7, spreadBook(9, 1))).toBe(6);
    expect(spreadStartFor(1, spreadBook(9, 1))).toBe(1);
    expect(spreadStartFor(7, state({ totalPages: 9 }))).toBe(7);
  });
});
