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

import type { WallCameraController } from "./useWallCamera";
import { useWallGestures, type WallGestureCamera } from "./useWallGestures";

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

type CameraSpies = {
  [K in keyof WallGestureCamera]: Mock<WallCameraController[K]>;
};

function makeCamera(): CameraSpies {
  return {
    grab: vi.fn<WallCameraController["grab"]>(),
    panBy: vi.fn<WallCameraController["panBy"]>(),
    beginPinch: vi.fn<WallCameraController["beginPinch"]>(),
    pinchTo: vi.fn<WallCameraController["pinchTo"]>(),
    release: vi.fn<WallCameraController["release"]>(),
    wheel: vi.fn<WallCameraController["wheel"]>(),
    cancelView: vi.fn<WallCameraController["cancelView"]>(),
  };
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

function setup(callbacks: { onPanStart?: () => void; onPanEnd?: () => void } = {}) {
  const { stage, stageRef } = makeStage();
  const camera = makeCamera();
  const view = renderHook(() =>
    useWallGestures({ stageRef, camera, ...callbacks })
  );
  return { ...view, stage, camera };
}

afterEach(cleanup);

describe("useWallGestures", () => {
  it("pans the camera 1:1 from the first pixel and marks the drag", () => {
    const { stage, camera, result } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 120, y: 90 }));
    });

    expect(camera.grab).toHaveBeenCalledTimes(1);
    expect(camera.panBy).toHaveBeenCalledWith(20, -10);
    expect(camera.cancelView).toHaveBeenCalled();
    expect(result.current.dragging).toBe(true);

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 120, y: 90 }, { buttons: 0 })
      );
    });
    expect(result.current.dragging).toBe(false);
  });

  it("keeps a tap as a click and does not start momentum", () => {
    const { stage, camera, result } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 103, y: 101 }));
    });
    expect(camera.panBy).toHaveBeenCalledWith(3, 1);
    expect(camera.cancelView).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 103, y: 101 }, { buttons: 0 })
      );
    });
    expect(camera.release).not.toHaveBeenCalled();
    expect(result.current.isClickGuarded()).toBe(false);
  });

  it("guards the click after a drag until a keyboard activation", () => {
    const { stage, result } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 160, y: 100 }));
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 160, y: 100 }, { buttons: 0 })
      );
    });
    expect(result.current.isClickGuarded()).toBe(true);

    act(() => result.current.releaseClickGuard());
    expect(result.current.isClickGuarded()).toBe(false);
  });

  it("launches momentum from a quick flick", () => {
    const { stage, camera } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 140, y: 100 }));
    });
    // Le deuxième échantillon doit être daté après le premier.
    const now = performance.now();
    const spy = vi.spyOn(performance, "now").mockReturnValue(now + 16);
    act(() => {
      window.dispatchEvent(pointerEvent("pointermove", { x: 180, y: 100 }));
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 180, y: 100 }, { buttons: 0 })
      );
    });
    spy.mockRestore();

    expect(camera.release).toHaveBeenCalledTimes(1);
    const [velocityX, velocityY] = camera.release.mock.calls[0];
    expect(velocityX).toBeGreaterThan(0);
    expect(velocityY).toBe(0);
  });

  it("brackets the gesture with pan start and end callbacks", () => {
    const onPanStart = vi.fn();
    const onPanEnd = vi.fn();
    const { stage } = setup({ onPanStart, onPanEnd });

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
    });
    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(onPanEnd).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 100, y: 100 }, { buttons: 0 })
      );
    });
    expect(onPanEnd).toHaveBeenCalledTimes(1);

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 100, y: 100 }, { buttons: 0 })
      );
    });
    expect(onPanStart).toHaveBeenCalledTimes(2);
    expect(onPanEnd).toHaveBeenCalledTimes(2);
  });

  it("never starts a gesture on a wall control", () => {
    const { stage, camera } = setup();
    const panel = document.createElement("aside");
    panel.dataset.wallUi = "";
    stage.appendChild(panel);

    act(() => {
      panel.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 100, y: 100 }, { buttons: 0 })
      );
    });

    expect(camera.grab).not.toHaveBeenCalled();
  });

  it("pinches around the midpoint of two fingers", () => {
    const { stage, camera, result } = setup();

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

    expect(camera.beginPinch).toHaveBeenCalledWith({ x: 200, y: 100 });
    expect(camera.pinchTo).toHaveBeenCalledWith({ x: 300, y: 100 }, 2);
    expect(result.current.dragging).toBe(true);
    expect(result.current.isClickGuarded()).toBe(true);
  });

  it("hands every wheel notch to the camera as one intention", () => {
    const { stage, camera } = setup();

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
    expect(camera.wheel).toHaveBeenLastCalledWith(
      expect.objectContaining({
        zoom: true,
        deltaY: -100,
        clientX: 500,
        clientY: 350,
      })
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
    expect(camera.wheel).toHaveBeenLastCalledWith(
      expect.objectContaining({ zoom: false, deltaX: 10, deltaY: 20 })
    );
  });

  it("detaches its global listeners when the wall unmounts", () => {
    const { stage, camera, unmount } = setup();

    act(() => {
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 100, y: 100 }));
      window.dispatchEvent(pointerEvent("pointermove", { x: 120, y: 90 }));
    });
    expect(camera.panBy).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      window.dispatchEvent(pointerEvent("pointermove", { x: 300, y: 300 }));
      stage.dispatchEvent(pointerEvent("pointerdown", { x: 300, y: 300 }));
      window.dispatchEvent(
        pointerEvent("pointerup", { x: 300, y: 300 }, { buttons: 0 })
      );
    });

    expect(camera.panBy).toHaveBeenCalledTimes(1);
    expect(camera.grab).toHaveBeenCalledTimes(1);
  });
});
