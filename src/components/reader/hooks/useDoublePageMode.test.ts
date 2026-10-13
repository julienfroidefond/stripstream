// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  isLandscape: { value: false },
  updatePreferencesMock: vi.fn(),
}));

vi.mock("./useOrientation", () => ({
  useOrientation: () => hoisted.isLandscape.value,
}));

vi.mock("@/app/actions/preferences", () => ({
  updatePreferences: hoisted.updatePreferencesMock,
}));

import { useDoublePageMode } from "./useDoublePageMode";

function setInnerHeight(value: number) {
  Object.defineProperty(window, "innerHeight", {
    value,
    configurable: true,
    writable: true,
  });
}

describe("useDoublePageMode", () => {
  beforeEach(() => {
    hoisted.isLandscape.value = false;
    hoisted.updatePreferencesMock.mockReset();
    hoisted.updatePreferencesMock.mockResolvedValue({ success: true, message: "" });
    setInnerHeight(800);
  });

  it("stays single-page in portrait orientation", () => {
    const { result } = renderHook(() => useDoublePageMode());

    expect(result.current.isDoublePage).toBe(false);
  });

  it("auto-enables double page in landscape orientation", () => {
    hoisted.isLandscape.value = true;

    const { result } = renderHook(() => useDoublePageMode());

    expect(result.current.isDoublePage).toBe(true);
  });

  describe("shouldShowDoublePage", () => {
    it("returns true on a middle page in landscape", () => {
      hoisted.isLandscape.value = true;
      const { result } = renderHook(() => useDoublePageMode());

      expect(result.current.shouldShowDoublePage(2, 10)).toBe(true);
    });

    it("returns false on a mobile-sized viewport", () => {
      hoisted.isLandscape.value = true;
      setInnerHeight(500);
      const { result } = renderHook(() => useDoublePageMode());

      expect(result.current.shouldShowDoublePage(2, 10)).toBe(false);
    });

    it("returns false for the cover (page 1)", () => {
      hoisted.isLandscape.value = true;
      const { result } = renderHook(() => useDoublePageMode());

      expect(result.current.shouldShowDoublePage(1, 10)).toBe(false);
    });

    it("returns false on the last page", () => {
      hoisted.isLandscape.value = true;
      const { result } = renderHook(() => useDoublePageMode());

      expect(result.current.shouldShowDoublePage(10, 10)).toBe(false);
    });

    it("returns false when double page is disabled", () => {
      const { result } = renderHook(() => useDoublePageMode());

      expect(result.current.shouldShowDoublePage(2, 10)).toBe(false);
    });
  });

  describe("toggleDoublePage", () => {
    it("flips the mode and persists the preference", () => {
      hoisted.isLandscape.value = true;
      const { result } = renderHook(() => useDoublePageMode());

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
