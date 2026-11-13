// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_WALL_ZOOM,
  initialWallCamera,
  type WallViewport,
} from "@/lib/wall-camera";

import { useWallCamera, type WallCameraController } from "./useWallCamera";

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

/** Caméra exacte, reconstruite depuis les seules lectures publiques. */
function exact(controller: WallCameraController) {
  const scale = controller.zoom.get();
  const rect = controller.viewRect();
  return { x: -rect.left * scale, y: -rect.top * scale, scale };
}

/** Point du mur au centre d'un cadre de taille donnée. */
function worldCentre(controller: WallCameraController, viewport: WallViewport) {
  const { x, y, scale } = exact(controller);
  return {
    x: (viewport.width / 2 - x) / scale,
    y: (viewport.height / 2 - y) / scale,
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
    expect(result.current.zoom.get()).toBeCloseTo(expected.scale, 6);
    expect(result.current.camera.x).toBeCloseTo(expected.x, 6);
    expect(result.current.camera.y).toBeCloseTo(expected.y, 6);
    expect(result.current.overview).toBe(false);
    expect(callbacks.onCameraMoved).toHaveBeenCalled();
  });

  it("exposes zoom, fit and reset as camera operations", () => {
    const { result } = setup();
    const opening = initialWallCamera(VIEWPORT, MIN_SCALE);

    act(() => result.current.zoomBy(1.28));
    expect(result.current.zoom.get()).toBeCloseTo(opening.scale * 1.28, 6);

    act(() => result.current.fit());
    expect(result.current.zoom.get()).toBe(MIN_SCALE);
    expect(result.current.overview).toBe(true);

    act(() => result.current.reset());
    expect(result.current.zoom.get()).toBeCloseTo(opening.scale, 6);
    expect(result.current.overview).toBe(false);
  });

  it("reframes on a filter change and tells the composition", () => {
    const { result, rerender, callbacks } = setup();
    act(() => result.current.fit());
    expect(result.current.zoom.get()).toBe(MIN_SCALE);

    rerender({ selectionKey: "library:one" });

    const expected = initialWallCamera(VIEWPORT, MIN_SCALE);
    expect(result.current.zoom.get()).toBeCloseTo(expected.scale, 6);
    expect(result.current.camera.x).toBeCloseTo(expected.x, 6);
    expect(callbacks.onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the world centre when the stage is resized", () => {
    const { result, stage } = setup();
    const resized = { width: 800, height: 500 };
    const before = worldCentre(result.current, resized);

    Object.defineProperty(stage, "clientWidth", { value: resized.width });
    Object.defineProperty(stage, "clientHeight", { value: resized.height });

    act(() => {
      const callback = FakeResizeObserver.callbacks[0];
      callback?.([], {} as ResizeObserver);
    });

    expect(result.current.viewport).toEqual(resized);
    const after = worldCentre(result.current, resized);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("pans 1:1 and reports the visible wall rectangle", () => {
    const { result } = setup();
    const start = exact(result.current);

    act(() => result.current.panBy(30, -12));

    const moved = exact(result.current);
    expect(moved.x).toBeCloseTo(start.x + 30, 6);
    expect(moved.y).toBeCloseTo(start.y - 12, 6);
    expect(result.current.panning).toBe(true);

    const rect = result.current.viewRect();
    expect(rect.right - rect.left).toBeCloseTo(VIEWPORT.width / moved.scale, 6);
    expect(rect.bottom - rect.top).toBeCloseTo(
      VIEWPORT.height / moved.scale,
      6
    );
  });

  it("keeps the pinched point under the fingers and clamps the scale", () => {
    const { result } = setup();
    const start = exact(result.current);
    const midpoint = { x: 400, y: 300 };
    const world = {
      x: (midpoint.x - start.x) / start.scale,
      y: (midpoint.y - start.y) / start.scale,
    };

    act(() => {
      result.current.beginPinch(midpoint);
      result.current.pinchTo({ x: 450, y: 320 }, 1.5);
    });

    const pinched = exact(result.current);
    expect(pinched.scale).toBeCloseTo(start.scale * 1.5, 6);
    expect(pinched.x + world.x * pinched.scale).toBeCloseTo(450, 6);
    expect(pinched.y + world.y * pinched.scale).toBeCloseTo(320, 6);

    act(() => result.current.pinchTo(midpoint, 100));
    expect(result.current.zoom.get()).toBe(MAX_WALL_ZOOM);
  });

  it("pans with a plain wheel and zooms under the cursor with ctrl/meta", () => {
    const { result, callbacks } = setup();
    const start = exact(result.current);

    act(() =>
      result.current.wheel({
        deltaX: 10,
        deltaY: 2,
        deltaMode: 1,
        zoom: false,
        clientX: 0,
        clientY: 0,
      })
    );
    const panned = exact(result.current);
    expect(panned.x).toBeCloseTo(start.x - 180, 6);
    expect(panned.y).toBeCloseTo(start.y - 36, 6);
    expect(callbacks.onInteractionStart).toHaveBeenCalledTimes(1);

    const cursor = { x: 250, y: 200 };
    const world = {
      x: (cursor.x - panned.x) / panned.scale,
      y: (cursor.y - panned.y) / panned.scale,
    };
    act(() =>
      result.current.wheel({
        deltaX: 0,
        deltaY: -100,
        deltaMode: 0,
        zoom: true,
        clientX: cursor.x,
        clientY: cursor.y,
      })
    );
    const zoomed = exact(result.current);
    expect(zoomed.scale).toBeGreaterThan(panned.scale);
    expect(zoomed.x + world.x * zoomed.scale).toBeCloseTo(cursor.x, 6);
    expect(zoomed.y + world.y * zoomed.scale).toBeCloseTo(cursor.y, 6);
  });

  it("grabs the camera by closing the current view", () => {
    const { result, callbacks } = setup();
    act(() => result.current.fit());
    expect(result.current.overview).toBe(true);

    act(() => result.current.grab());

    expect(result.current.overview).toBe(false);
    expect(callbacks.onInteractionStart).toHaveBeenCalledTimes(2);
  });

  it("flies a tile into the focus rectangle and leaves the overview", () => {
    const { result } = setup();
    act(() => result.current.fit());

    const tile = { x: 100, y: 200, width: 148, height: 222 };
    const target = { left: 400, top: 100, width: 222, height: 333 };
    act(() => result.current.focusOn(tile, target, 0.72));

    const focused = exact(result.current);
    expect(focused.scale).toBeCloseTo(1.5, 6);
    expect(focused.x + tile.x * focused.scale).toBeCloseTo(target.left, 6);
    expect(focused.y + tile.y * focused.scale).toBeCloseTo(target.top, 6);
    expect(result.current.overview).toBe(false);
  });

  it("delivers the current zoom on subscription, then every change", () => {
    const { result } = setup();
    const opening = initialWallCamera(VIEWPORT, MIN_SCALE);
    const listener = vi.fn();

    const unsubscribe = result.current.zoom.subscribe(listener);
    expect(listener).toHaveBeenCalledWith(
      expect.closeTo(opening.scale, 6)
    );

    act(() => result.current.zoomBy(1.28));
    expect(listener).toHaveBeenLastCalledWith(
      expect.closeTo(opening.scale * 1.28, 6)
    );

    unsubscribe();
    act(() => result.current.zoomBy(1.28));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
