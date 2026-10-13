import { describe, expect, it } from "vitest";

import { computeEvictionKeys } from "./imageEviction";

describe("computeEvictionKeys", () => {
  it("keeps the window [current - behind, current + ahead] and evicts the rest", () => {
    const cached = [1, 2, 3, 4, 5, 6, 7];
    expect(computeEvictionKeys(cached, 4, 1, 1, new Set())).toEqual([1, 2, 6, 7]);
  });

  it("keeps the window boundaries inclusive", () => {
    expect(computeEvictionKeys([2, 3, 4, 5, 6], 4, 2, 2, new Set())).toEqual([]);
  });

  it("ignores non-numeric keys such as next-book pages", () => {
    expect(computeEvictionKeys(["next-1", 1, 2, 3], 2, 0, 0, new Set())).toEqual([1, 3]);
  });

  it("accepts numeric strings and normalizes them", () => {
    expect(computeEvictionKeys(["1", "2", "3"], 2, 0, 0, new Set())).toEqual([1, 3]);
  });

  it("preserves keys whose fetch is pending, in number or string form", () => {
    const cached = [1, 2, 3, 4, 5];
    expect(computeEvictionKeys(cached, 3, 0, 0, new Set([1]))).toEqual([2, 4, 5]);
    expect(computeEvictionKeys(cached, 3, 0, 0, new Set(["1"]))).toEqual([2, 4, 5]);
  });

  it("returns an empty list when nothing is cached", () => {
    expect(computeEvictionKeys([], 10, 1, 1, new Set())).toEqual([]);
  });
});
