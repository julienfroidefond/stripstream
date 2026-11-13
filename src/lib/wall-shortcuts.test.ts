// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  resolveWallShortcut,
  wallShortcutPreventsDefault,
  type WallKeyEvent,
} from "./wall-shortcuts";

function press(
  key: string,
  event: Partial<WallKeyEvent> = {},
  panelOpen = false
) {
  return resolveWallShortcut(
    { key, target: document.body, ...event },
    { panelOpen }
  );
}

describe("resolveWallShortcut", () => {
  it("maps the camera keys", () => {
    expect(press("+")).toBe("zoom-in");
    expect(press("=")).toBe("zoom-in");
    expect(press("-")).toBe("zoom-out");
    expect(press("_")).toBe("zoom-out");
    expect(press("0")).toBe("reset");
    expect(press("f")).toBe("overview");
    expect(press("F")).toBe("overview");
    expect(press("r")).toBe("random");
    expect(press("R")).toBe("random");
    expect(press("q")).toBeNull();
  });

  it("turns Enter and Space into an explicit activation", () => {
    expect(press("Enter")).toBe("activate");
    expect(press(" ")).toBe("activate");
    expect(press("Enter", {}, true)).toBe("activate");
  });

  it("keeps Escape and activation while the filter panel is open", () => {
    expect(press("Escape", {}, true)).toBe("close");
    expect(press("+", {}, true)).toBeNull();
    expect(press("r", {}, true)).toBeNull();
  });

  it("leaves modified or already handled keys alone", () => {
    expect(press("+", { ctrlKey: true })).toBeNull();
    expect(press("+", { metaKey: true })).toBeNull();
    expect(press("r", { altKey: true })).toBeNull();
    expect(press("Escape", { defaultPrevented: true })).toBeNull();
  });

  it("never steals keys from a field or an editable region", () => {
    const input = document.createElement("input");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    editable.append(child);
    const select = document.createElement("select");
    document.body.append(input, editable, select);

    expect(press("r", { target: input })).toBeNull();
    expect(press("Escape", { target: child })).toBeNull();
    expect(press("0", { target: select })).toBeNull();
  });

  it("treats a button as a normal target", () => {
    const button = document.createElement("button");
    document.body.append(button);
    expect(press("f", { target: button })).toBe("overview");
  });
});

describe("wallShortcutPreventsDefault", () => {
  it("only confiscates the camera keys", () => {
    expect(wallShortcutPreventsDefault("activate")).toBe(false);
    expect(wallShortcutPreventsDefault("close")).toBe(false);
    expect(wallShortcutPreventsDefault("zoom-in")).toBe(true);
    expect(wallShortcutPreventsDefault("random")).toBe(true);
  });
});
