// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/PreferencesContext", () => ({
  usePreferences: () => ({
    updatePreferences: vi.fn().mockResolvedValue(true),
  }),
}));

import { useOrientation } from "./useOrientation";
import { useDoublePageMode } from "./useDoublePageMode";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
}

describe("useDoublePageMode orientation", () => {
  it("shows page n+1 after rotating from portrait to landscape", () => {
    Object.defineProperty(window, "screen", {
      value: { width: 1024, height: 768 },
      configurable: true,
    });
    setViewport(768, 1024);

    const { result } = renderHook(() => ({
      orientation: useOrientation(),
      mode: useDoublePageMode(false),
    }));

    expect(result.current.orientation).toBe(false);
    expect(result.current.mode.isDoublePage).toBe(false);

    act(() => {
      setViewport(1024, 600);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.orientation).toBe(true);
    expect(result.current.mode.isDoublePage).toBe(true);
    expect(result.current.mode.shouldShowDoublePage(8, 24)).toBe(true);
  });
});
