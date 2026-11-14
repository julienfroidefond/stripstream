// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTouchNavigation } from "./useTouchNavigation";

function touch(clientX: number, clientY: number): Touch {
  return { clientX, clientY } as Touch;
}

function touchEvent(
  type: "touchstart" | "touchmove" | "touchend",
  touches: Touch[],
  changedTouches: Touch[] = []
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", { value: touches });
  Object.defineProperty(event, "changedTouches", { value: changedTouches });
  return event;
}

function swipe({
  fromX,
  fromY = 100,
  toX,
  toY = 100,
}: {
  fromX: number;
  fromY?: number;
  toX: number;
  toY?: number;
}) {
  act(() => {
    window.dispatchEvent(touchEvent("touchstart", [touch(fromX, fromY)]));
    window.dispatchEvent(
      touchEvent("touchend", [], [touch(toX, toY)])
    );
  });
}

function setVisualViewportScale(scale: number) {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: { scale },
  });
}

function renderTouchNavigation(isRTL = false) {
  const onPreviousPage = vi.fn();
  const onNextPage = vi.fn();
  const hook = renderHook(() =>
    useTouchNavigation({ onPreviousPage, onNextPage, isRTL })
  );

  return { ...hook, onPreviousPage, onNextPage };
}

beforeEach(() => {
  setVisualViewportScale(1);
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "visualViewport");
});

describe("useTouchNavigation", () => {
  it("maps a right swipe to the previous page in LTR", () => {
    const { onPreviousPage, onNextPage } = renderTouchNavigation();

    swipe({ fromX: 100, toX: 180 });

    expect(onPreviousPage).toHaveBeenCalledTimes(1);
    expect(onNextPage).not.toHaveBeenCalled();
  });

  it("maps a left swipe to the next page in LTR", () => {
    const { onPreviousPage, onNextPage } = renderTouchNavigation();

    swipe({ fromX: 180, toX: 100 });

    expect(onNextPage).toHaveBeenCalledTimes(1);
    expect(onPreviousPage).not.toHaveBeenCalled();
  });

  it("reverses the mapping in RTL", () => {
    const { onPreviousPage, onNextPage } = renderTouchNavigation(true);

    swipe({ fromX: 100, toX: 180 });
    swipe({ fromX: 180, toX: 100 });

    expect(onNextPage).toHaveBeenCalledTimes(1);
    expect(onPreviousPage).toHaveBeenCalledTimes(1);
  });

  it("ignores short and mostly vertical gestures", () => {
    const { onPreviousPage, onNextPage } = renderTouchNavigation();

    swipe({ fromX: 100, toX: 140 });
    swipe({ fromX: 100, fromY: 100, toX: 100, toY: 180 });

    expect(onPreviousPage).not.toHaveBeenCalled();
    expect(onNextPage).not.toHaveBeenCalled();
  });

  it("ignores a pinch gesture", () => {
    const { onPreviousPage, onNextPage } = renderTouchNavigation();

    act(() => {
      window.dispatchEvent(
        touchEvent("touchstart", [touch(100, 100), touch(200, 100)])
      );
      window.dispatchEvent(touchEvent("touchend", [], [touch(100, 100)]));
    });

    expect(onPreviousPage).not.toHaveBeenCalled();
    expect(onNextPage).not.toHaveBeenCalled();
  });

  it("ignores swipes while the page is zoomed", () => {
    setVisualViewportScale(1.3);
    const { onPreviousPage, onNextPage } = renderTouchNavigation();

    swipe({ fromX: 100, toX: 180 });

    expect(onPreviousPage).not.toHaveBeenCalled();
    expect(onNextPage).not.toHaveBeenCalled();
  });

  it("uses the latest callbacks without reattaching listeners", () => {
    const firstPrevious = vi.fn();
    const firstNext = vi.fn();
    const secondPrevious = vi.fn();
    const secondNext = vi.fn();
    const { rerender } = renderHook(
      ({ onPreviousPage, onNextPage }) =>
        useTouchNavigation({ onPreviousPage, onNextPage, isRTL: false }),
      {
        initialProps: {
          onPreviousPage: firstPrevious,
          onNextPage: firstNext,
        },
      }
    );

    rerender({ onPreviousPage: secondPrevious, onNextPage: secondNext });
    swipe({ fromX: 100, toX: 180 });

    expect(firstPrevious).not.toHaveBeenCalled();
    expect(secondPrevious).toHaveBeenCalledTimes(1);
  });

  it("removes its listeners on unmount", () => {
    const { unmount, onPreviousPage } = renderTouchNavigation();

    unmount();
    swipe({ fromX: 100, toX: 180 });

    expect(onPreviousPage).not.toHaveBeenCalled();
  });

  it("ignores swipes while a dialog covers the reader", () => {
    const onPreviousPage = vi.fn();
    const onNextPage = vi.fn();
    const { rerender } = renderHook(
      ({ disabled }) =>
        useTouchNavigation({ onPreviousPage, onNextPage, isRTL: false, disabled }),
      { initialProps: { disabled: true } }
    );

    swipe({ fromX: 180, toX: 100 });
    expect(onNextPage).not.toHaveBeenCalled();

    rerender({ disabled: false });
    swipe({ fromX: 180, toX: 100 });
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });
});
