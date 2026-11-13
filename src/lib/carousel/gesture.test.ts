import { describe, expect, it } from "vitest";

import {
  AXIS_SLOP,
  SWIPE_THRESHOLD_MIN,
  beginDrag,
  moveDrag,
  ownsDrag,
  planPress,
  releaseDrag,
  shouldSuppressClick,
  snapDuration,
  type DragState,
} from "./gesture";

function drag(overrides: Partial<DragState> = {}): DragState {
  return {
    pointerId: 1,
    startX: 100,
    startY: 100,
    baseX: 0,
    offsetX: 0,
    axis: "horizontal",
    lastX: 100,
    lastTime: 0,
    velocity: 0,
    ...overrides,
  };
}

describe("beginDrag", () => {
  it("opens a pending drag", () => {
    const state = beginDrag({ enabled: true, pointerId: 1, x: 100, y: 100, baseX: -40, time: 10 });

    expect(state).toEqual({
      pointerId: 1,
      startX: 100,
      startY: 100,
      baseX: -40,
      offsetX: 0,
      axis: "pending",
      lastX: 100,
      lastTime: 10,
      velocity: 0,
    });
  });

  it("refuses when the gesture is disabled or the motion is reduced", () => {
    expect(
      beginDrag({ enabled: false, pointerId: 1, x: 100, y: 100, baseX: 0, time: 0 })
    ).toBeNull();
  });
});

describe("moveDrag", () => {
  it("waits under the axis slop", () => {
    const state = drag({ axis: "pending" });
    const result = moveDrag(state, { x: 101, y: 101, time: 16 });

    expect(result.capture).toBe(false);
    expect(result.state.axis).toBe("pending");
    expect(result.offsetX).toBe(0);
  });

  it("locks a horizontal gesture and asks for capture once", () => {
    const state = drag({ axis: "pending" });
    const first = moveDrag(state, { x: 100 + AXIS_SLOP + 4, y: 102, time: 16 });
    const second = moveDrag(first.state, { x: 140, y: 102, time: 32 });

    expect(first.capture).toBe(true);
    expect(first.state.axis).toBe("horizontal");
    expect(first.offsetX).toBe(AXIS_SLOP + 4);
    expect(second.capture).toBe(false);
    expect(second.state.axis).toBe("horizontal");
    expect(second.offsetX).toBe(40);
  });

  it("abandons a vertical gesture and ignores later moves", () => {
    const state = drag({ axis: "pending" });
    const locked = moveDrag(state, { x: 102, y: 130, time: 16 });
    const later = moveDrag(locked.state, { x: 180, y: 130, time: 32 });

    expect(locked.state.axis).toBe("vertical");
    expect(later.offsetX).toBe(0);
    expect(later.capture).toBe(false);
  });

  it("smooths the velocity across moves", () => {
    const state = drag({ lastX: 100, lastTime: 0, velocity: 1 });
    const result = moveDrag(state, { x: 130, y: 100, time: 10 });

    // 1 * 0.7 + (30 / 10) * 0.3
    expect(result.state.velocity).toBeCloseTo(1.6);
  });

  it("keeps the previous velocity when the clock does not advance", () => {
    const state = drag({ lastX: 100, lastTime: 10, velocity: 0.5 });
    const result = moveDrag(state, { x: 130, y: 100, time: 10 });

    expect(result.state.velocity).toBe(0.5);
  });
});

describe("releaseDrag", () => {
  it("settles a short slow drag", () => {
    const release = releaseDrag(drag({ offsetX: -30, velocity: -0.1 }), {
      time: 100,
      width: 320,
    });

    expect(release.threshold).toBe(SWIPE_THRESHOLD_MIN);
    expect(release.advance).toBe(false);
  });

  it("advances past the distance threshold", () => {
    const release = releaseDrag(drag({ offsetX: -80, velocity: -0.1 }), {
      time: 100,
      width: 320,
    });

    expect(release.advance).toBe(true);
    expect(release.direction).toBe(1);
  });

  it("advances a short fast flick in the opposite direction", () => {
    const release = releaseDrag(drag({ offsetX: 20, velocity: 0.8, lastTime: 90 }), {
      time: 100,
      width: 320,
    });

    expect(release.advance).toBe(true);
    expect(release.direction).toBe(-1);
  });

  it("scales the threshold with the track width", () => {
    const release = releaseDrag(drag({ offsetX: -100, velocity: 0 }), {
      time: 100,
      width: 1200,
    });

    expect(release.threshold).toBe(144);
    expect(release.advance).toBe(false);
  });

  it("ignores the momentum after a pause", () => {
    const state = drag({ offsetX: -20, velocity: -1, lastTime: 0 });
    const release = releaseDrag(state, { time: 200, width: 320 });

    expect(release.velocity).toBe(0);
    expect(release.advance).toBe(false);
  });

  it("never advances from a vertical gesture", () => {
    const release = releaseDrag(drag({ axis: "vertical", offsetX: -300, velocity: -2 }), {
      time: 100,
      width: 320,
    });

    expect(release.advance).toBe(false);
  });
});

describe("snapDuration", () => {
  it("stays between the fast and slow bounds", () => {
    expect(snapDuration(0)).toBe(0.22);
    expect(snapDuration(440)).toBe(0.22);
    expect(snapDuration(660)).toBe(0.3);
    expect(snapDuration(4000)).toBe(0.42);
  });
});

describe("planPress", () => {
  it("commits a pending swipe and restarts from the new slide's center", () => {
    expect(planPress({ trackX: -1500, width: 1000, pendingSwipe: true })).toEqual({
      commitSwipe: true,
      baseX: -1000,
    });
  });

  it("picks up the track where it is while it settles back", () => {
    expect(planPress({ trackX: -1200, width: 1000, pendingSwipe: false })).toEqual({
      commitSwipe: false,
      baseX: -1200,
    });
  });

  it("falls back to the center when the position is unknown", () => {
    expect(planPress({ trackX: Number.NaN, width: 1000, pendingSwipe: false }).baseX).toBe(-1000);
    expect(planPress({ trackX: 0, width: 1000, pendingSwipe: false }).baseX).toBe(-1000);
  });
});

describe("ownsDrag", () => {
  it("only accepts the pointer that opened the drag", () => {
    expect(ownsDrag(drag({ pointerId: 1 }), 1)).toBe(true);
    expect(ownsDrag(drag({ pointerId: 1 }), 2)).toBe(false);
    expect(ownsDrag(null, 1)).toBe(false);
  });
});

describe("shouldSuppressClick", () => {
  it("only blocks a click after a real drag", () => {
    expect(shouldSuppressClick(AXIS_SLOP)).toBe(false);
    expect(shouldSuppressClick(AXIS_SLOP + 1)).toBe(true);
    expect(shouldSuppressClick(-AXIS_SLOP - 1)).toBe(true);
  });
});
