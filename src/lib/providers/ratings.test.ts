import { describe, expect, it } from "vitest";

import { communityScoreToTen } from "./ratings";

describe("communityScoreToTen", () => {
  it("converts the 0-5 API score to the /10 scale", () => {
    expect(communityScoreToTen(0)).toBe(0);
    expect(communityScoreToTen(3.5)).toBe(7);
    expect(communityScoreToTen(5)).toBe(10);
  });

  it("returns null when there is no score", () => {
    expect(communityScoreToTen(null)).toBeNull();
    expect(communityScoreToTen(undefined)).toBeNull();
  });

  it("returns null for non-finite values", () => {
    expect(communityScoreToTen(Number.NaN)).toBeNull();
    expect(communityScoreToTen(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
