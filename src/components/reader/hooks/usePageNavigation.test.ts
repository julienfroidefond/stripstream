// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedBook } from "@/lib/providers/types";

const hoisted = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  updateReadProgressMock: vi.fn(),
  anonymous: { value: false },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: hoisted.replaceMock, push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/app/actions/read-progress", () => ({
  updateReadProgress: hoisted.updateReadProgressMock,
}));

vi.mock("@/contexts/AnonymousContext", () => ({
  useAnonymous: () => ({ isAnonymous: hoisted.anonymous.value }),
}));

import { usePageNavigation } from "./usePageNavigation";

function makeBook(overrides: Partial<NormalizedBook> = {}): NormalizedBook {
  return {
    id: "book-1",
    libraryId: "lib-1",
    title: "Book 1",
    number: "1",
    seriesId: "series-1",
    volume: 1,
    pageCount: 5,
    thumbnailUrl: "/api/komga/images/books/book-1/thumbnail",
    readProgress: null,
    ...overrides,
  };
}

interface RenderOptions {
  book?: NormalizedBook;
  pages?: number[];
  isDoublePage?: boolean;
  shouldShowDoublePage?: (page: number) => boolean;
  nextBook?: NormalizedBook | null;
}

function renderNav(options: RenderOptions = {}) {
  const {
    book = makeBook(),
    pages = [1, 2, 3, 4, 5],
    isDoublePage = false,
    shouldShowDoublePage = () => false,
    nextBook = null,
  } = options;

  return renderHook(() =>
    usePageNavigation({ book, pages, isDoublePage, shouldShowDoublePage, nextBook })
  );
}

describe("usePageNavigation", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    hoisted.anonymous.value = false;
    hoisted.replaceMock.mockReset();
    hoisted.updateReadProgressMock.mockReset();
    hoisted.updateReadProgressMock.mockResolvedValue({ success: true, message: "" });
  });

  describe("initial page", () => {
    it("starts on the saved page", () => {
      const book = makeBook({
        readProgress: { page: 3, completed: false, lastReadAt: null },
      });

      const { result } = renderNav({ book });

      expect(result.current.currentPage).toBe(3);
    });

    it("starts on page 1 when there is no saved progress", () => {
      const { result } = renderNav();

      expect(result.current.currentPage).toBe(1);
    });

    it("ignores saved progress in anonymous mode", () => {
      hoisted.anonymous.value = true;
      const book = makeBook({
        readProgress: { page: 4, completed: false, lastReadAt: null },
      });

      const { result } = renderNav({ book });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe("navigateToPage", () => {
    it("ignores out-of-bounds targets", () => {
      const { result } = renderNav();

      act(() => {
        result.current.navigateToPage(0);
        result.current.navigateToPage(6);
      });

      expect(result.current.currentPage).toBe(1);
      expect(hoisted.updateReadProgressMock).not.toHaveBeenCalled();
    });

    it("moves to a valid page and debounces the sync", async () => {
      const { result } = renderNav();

      act(() => {
        result.current.navigateToPage(3);
      });

      expect(result.current.currentPage).toBe(3);
      expect(hoisted.updateReadProgressMock).not.toHaveBeenCalled();

      await waitFor(() =>
        expect(hoisted.updateReadProgressMock).toHaveBeenCalledWith(
          "book-1",
          3,
          false,
          "series-1"
        )
      );
    });

    it("persists the last page immediately with completed=true", () => {
      const { result } = renderNav();

      act(() => {
        result.current.navigateToPage(5);
      });

      expect(hoisted.updateReadProgressMock).toHaveBeenCalledTimes(1);
      expect(hoisted.updateReadProgressMock).toHaveBeenCalledWith(
        "book-1",
        5,
        true,
        "series-1"
      );
    });
  });

  describe("handleNextPage", () => {
    it("advances by one page in single-page mode", () => {
      const { result } = renderNav();

      act(() => {
        result.current.handleNextPage();
      });
      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.handleNextPage();
      });
      expect(result.current.currentPage).toBe(3);
    });

    it("shows the end message on the last page without a next book", () => {
      const book = makeBook({
        readProgress: { page: 5, completed: true, lastReadAt: null },
      });
      const { result } = renderNav({ book });

      act(() => {
        result.current.handleNextPage();
      });

      expect(result.current.showEndMessage).toBe(true);
    });

    it("routes to the next book on the last page", () => {
      const book = makeBook({
        readProgress: { page: 5, completed: true, lastReadAt: null },
      });
      const { result } = renderNav({ book, nextBook: makeBook({ id: "book-2" }) });

      act(() => {
        result.current.handleNextPage();
      });

      expect(hoisted.replaceMock).toHaveBeenCalledWith("/books/book-2");
      expect(result.current.showEndMessage).toBe(false);
    });

    it("jumps two pages when double page is active", () => {
      const { result } = renderNav({
        isDoublePage: true,
        shouldShowDoublePage: () => true,
      });

      act(() => {
        result.current.handleNextPage();
      });

      expect(result.current.currentPage).toBe(3);
    });
  });

  describe("handlePreviousPage", () => {
    it("stays on page 1", () => {
      const { result } = renderNav();

      act(() => {
        result.current.handlePreviousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it("goes back two pages when double page is active", () => {
      const book = makeBook({
        readProgress: { page: 3, completed: false, lastReadAt: null },
      });
      const { result } = renderNav({
        book,
        isDoublePage: true,
        shouldShowDoublePage: () => true,
      });

      act(() => {
        result.current.handlePreviousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe("anonymous mode", () => {
    it("never syncs read progress", () => {
      hoisted.anonymous.value = true;
      const { result, unmount } = renderNav();

      act(() => {
        result.current.navigateToPage(4);
      });

      expect(hoisted.updateReadProgressMock).not.toHaveBeenCalled();

      unmount();
      expect(hoisted.updateReadProgressMock).not.toHaveBeenCalled();
    });
  });
});
