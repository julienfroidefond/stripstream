// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

import { MotionNumber } from "@/lib/motion-value";
import { createWallClickGuardState } from "@/lib/wall-pinch";

import type { WallCameraController } from "./useWallCamera";
import { useWallGestures } from "./useWallGestures";

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

interface CameraSpies {
  animateView: Mock<WallCameraController["animateView"]>;
  stopMomentum: Mock<WallCameraController["stopMomentum"]>;
  startMomentum: Mock<WallCameraController["startMomentum"]>;
  markPanning: Mock<WallCameraController["markPanning"]>;
  zoomAt: Mock<WallCameraController["zoomAt"]>;
  zoomBy: Mock<WallCameraController["zoomBy"]>;
  resetToInitial: Mock<WallCameraController["resetToInitial"]>;
  fitView: Mock<WallCameraController["fitView"]>;
  cancelView: Mock<WallCameraController["cancelView"]>;
  beginInteraction: Mock<WallCameraController["beginInteraction"]>;
}

function makeCamera(): { camera: WallCameraController; spies: CameraSpies } {
  const x = new MotionNumber(0);
  const y = new MotionNumber(0);
  const scale = new MotionNumber(1);
  const spies: CameraSpies = {
    animateView: vi.fn<WallCameraController["animateView"]>(),
    stopMomentum: vi.fn<WallCameraController["stopMomentum"]>(),
    startMomentum: vi.fn<WallCameraController["startMomentum"]>(),
    markPanning: vi.fn<WallCameraController["markPanning"]>(),
    zoomAt: vi.fn<WallCameraController["zoomAt"]>(),
    zoomBy: vi.fn<WallCameraController["zoomBy"]>(),
    resetToInitial: vi.fn<WallCameraController["resetToInitial"]>(),
    fitView: vi.fn<WallCameraController["fitView"]>(),
    cancelView: vi.fn<WallCameraController["cancelView"]>(),
    beginInteraction: vi.fn<WallCameraController["beginInteraction"]>(),
  };

  const camera: WallCameraController = {
    x,
    y,
    scale,
    camera: { x: 0, y: 0, scale: 1 },
    viewport: { width: 1000, height: 700 },
    canvasRef: { current: null },
    overview: false,
    setOverview: vi.fn<(value: boolean) => void>(),
    panning: false,
    ...spies,
    clampZoom: (value) => Math.min(2.4, Math.max(0.28, value)),
  };

  return { camera, spies };
}

function makeStage(): {
  stage: HTMLDivElement;
  stageRef: { current: HTMLDivElement | null };
} {
  const stage = document.createElement("div");
  Object.defineProperty(stage, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 700,
      width: 1000,
      height: 700,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return { stage, stageRef: { current: stage } };
}

function pointerEvent(
  type: string,
  point: { x: number; y: number },
  {
    id = 1,
    pointerType = "mouse",
    button = 0,
    buttons = 1,
  }: {
    id?: number;
    pointerType?: string;
    button?: number;
    buttons?: number;
  } = {}
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button,
    buttons,
    clientX: point.x,
    clientY: point.y,
  });
  Object.defineProperties(event, {
    pointerId: { value: id },
    pointerType: { value: pointerType },
    isPrimary: { value: true },
  });
  return event;
}

function setup() {
  const { stage, stageRef } = makeStage();
  const { camera, spies } = makeCamera();
  const clickGuard = createWallClickGuardState();
  const view = renderHook(() =>
    useWallGestures({ stageRef, clickGuard, camera })
  );
  return { ...view, stage, camera, spies };
}

afterEach(cleanup);

describe("useWallGestures", () => {
  it("pans the camera 1:1 from the first pixel and marks the drag", () => {
    const { stage, camera, spies, result } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 120, y: 90 }));
    });

    expect(camera.x.get()).toBe(20);
    expect(camera.y.get()).toBe(-10);
    expect(spies.markPanning).toHaveBeenCalled();
    expect(spies.cancelView).toHaveBeenCalled();
    expect(result.current.dragging).toBe(true);

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 120, y: 90 }, { buttons: 0 })
      );
    });
    expect(result.current.dragging).toBe(false);
  });

  it("keeps a tap as a click and does not start momentum", () => {
    const { stage, spies } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 103, y: 101 }));
    });
    expect(spies.startMomentum).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 103, y: 101 }, { buttons: 0 })
      );
    });
    expect(spies.startMomentum).not.toHaveBeenCalled();
  });

  it("never starts a gesture on a wall control", () => {
    const { stage, spies } = setup();
    const panel = document.createElement("aside");
    panel.dataset.wallUi = "";
    stage.appendChild(panel);

    act(() => {
      panel.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 100, y: 100 }, { buttons: 0 })
      );
    });

    expect(spies.beginInteraction).not.toHaveBeenCalled();
  });

  it("scales around the midpoint of two fingers", () => {
    const { stage, camera } = setup();

    act(() => {
      stage.dispatchEvent(
        pointerEvent(
          "pointerdown",
          { x: 100, y: 100 },
          { id: 1, pointerType: "touch" }
        )
      );
      stage.dispatchEvent(
        pointerEvent(
          "pointerdown",
          { x: 300, y: 100 },
          { id: 2, pointerType: "touch" }
        )
      );
      window.dispatchEvent(
        pointerEvent(
          "pointermove",
          { x: 500, y: 100 },
          { id: 2, pointerType: "touch" }
        )
      );
    });

    expect(camera.scale.get()).toBeCloseTo(2, 6);
  });

  it("zoom with ctrl/meta and pans with a plain wheel", () => {
    const { stage, camera, spies } = setup();

    act(() => {
      stage.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: -100,
          clientX: 500,
          clientY: 350,
        })
      );
    });
    expect(spies.zoomAt).toHaveBeenCalledWith(
      expect.any(Number),
      500,
      350
    );

    act(() => {
      stage.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaX: 10,
          deltaY: 20,
        })
      );
    });
    expect(camera.x.get()).toBe(-10);
    expect(camera.y.get()).toBe(-20);
  });

  it("detaches its global listeners when the wall unmounts", () => {
    const { stage, camera, spies, unmount } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 120, y: 90 }));
    });
    const movedX = camera.x.get();
    expect(movedX).toBe(20);

    unmount();

    act(() => {
      window.dispatchEvent(pointerEvent("pointermove", { x: 300, y: 300 }));
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 300, y: 300 }));
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 300, y: 300 }, { buttons: 0 })
      );
    });

    expect(camera.x.get()).toBe(movedX);
    expect(spies.beginInteraction).toHaveBeenCalledTimes(1);
  });
});
