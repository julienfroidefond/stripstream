// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  isLandscape: { value: null as boolean | null },
  updatePreferencesMock: vi.fn(),
}));

vi.mock("./useOrientation", () => ({
  useOrientation: () => hoisted.isLandscape.value,
}));

vi.mock("@/contexts/PreferencesContext", () => ({
  usePreferences: () => ({
    updatePreferences: hoisted.updatePreferencesMock,
  }),
}));

import { useDoublePageMode } from "./useDoublePageMode";

function setScreenSize(width: number, height: number) {
  Object.defineProperty(window, "screen", {
    value: { width, height },
    configurable: true,
  });
}

function setInnerHeight(value: number) {
  Object.defineProperty(window, "innerHeight", {
    value,
    configurable: true,
    writable: true,
  });
}

describe("useDoublePageMode", () => {
  beforeEach(() => {
    hoisted.isLandscape.value = null;
    hoisted.updatePreferencesMock.mockReset();
    hoisted.updatePreferencesMock.mockResolvedValue(true);
    setScreenSize(1024, 768);
  });

  it("starts from the saved preference", () => {
    expect(renderHook(() => useDoublePageMode(false)).result.current.isDoublePage).toBe(false);
    expect(renderHook(() => useDoublePageMode(true)).result.current.isDoublePage).toBe(true);
  });

  it("keeps the saved preference when the first orientation reading arrives", () => {
    const off = renderHook(() => useDoublePageMode(false));
    const on = renderHook(() => useDoublePageMode(true));

    hoisted.isLandscape.value = true;
    off.rerender();
    hoisted.isLandscape.value = false;
    on.rerender();

    expect(off.result.current.isDoublePage).toBe(false);
    expect(on.result.current.isDoublePage).toBe(true);
  });

  it("follows a real rotation after mount without persisting it", () => {
    const { result, rerender } = renderHook(() => useDoublePageMode(false));
    hoisted.isLandscape.value = false;
    rerender();

    hoisted.isLandscape.value = true;
    rerender();
    expect(result.current.isDoublePage).toBe(true);
    expect(result.current.shouldShowDoublePage(8, 24)).toBe(true);

    hoisted.isLandscape.value = false;
    rerender();
    expect(result.current.isDoublePage).toBe(false);
    expect(hoisted.updatePreferencesMock).not.toHaveBeenCalled();
  });

  describe("shouldShowDoublePage", () => {
    it("returns true on a middle page in landscape", () => {
      const { result } = renderHook(() => useDoublePageMode(true));

      expect(result.current.shouldShowDoublePage(2, 10)).toBe(true);
    });

    it("returns true on a tablet when browser chrome shortens the landscape viewport", () => {
      setScreenSize(1194, 834);
      setInnerHeight(600);
      const { result } = renderHook(() => useDoublePageMode(true));

      expect(result.current.shouldShowDoublePage(2, 10)).toBe(true);
    });

    it("returns false on a mobile-sized screen", () => {
      setScreenSize(852, 393);
      const { result } = renderHook(() => useDoublePageMode(true));

      expect(result.current.shouldShowDoublePage(2, 10)).toBe(false);
    });

    it("returns false for the cover (page 1)", () => {
      const { result } = renderHook(() => useDoublePageMode(true));

      expect(result.current.shouldShowDoublePage(1, 10)).toBe(false);
    });

    it("returns false on the last page", () => {
      const { result } = renderHook(() => useDoublePageMode(true));

      expect(result.current.shouldShowDoublePage(10, 10)).toBe(false);
    });

    it("returns false when double page is disabled", () => {
      const { result } = renderHook(() => useDoublePageMode());

      expect(result.current.shouldShowDoublePage(2, 10)).toBe(false);
    });
  });

  describe("toggleDoublePage", () => {
    it("flips the mode and persists the preference", () => {
      const { result } = renderHook(() => useDoublePageMode(true));

      act(() => {
        result.current.toggleDoublePage();
      });

      expect(result.current.isDoublePage).toBe(false);
      expect(hoisted.updatePreferencesMock).toHaveBeenCalledWith({
        readerDoublePageMode: false,
      });
    });
  });
});
