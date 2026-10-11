import { describe, expect, it } from "vitest";

import {
  COMPACT_GRID_PAGE_SIZES,
  COMFORTABLE_GRID_PAGE_SIZES,
  getGridPageSizeOptions,
  normalizeGridPageSize,
} from "./pageSize";

describe("getGridPageSizeOptions", () => {
  it("returns the comfortable sizes when not compact", () => {
    expect(getGridPageSizeOptions(false)).toBe(COMFORTABLE_GRID_PAGE_SIZES);
  });

  it("returns the compact sizes when compact", () => {
    expect(getGridPageSizeOptions(true)).toBe(COMPACT_GRID_PAGE_SIZES);
  });
});

describe("normalizeGridPageSize", () => {
  it("returns an exact match unchanged", () => {
    expect(normalizeGridPageSize(60, false)).toBe(60);
    expect(normalizeGridPageSize(48, true)).toBe(48);
  });

  it("falls back to the first option for undefined or NaN", () => {
    expect(normalizeGridPageSize(undefined, false)).toBe(30);
    expect(normalizeGridPageSize(Number.NaN, true)).toBe(24);
  });

  it("falls back to the first option for zero", () => {
    expect(normalizeGridPageSize(0, false)).toBe(30);
  });

  it("snaps to the nearest option", () => {
    expect(normalizeGridPageSize(45, true)).toBe(48);
    expect(normalizeGridPageSize(70, false)).toBe(60);
  });

  it("resolves ties toward the lower option", () => {
    expect(normalizeGridPageSize(36, true)).toBe(24);
  });

  it("handles out-of-range values, including negatives", () => {
    expect(normalizeGridPageSize(1000, false)).toBe(90);
    expect(normalizeGridPageSize(-100, false)).toBe(30);
  });
});
