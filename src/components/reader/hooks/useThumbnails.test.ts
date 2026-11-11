// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NormalizedBook } from "@/lib/providers/types";

import { useThumbnails } from "./useThumbnails";

function makeBook(overrides: Partial<NormalizedBook> = {}): NormalizedBook {
  return {
    id: "book-1",
    libraryId: "library-1",
    title: "Book 1",
    number: "1",
    seriesId: "series-1",
    seriesName: "Series 1",
    volume: null,
    pageCount: 10,
    thumbnailUrl: "/api/komga/images/books/book-1/thumbnail",
    media: {
      pageUrlTemplate: "/api/komga/images/books/book-1/pages/{page}",
      thumbnailUrlTemplate: "/api/komga/images/books/book-1/pages/{page}/thumbnail",
    },
    readProgress: null,
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useThumbnails", () => {
  it("uses the book's thumbnail template instead of branching on the provider", () => {
    const book = makeBook({
      thumbnailUrl: "/api/stripstream/images/books/book-1/thumbnail",
      media: {
        pageUrlTemplate: "/api/stripstream/images/books/book-1/pages/{page}",
        thumbnailUrlTemplate: "/api/stripstream/images/books/book-1/pages/{page}",
      },
    });
    const { result } = renderHook(() =>
      useThumbnails({ book, currentPage: 3 })
    );

    expect(result.current.getThumbnailUrl(7)).toBe(
      "/api/stripstream/images/books/book-1/pages/7"
    );
  });

  it("resolves the Komga page-thumbnail template with a 1-based page", () => {
    const { result } = renderHook(() =>
      useThumbnails({ book: makeBook(), currentPage: 3 })
    );

    expect(result.current.getThumbnailUrl(2)).toBe(
      "/api/komga/images/books/book-1/pages/2/thumbnail"
    );
  });

  it("tracks loaded thumbnails by page number", () => {
    const { result } = renderHook(() =>
      useThumbnails({ book: makeBook(), currentPage: 1 })
    );

    act(() => {
      result.current.handleThumbnailLoad(4);
    });

    expect(result.current.loadedThumbnails).toEqual({ 4: true });
  });

  it("only exposes the current page in the thumbnail window", () => {
    const { result, rerender } = renderHook(
      ({ currentPage }) => useThumbnails({ book: makeBook(), currentPage }),
      { initialProps: { currentPage: 3 } }
    );

    expect(result.current.visibleThumbnails).toEqual([3]);

    rerender({ currentPage: 8 });
    expect(result.current.visibleThumbnails).toEqual([8]);
  });

  it("scrolls the active thumbnail into view", () => {
    const { result } = renderHook(() =>
      useThumbnails({ book: makeBook(), currentPage: 3 })
    );
    const thumbnail = document.createElement("div");
    thumbnail.id = "thumbnail-3";
    const scrollIntoView = vi.fn();
    Object.defineProperty(thumbnail, "scrollIntoView", {
      value: scrollIntoView,
    });
    document.body.append(thumbnail);

    result.current.scrollToActiveThumbnail();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  });
});
