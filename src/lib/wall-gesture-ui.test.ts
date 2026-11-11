// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { isWallUiTarget } from "./wall-gesture";

describe("isWallUiTarget", () => {
  it("recognises a control inside a wall panel", () => {
    const panel = document.createElement("aside");
    panel.dataset.wallUi = "";
    const button = document.createElement("button");
    panel.appendChild(button);

    expect(isWallUiTarget(button)).toBe(true);
  });

  it("lets the empty wall and the stage keep their gestures", () => {
    const stage = document.createElement("div");
    const tile = document.createElement("article");
    stage.appendChild(tile);

    expect(isWallUiTarget(tile)).toBe(false);
    expect(isWallUiTarget(stage)).toBe(false);
  });

  it("ignores non-element targets such as window", () => {
    expect(isWallUiTarget(window)).toBe(false);
    expect(isWallUiTarget(null)).toBe(false);
  });
});
