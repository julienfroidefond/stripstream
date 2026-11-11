import { describe, expect, it } from "vitest";

import {
  nextWallPhase,
  phaseForPlaque,
  plaqueRevealDelay,
  type WallPhase,
  type WallPhaseEvent,
} from "./wall-phase";

describe("nextWallPhase", () => {
  const accepted: Array<[WallPhase, WallPhaseEvent, WallPhase]> = [
    ["idle", "PAN_START", "pan"],
    ["idle", "FOCUS_START", "focus"],
    ["pan", "PAN_END", "idle"],
    ["pan", "FOCUS_START", "focus"],
    ["focus", "FOCUS_SETTLE_ANCHOR", "plaque"],
    ["focus", "FOCUS_SETTLE_SHEET", "sheet"],
    ["focus", "PAN_START", "pan"],
    ["plaque", "PAN_START", "pan"],
    ["plaque", "FOCUS_START", "focus"],
    ["plaque", "CLOSE", "idle"],
    ["sheet", "PAN_START", "pan"],
    ["sheet", "FOCUS_START", "focus"],
    ["sheet", "CLOSE", "idle"],
  ];

  it.each(accepted)("%s + %s -> %s", (phase, event, expected) => {
    expect(nextWallPhase(phase, event)).toBe(expected);
  });

  it("ignores a settling event after the plaque is already open", () => {
    expect(nextWallPhase("plaque", "FOCUS_SETTLE_ANCHOR")).toBe("plaque");
    expect(nextWallPhase("sheet", "FOCUS_SETTLE_SHEET")).toBe("sheet");
  });

  it("keeps an ending pan from reopening a closed plaque", () => {
    expect(nextWallPhase("focus", "PAN_END")).toBe("focus");
  });
});

describe("phaseForPlaque", () => {
  it("maps the mobile sheet and the anchored plaque", () => {
    expect(phaseForPlaque("anchor")).toBe("plaque");
    expect(phaseForPlaque("sheet")).toBe("sheet");
  });
});

describe("plaqueRevealDelay", () => {
  it("waits for the camera flight minus its landing margin", () => {
    expect(plaqueRevealDelay(0.9, false)).toBe(600);
    expect(plaqueRevealDelay(0.2, false)).toBe(300);
  });

  it("shows the plaque immediately with reduced motion", () => {
    expect(plaqueRevealDelay(0.9, true)).toBe(0);
  });
});
