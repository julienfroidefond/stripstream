import { describe, expect, it } from "vitest";

import { BOOK_PAGE_TOKEN, resolveBookMediaUrl } from "./book-media";

describe("resolveBookMediaUrl", () => {
  it("fills the page token with a 1-based page number", () => {
    expect(
      resolveBookMediaUrl(`/api/komga/images/books/book-1/pages/${BOOK_PAGE_TOKEN}`, 7)
    ).toBe("/api/komga/images/books/book-1/pages/7");
  });

  it("keeps the provider-specific suffix", () => {
    expect(
      resolveBookMediaUrl(
        `/api/komga/images/books/book-1/pages/${BOOK_PAGE_TOKEN}/thumbnail`,
        3
      )
    ).toBe("/api/komga/images/books/book-1/pages/3/thumbnail");
  });

  it("preserves a trailing query string", () => {
    expect(resolveBookMediaUrl(`/images/${BOOK_PAGE_TOKEN}?width=400`, 3)).toBe(
      "/images/3?width=400"
    );
  });

  it("leaves a template without the token unchanged", () => {
    expect(resolveBookMediaUrl("/api/stripstream/images/books/book-1/pages/1", 9)).toBe(
      "/api/stripstream/images/books/book-1/pages/1"
    );
  });
});
