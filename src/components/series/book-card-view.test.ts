import { describe, expect, it } from "vitest";

import type { NormalizedBook } from "@/lib/providers/types";
import {
  buildBookCardView,
  type BookCardTranslate,
} from "./book-card-view";

const t: BookCardTranslate = (key, values) => {
  if (values && "number" in values) return `${key}:${values.number}`;
  return key;
};

function makeBook(overrides: Partial<NormalizedBook> = {}): NormalizedBook {
  return {
    id: "book-1",
    libraryId: "library-1",
    title: "Tome 1",
    number: "1",
    seriesId: "series-1",
    seriesName: "Série",
    volume: 1,
    pageCount: 1,
    thumbnailUrl: "/cover.webp",
    media: { pageUrlTemplate: "", thumbnailUrlTemplate: "" },
    readProgress: null,
    volumeType: "regular",
    summary: "  Résumé du tome.  ",
    ...overrides,
  };
}

describe("buildBookCardView", () => {
  it("derives every label once for both layouts", () => {
    const view = buildBookCardView(makeBook(), t, false);

    expect(view).toMatchObject({
      title: "Tome 1",
      coverAriaLabel: "books.coverLink",
      coverAlt: "books.coverAlt",
      volumeLabel: "navigation.volume:1",
      pagesLabel: "1 books.pages",
      totalPages: 1,
      statusInfo: { label: "books.status.unread" },
      isRead: false,
      hasReadProgress: false,
      currentPage: 0,
      progressPercentage: 0,
      completedLabel: "books.completed",
      summary: "Résumé du tome.",
    });
  });

  it("falls back to the volume label when the title is empty", () => {
    const view = buildBookCardView(makeBook({ title: "", number: "3" }), t, false);

    expect(view.title).toBe("navigation.volume:3");
    expect(view.volumeLabel).toBe("navigation.volume:3");
  });

  it("computes progress from the normalized read progress", () => {
    const view = buildBookCardView(
      makeBook({
        pageCount: 100,
        readProgress: { page: 25, completed: false, lastReadAt: null },
      }),
      t,
      false
    );

    expect(view.hasReadProgress).toBe(true);
    expect(view.isRead).toBe(false);
    expect(view.currentPage).toBe(25);
    expect(view.progressPercentage).toBe(25);
  });

  it("clears reading state in anonymous mode", () => {
    const view = buildBookCardView(
      makeBook({
        pageCount: 100,
        readProgress: { page: 100, completed: true, lastReadAt: null },
      }),
      t,
      true
    );

    expect(view.statusInfo).toBeNull();
    expect(view.isRead).toBe(false);
    expect(view.hasReadProgress).toBe(false);
    expect(view.currentPage).toBe(0);
    expect(view.progressPercentage).toBe(0);
  });
});
