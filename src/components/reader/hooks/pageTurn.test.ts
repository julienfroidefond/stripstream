import { describe, expect, it } from "vitest";

import { easeTurn, freeEdgeOffset, leafAngles, planTurn, type ReaderSnapshot } from "./pageTurn";

const rect = (left: number) => ({ left, top: 0, width: 100, height: 150 });

const single = (page: number, url: string | null = `p${page}`): ReaderSnapshot => ({
  currentPage: page,
  slots: [{ url, rect: url ? rect(50) : null }],
});

const spread = (page: number, isRTL = false): ReaderSnapshot => {
  const first = { url: `p${page}`, rect: rect(isRTL ? 100 : 0) };
  const second = { url: `p${page + 1}`, rect: rect(isRTL ? 0 : 100) };
  return { currentPage: page, slots: isRTL ? [second, first] : [first, second] };
};

describe("planTurn", () => {
  it("turns the old page toward the left when reading forward left to right", () => {
    const plan = planTurn(single(3), single(4), false);
    expect(plan).toEqual({
      hinge: "left",
      leaf: { url: "p3", rect: rect(50) },
      backUrl: null,
      under: [],
    });
  });

  it("turns toward the right when going back, or when reading right to left", () => {
    expect(planTurn(single(4), single(3), false)?.hinge).toBe("right");
    expect(planTurn(single(3), single(4), true)?.hinge).toBe("right");
  });

  it("flips the right page of a spread and shows the new left page on its back", () => {
    const plan = planTurn(spread(2), spread(4), false);
    expect(plan?.hinge).toBe("left");
    expect(plan?.leaf.url).toBe("p3");
    expect(plan?.backUrl).toBe("p4");
    expect(plan?.under.map((slot) => slot.url)).toEqual(["p2"]);
  });

  it("flips the left page of a manga spread when reading forward right to left", () => {
    const plan = planTurn(spread(2, true), spread(4, true), true);
    expect(plan?.hinge).toBe("right");
    expect(plan?.leaf.url).toBe("p3");
    expect(plan?.backUrl).toBe("p4");
    expect(plan?.under.map((slot) => slot.url)).toEqual(["p2"]);
  });

  it("uses a blank back when leaving or entering a single page", () => {
    expect(planTurn(single(1), spread(2), false)?.backUrl).toBeNull();
    expect(planTurn(spread(2), single(4), false)?.backUrl).toBeNull();
  });

  it("skips jumps and pages that are not on screen yet", () => {
    expect(planTurn(single(3), single(10), false)).toBeNull();
    expect(planTurn(single(3), single(3), false)).toBeNull();
    expect(planTurn(single(3, null), single(4), false)).toBeNull();
  });
});

describe("leafAngles", () => {
  it("starts and ends flat", () => {
    expect(leafAngles(0, 8).every((angle) => angle === 0)).toBe(true);
    expect(leafAngles(1, 8).every((angle) => angle === 180)).toBe(true);
  });

  it("curls the free edge ahead of the hinge mid-turn, never past 180°", () => {
    const angles = leafAngles(0.5, 8);
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeGreaterThanOrEqual(angles[i - 1]);
    }
    expect(angles[angles.length - 1]).toBeGreaterThan(angles[0]);
    expect(Math.max(...leafAngles(0.9, 8))).toBeLessThanOrEqual(180);
  });
});

describe("freeEdgeOffset", () => {
  it("projects the free edge from flat to folded over", () => {
    expect(freeEdgeOffset(leafAngles(0, 8))).toBeCloseTo(1);
    expect(freeEdgeOffset(leafAngles(1, 8))).toBeCloseTo(-1);
  });
});

describe("easeTurn", () => {
  it("is clamped and symmetric", () => {
    expect(easeTurn(-1)).toBeCloseTo(0);
    expect(easeTurn(2)).toBe(1);
    expect(easeTurn(0.5)).toBeCloseTo(0.5);
  });
});
