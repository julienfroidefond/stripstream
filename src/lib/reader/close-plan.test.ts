import { describe, expect, it } from "vitest";

import { hasInAppHistory, planReaderClose, readHistoryProbe, readerExitHref } from "./close-plan";

const fresh = { navigationIndex: 0, historyLength: 1 };
const inApp = { navigationIndex: 3, historyLength: 4 };

describe("planReaderClose", () => {
  it("goes back when an in-app page precedes the reader", () => {
    expect(planReaderClose("close", inApp, "s1")).toEqual({ kind: "back" });
  });

  it("replaces with the series when the reader opened in a fresh tab", () => {
    expect(planReaderClose("close", fresh, "s1")).toEqual({
      kind: "replace",
      href: "/series/s1",
    });
  });

  it("falls back to home without a series", () => {
    expect(planReaderClose("close", fresh, null)).toEqual({ kind: "replace", href: "/" });
  });

  it("does not trust a long history made of other sites", () => {
    // Opened from an external link: history.length counts the other site,
    // the Navigation API index does not.
    expect(planReaderClose("close", { navigationIndex: 0, historyLength: 5 }, "s1")).toEqual({
      kind: "replace",
      href: "/series/s1",
    });
  });

  it("always leads to the series for \"back to series\"", () => {
    expect(planReaderClose("series", inApp, "s1")).toEqual({
      kind: "replace",
      href: "/series/s1",
    });
    expect(planReaderClose("series", inApp, null)).toEqual({ kind: "back" });
  });
});

describe("history probe", () => {
  it("uses history.length without the Navigation API", () => {
    expect(hasInAppHistory({ navigationIndex: null, historyLength: 1 })).toBe(false);
    expect(hasInAppHistory({ navigationIndex: null, historyLength: 2 })).toBe(true);
  });

  it("reads the Navigation API index when present", () => {
    const win = {
      history: { length: 3 },
      navigation: { currentEntry: { index: 2 } },
    } as unknown as Window;
    expect(readHistoryProbe(win)).toEqual({ navigationIndex: 2, historyLength: 3 });
    expect(
      readHistoryProbe({ history: { length: 1 } } as unknown as Window)
    ).toEqual({ navigationIndex: null, historyLength: 1 });
  });

  it("encodes the series id", () => {
    expect(readerExitHref("a b")).toBe("/series/a%20b");
  });
});
