// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initialWallCamera,
  type WallViewport,
} from "@/lib/wall-camera";

import { useWallCamera } from "./useWallCamera";

vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

const VIEWPORT: WallViewport = { width: 1000, height: 700 };
const LAYOUT = { width: 1000, height: 700 };
const MIN_SCALE = 0.5;

class FakeResizeObserver {
  static callbacks: ResizeObserverCallback[] = [];

  constructor(callback: ResizeObserverCallback) {
    FakeResizeObserver.callbacks.push(callback);
  }

  observe = () => undefined;

  disconnect = () => undefined;

  unobserve = () => undefined;
}

function makeStage(): {
  stage: HTMLDivElement;
  stageRef: { current: HTMLDivElement | null };
} {
  const stage = document.createElement("div");
  Object.defineProperty(stage, "clientWidth", {
    configurable: true,
    value: VIEWPORT.width,
  });
  Object.defineProperty(stage, "clientHeight", {
    configurable: true,
    value: VIEWPORT.height,
  });
  Object.defineProperty(stage, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      right: VIEWPORT.width,
      bottom: VIEWPORT.height,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return { stage, stageRef: { current: stage } };
}

function setup(selectionKey = "all") {
  const { stage, stageRef } = makeStage();
  const onCameraMoved = vi.fn();
  const onInteractionStart = vi.fn();
  const onSelectionChange = vi.fn();
  const view = renderHook(
    (props: { selectionKey: string }) =>
      useWallCamera({
        stageRef,
        layout: LAYOUT,
        reduce: true,
        selectionKey: props.selectionKey,
        onCameraMoved,
        onInteractionStart,
        onSelectionChange,
      }),
    { initialProps: { selectionKey } }
  );
  return {
    ...view,
    stage,
    callbacks: { onCameraMoved, onInteractionStart, onSelectionChange },
  };
}

beforeEach(() => {
  FakeResizeObserver.callbacks = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useWallCamera", () => {
  it("measures the stage and lands on the opening framing", () => {
    const { result, callbacks } = setup();
    const expected = initialWallCamera(VIEWPORT, MIN_SCALE);

    expect(result.current.viewport).toEqual(VIEWPORT);
    expect(result.current.scale.get()).toBeCloseTo(expected.scale, 6);
    expect(result.current.camera.x).toBeCloseTo(expected.x, 6);
    expect(result.current.camera.y).toBeCloseTo(expected.y, 6);
    expect(result.current.overview).toBe(false);
    expect(callbacks.onCameraMoved).toHaveBeenCalled();
  });

  it("exposes zoom, fit and reset as camera operations", () => {
    const { result } = setup();
    const opening = initialWallCamera(VIEWPORT, MIN_SCALE);

    act(() => result.current.zoomBy(1.28));
    expect(result.current.scale.get()).toBeCloseTo(opening.scale * 1.28, 6);

    act(() => result.current.fitView());
    expect(result.current.scale.get()).toBe(MIN_SCALE);
    expect(result.current.overview).toBe(true);

    act(() => result.current.resetToInitial());
    expect(result.current.scale.get()).toBeCloseTo(opening.scale, 6);
    expect(result.current.overview).toBe(false);
  });

  it("reframes on a filter change and tells the composition", () => {
    const { result, rerender, callbacks } = setup();
    act(() => result.current.fitView());
    expect(result.current.scale.get()).toBe(MIN_SCALE);

    rerender({ selectionKey: "library:one" });

    const expected = initialWallCamera(VIEWPORT, MIN_SCALE);
    expect(result.current.scale.get()).toBeCloseTo(expected.scale, 6);
    expect(result.current.camera.x).toBeCloseTo(expected.x, 6);
    expect(callbacks.onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the world centre when the stage is resized", () => {
    const { result, stage } = setup();
    const before = {
      x: (800 / 2 - result.current.x.get()) / result.current.scale.get(),
      y: (500 / 2 - result.current.y.get()) / result.current.scale.get(),
    };

    Object.defineProperty(stage, "clientWidth", { value: 800 });
    Object.defineProperty(stage, "clientHeight", { value: 500 });

    act(() => {
      const callback = FakeResizeObserver.callbacks[0];
      callback?.([], {} as ResizeObserver);
    });

    expect(result.current.viewport).toEqual({ width: 800, height: 500 });
    const after = {
      x: (800 / 2 - result.current.x.get()) / result.current.scale.get(),
      y: (500 / 2 - result.current.y.get()) / result.current.scale.get(),
    };
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });
});
