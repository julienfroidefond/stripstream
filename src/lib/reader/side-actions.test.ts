import { describe, expect, it } from "vitest";

import { planPageMove } from "./page-navigation";
import {
  actionForSide,
  arrowGlyphForAction,
  canTurnPage,
  isViewportZoomed,
  resolveSideAction,
  sideForAction,
  sideForArrowKey,
  sideForSwipe,
  spreadOrder,
  startBumpMotion,
  SWIPE_MIN_DISTANCE,
  ZOOM_SCALE_THRESHOLD,
  type ReaderSide,
  type ReadingDirection,
} from "./side-actions";

const SIDES: ReaderSide[] = ["left", "right"];
const DIRECTIONS: ReadingDirection[] = ["ltr", "rtl"];

describe("actionForSide / sideForAction", () => {
  it("goes back on the left in LTR", () => {
    expect(actionForSide("left", "ltr")).toBe("previous");
    expect(actionForSide("right", "ltr")).toBe("next");
  });

  it("goes forward on the left in RTL", () => {
    expect(actionForSide("left", "rtl")).toBe("next");
    expect(actionForSide("right", "rtl")).toBe("previous");
  });

  it("is the inverse of sideForAction in both directions", () => {
    for (const direction of DIRECTIONS) {
      for (const side of SIDES) {
        expect(sideForAction(actionForSide(side, direction), direction)).toBe(side);
      }
    }
  });
});

describe("resolveSideAction", () => {
  it("hides previous and shows next on the first page in LTR", () => {
    const state = { direction: "ltr" as const, currentPage: 1, totalPages: 10 };
    expect(resolveSideAction("left", state)).toEqual({
      side: "left",
      action: "previous",
      visible: false,
      labelKey: "reader.controls.previousPage",
    });
    expect(resolveSideAction("right", state)).toEqual({
      side: "right",
      action: "next",
      visible: true,
      labelKey: "reader.controls.nextPage",
    });
  });

  it("shows the left arrow as next on the first page of an RTL book", () => {
    // Regression: the left arrow used to be hidden on page 1 because its
    // visibility was tied to the side, while it actually moves forward.
    const state = { direction: "rtl" as const, currentPage: 1, totalPages: 10 };
    expect(resolveSideAction("left", state)).toEqual({
      side: "left",
      action: "next",
      visible: true,
      labelKey: "reader.controls.nextPage",
    });
    expect(resolveSideAction("right", state)).toMatchObject({
      action: "previous",
      visible: false,
      labelKey: "reader.controls.previousPage",
    });
  });

  it("hides next on the last page in both directions", () => {
    expect(resolveSideAction("right", { direction: "ltr", currentPage: 10, totalPages: 10 }))
      .toMatchObject({ action: "next", visible: false });
    expect(resolveSideAction("left", { direction: "rtl", currentPage: 10, totalPages: 10 }))
      .toMatchObject({ action: "next", visible: false });
    expect(resolveSideAction("right", { direction: "rtl", currentPage: 10, totalPages: 10 }))
      .toMatchObject({ action: "previous", visible: true });
  });

  it("hides both arrows on a single-page book", () => {
    for (const direction of DIRECTIONS) {
      for (const side of SIDES) {
        expect(resolveSideAction(side, { direction, currentPage: 1, totalPages: 1 }).visible).toBe(false);
      }
    }
  });

  it("is visible exactly when the page-move policy turns a page", () => {
    for (const isDoublePage of [false, true]) {
      for (let currentPage = 1; currentPage <= 6; currentPage++) {
        for (const action of ["previous", "next"] as const) {
          const move = planPageMove(action, {
            currentPage,
            totalPages: 6,
            isDoublePage,
            shouldShowDoublePage: (page) => page > 1,
            nextBookId: "next",
          });
          expect(canTurnPage(action, { currentPage, totalPages: 6 })).toBe(move.kind === "page");
        }
      }
    }
  });
});

describe("spatial inputs", () => {
  it("maps arrow keys to sides and ignores other keys", () => {
    expect(sideForArrowKey("ArrowLeft")).toBe("left");
    expect(sideForArrowKey("ArrowRight")).toBe("right");
    expect(sideForArrowKey("PageUp")).toBeNull();
  });

  it("maps a right swipe to the left side and a left swipe to the right side", () => {
    expect(sideForSwipe(80, 0)).toBe("left");
    expect(sideForSwipe(-80, 0)).toBe("right");
  });

  it("ignores short and mostly vertical swipes", () => {
    expect(sideForSwipe(SWIPE_MIN_DISTANCE, 0)).toBeNull();
    expect(sideForSwipe(SWIPE_MIN_DISTANCE + 1, 0)).toBe("left");
    expect(sideForSwipe(60, 90)).toBeNull();
  });

  it("treats a scale above the shared threshold as zoomed", () => {
    expect(isViewportZoomed(undefined)).toBe(false);
    expect(isViewportZoomed(1)).toBe(false);
    expect(isViewportZoomed(ZOOM_SCALE_THRESHOLD)).toBe(false);
    expect(isViewportZoomed(1.3)).toBe(true);
  });
});

describe("layout", () => {
  it("puts the earlier page of a spread on the previous side", () => {
    expect(spreadOrder("ltr")).toEqual([0, 1]);
    expect(spreadOrder("rtl")).toEqual([1, 0]);
  });

  it("pulls the start bump toward the previous gesture", () => {
    expect(startBumpMotion("ltr")).toEqual({ pull: 22, tilt: -4 });
    expect(startBumpMotion("rtl")).toEqual({ pull: -22, tilt: 4 });
  });

  it("shows the arrow glyph of the key that triggers each action", () => {
    expect(arrowGlyphForAction("previous", "ltr")).toBe("←");
    expect(arrowGlyphForAction("next", "ltr")).toBe("→");
    expect(arrowGlyphForAction("previous", "rtl")).toBe("→");
    expect(arrowGlyphForAction("next", "rtl")).toBe("←");
  });
});
