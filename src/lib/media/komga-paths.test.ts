import { describe, expect, it } from "vitest";

import { komgaPagePath, komgaPageThumbnailPath } from "./komga-paths";

describe("Komga page paths", () => {
  it("sends the app's 1-based page number unchanged", () => {
    expect(komgaPagePath("book-1", 1)).toBe("books/book-1/pages/1");
    expect(komgaPagePath("book-1", 12)).toBe("books/book-1/pages/12");
  });

  it("uses the same 1-based number for page thumbnails", () => {
    // Komga's thumbnail endpoint has no `zero_based` flag: a zero-based index
    // there showed the previous page and made page 1 a 400.
    expect(komgaPageThumbnailPath("book-1", 1)).toBe(
      "books/book-1/pages/1/thumbnail"
    );
  });
});
