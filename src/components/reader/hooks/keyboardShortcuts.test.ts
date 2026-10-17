// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  isActivableTarget,
  isEditableTarget,
  resolveReaderShortcut,
  type ReaderKeyEvent,
  type ReaderShortcutAction,
  type ReaderShortcutContext,
} from "./keyboardShortcuts";

const LTR: ReaderShortcutContext = { isRTL: false, isFullscreenAvailable: true };
const RTL: ReaderShortcutContext = { isRTL: true, isFullscreenAvailable: true };

function press(
  key: string,
  {
    target = document.body,
    context = LTR,
    ...modifiers
  }: Partial<ReaderKeyEvent> & { context?: ReaderShortcutContext } = {}
): ReaderShortcutAction | null {
  return resolveReaderShortcut({ key, target, ...modifiers }, context);
}

describe("resolveReaderShortcut", () => {
  describe("navigation", () => {
    it("moves to the previous and next page with the arrows", () => {
      expect(press("ArrowLeft")).toBe("previous-page");
      expect(press("ArrowRight")).toBe("next-page");
    });

    it("inverts the arrows in right-to-left reading", () => {
      expect(press("ArrowLeft", { context: RTL })).toBe("next-page");
      expect(press("ArrowRight", { context: RTL })).toBe("previous-page");
    });

    it("keeps PageUp/PageDown logical regardless of reading direction", () => {
      expect(press("PageUp", { context: RTL })).toBe("previous-page");
      expect(press("PageDown", { context: RTL })).toBe("next-page");
    });

    it("uses Space as next page, Shift+Space as previous page", () => {
      expect(press(" ")).toBe("next-page");
      expect(press(" ", { shiftKey: true })).toBe("previous-page");
      // Ancien libellé `key` (IE/Edge historiques).
      expect(press("Spacebar")).toBe("next-page");
    });

    it("jumps to the first and last page with Home/End", () => {
      expect(press("Home")).toBe("first-page");
      expect(press("End")).toBe("last-page");
    });
  });

  describe("panels and display", () => {
    it("toggles fullscreen with F when the API is available", () => {
      expect(press("f")).toBe("toggle-fullscreen");
      expect(press("F")).toBe("toggle-fullscreen");
    });

    it("ignores F when fullscreen is unavailable (iOS Safari)", () => {
      expect(press("f", { context: { isRTL: false, isFullscreenAvailable: false } })).toBeNull();
    });

    it("maps D/T/I/R case-insensitively", () => {
      expect(press("d")).toBe("toggle-double-page");
      expect(press("D")).toBe("toggle-double-page");
      expect(press("t")).toBe("toggle-thumbnails");
      expect(press("T")).toBe("toggle-thumbnails");
      expect(press("i")).toBe("toggle-info");
      expect(press("I")).toBe("toggle-info");
      expect(press("r")).toBe("toggle-direction");
      expect(press("R")).toBe("toggle-direction");
    });

    it("opens the help with ?", () => {
      expect(press("?", { shiftKey: true })).toBe("toggle-shortcuts");
    });

    it("closes the reader with Escape", () => {
      expect(press("Escape")).toBe("close-reader");
    });
  });

  describe("guards", () => {
    it("ignores shortcuts combined with a modifier", () => {
      expect(press("d", { ctrlKey: true })).toBeNull();
      expect(press("t", { metaKey: true })).toBeNull();
      expect(press("ArrowRight", { altKey: true })).toBeNull();
    });

    it("ignores every key while typing in an input (PageInput)", () => {
      const input = document.createElement("input");
      document.body.append(input);

      for (const key of ["ArrowRight", "ArrowLeft", "PageDown", " ", "d", "t", "i", "r", "?", "Escape", "Home"]) {
        expect(press(key, { target: input })).toBeNull();
      }
    });

    it("ignores keys inside a contenteditable region", () => {
      const editable = document.createElement("div");
      editable.setAttribute("contenteditable", "true");
      const child = document.createElement("span");
      editable.append(child);
      document.body.append(editable);

      expect(isEditableTarget(child)).toBe(true);
      expect(press("d", { target: child })).toBeNull();
    });

    it("treats a contenteditable=false region as normal content", () => {
      const notEditable = document.createElement("div");
      notEditable.setAttribute("contenteditable", "false");
      document.body.append(notEditable);

      expect(isEditableTarget(notEditable)).toBe(false);
      expect(press("d", { target: notEditable })).toBe("toggle-double-page");
    });

    it("leaves Space to the focused control", () => {
      const button = document.createElement("button");
      const label = document.createElement("span");
      button.append(label);
      document.body.append(button);

      expect(isActivableTarget(label)).toBe(true);
      expect(press(" ", { target: label })).toBeNull();
      expect(press(" ", { target: label, shiftKey: true })).toBeNull();
      // Les flèches et les lettres restent des raccourcis du lecteur.
      expect(press("ArrowRight", { target: label })).toBe("next-page");
      expect(press("d", { target: label })).toBe("toggle-double-page");
    });

    it("ignores unknown keys and non-elements targets", () => {
      expect(press("q")).toBeNull();
      expect(press("Enter")).toBeNull();
      expect(press("ArrowRight", { target: null })).toBe("next-page");
      expect(isEditableTarget(null)).toBe(false);
      expect(isActivableTarget({} as EventTarget)).toBe(false);
    });
  });
});
