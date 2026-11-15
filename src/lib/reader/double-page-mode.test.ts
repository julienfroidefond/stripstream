import { describe, expect, it } from "vitest";
import { canDisplayDoublePage } from "./double-page-mode";

describe("canDisplayDoublePage", () => {
  const options = {
    isDoublePage: true,
    pageNumber: 8,
    totalPages: 24,
  };

  it("shows the next page on a tablet in landscape even when its viewport is short", () => {
    expect(
      canDisplayDoublePage({
        ...options,
        screenWidth: 1194,
        screenHeight: 834,
      })
    ).toBe(true);
  });

  it("keeps phones in single-page mode in landscape", () => {
    expect(
      canDisplayDoublePage({
        ...options,
        screenWidth: 852,
        screenHeight: 393,
      })
    ).toBe(false);
  });

  it("does not show a spread when double-page mode is off", () => {
    expect(
      canDisplayDoublePage({
        ...options,
        isDoublePage: false,
        screenWidth: 1194,
        screenHeight: 834,
      })
    ).toBe(false);
  });

  it("keeps the cover and final page alone", () => {
    const screen = { screenWidth: 1194, screenHeight: 834 };

    expect(
      canDisplayDoublePage({ ...options, ...screen, pageNumber: 1 })
    ).toBe(false);
    expect(
      canDisplayDoublePage({ ...options, ...screen, pageNumber: 24 })
    ).toBe(false);
  });
});
