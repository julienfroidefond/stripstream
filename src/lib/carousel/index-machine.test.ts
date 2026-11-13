import { describe, expect, it } from "vitest";

import { resolveGoTo, resolveSlidesChange, wrapIndex } from "./index-machine";

describe("wrapIndex", () => {
  it("wraps in both directions", () => {
    expect(wrapIndex(0, 5)).toBe(0);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(6, 5)).toBe(1);
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(-6, 5)).toBe(4);
  });

  it("stays at zero without slides", () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe("resolveGoTo", () => {
  it("accepts a new index", () => {
    expect(resolveGoTo(0, 2, 5)).toEqual({ index: 2, changed: true });
  });

  it("wraps the target", () => {
    expect(resolveGoTo(0, 7, 5)).toEqual({ index: 2, changed: true });
  });

  it("refuses the current slide", () => {
    expect(resolveGoTo(2, 2, 5)).toEqual({ index: 2, changed: false });
    expect(resolveGoTo(2, 7, 5)).toEqual({ index: 2, changed: false });
  });

  it("does nothing without slides", () => {
    expect(resolveGoTo(3, 4, 0)).toEqual({ index: 3, changed: false });
  });
});

describe("resolveSlidesChange", () => {
  it("poses on the first new slide when the row grows", () => {
    expect(resolveSlidesChange(0, 5, 8)).toEqual({ index: 5, moved: true, fromIndex: 0 });
  });

  it("clamps when the row shrinks past the current index", () => {
    expect(resolveSlidesChange(6, 8, 4)).toEqual({ index: 3, moved: true, fromIndex: 6 });
  });

  it("keeps the index when it still exists", () => {
    expect(resolveSlidesChange(1, 8, 4)).toEqual({ index: 1, moved: false, fromIndex: 1 });
  });

  it("keeps the index when the row empties", () => {
    expect(resolveSlidesChange(0, 3, 0)).toEqual({ index: 0, moved: false, fromIndex: 0 });
  });
});
