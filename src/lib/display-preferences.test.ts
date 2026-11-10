import { describe, expect, it } from "vitest";

import { normalizeDisplayMode } from "./display-preferences";

describe("normalizeDisplayMode", () => {
  it("defaults both views to grid", () => {
    expect(normalizeDisplayMode(undefined)).toMatchObject({
      viewMode: "grid",
      booksViewMode: "grid",
    });
  });

  it("keeps the library view in list while the book view defaults to grid", () => {
    const displayMode = normalizeDisplayMode({ viewMode: "list" });

    expect(displayMode.viewMode).toBe("list");
    expect(displayMode.booksViewMode).toBe("grid");
  });

  it("keeps an explicit book list preference", () => {
    expect(normalizeDisplayMode({ booksViewMode: "list" }).booksViewMode).toBe("list");
  });
});
