import { describe, expect, it } from "vitest";

import { nextRatingForKey } from "./rating-keys";

describe("nextRatingForKey", () => {
  it("moves by half a star with the arrows", () => {
    expect(nextRatingForKey("ArrowRight", 6, 10)).toBe(7);
    expect(nextRatingForKey("ArrowUp", 6, 10)).toBe(7);
    expect(nextRatingForKey("ArrowLeft", 6, 10)).toBe(5);
    expect(nextRatingForKey("ArrowDown", 6, 10)).toBe(5);
  });

  it("moves by a full star with Page Up / Page Down", () => {
    expect(nextRatingForKey("PageUp", 6, 10)).toBe(8);
    expect(nextRatingForKey("PageDown", 6, 10)).toBe(4);
  });

  it("jumps to the bounds with Home / End", () => {
    expect(nextRatingForKey("Home", 6, 10)).toBe(1);
    expect(nextRatingForKey("End", 6, 10)).toBe(10);
  });

  it("starts an unrated series at half a star and never goes below it", () => {
    expect(nextRatingForKey("ArrowRight", null, 10)).toBe(1);
    expect(nextRatingForKey("ArrowLeft", null, 10)).toBe(1);
    expect(nextRatingForKey("ArrowLeft", 1, 10)).toBe(1);
  });

  it("stays at the maximum", () => {
    expect(nextRatingForKey("ArrowRight", 10, 10)).toBe(10);
    expect(nextRatingForKey("PageUp", 9, 10)).toBe(10);
  });

  it("ignores unrelated keys", () => {
    expect(nextRatingForKey("Tab", 6, 10)).toBeNull();
    expect(nextRatingForKey("a", 6, 10)).toBeNull();
  });
});
