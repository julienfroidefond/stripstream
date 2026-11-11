import { describe, expect, it } from "vitest";

import { komgaPagePath, komgaPageThumbnailPath } from "./komga-paths";

describe("Komga page paths", () => {
  it("maps a 1-based page to Komga's zero-based page index", () => {
    expect(komgaPagePath("book-1", 1)).toBe("books/book-1/pages/0?zero_based=true");
    expect(komgaPagePath("book-1", 12)).toBe("books/book-1/pages/11?zero_based=true");
  });

  it("applies the same mapping to page thumbnails", () => {
    expect(komgaPageThumbnailPath("book-1", 1)).toBe(
      "books/book-1/pages/0/thumbnail?zero_based=true"
    );
    expect(komgaPageThumbnailPath("book-1", 12)).toBe(
      "books/book-1/pages/11/thumbnail?zero_based=true"
    );
  });
});
