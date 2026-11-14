import { describe, expect, it } from "vitest";

import {
  WALL_CLICK_GUARD_MS,
  createWallPointerState,
  isWallClickGuarded,
  stepWallPointer,
  type WallPointerEffect,
  type WallPointerEvent,
  type WallPointerState,
} from "./pointer-machine";

const down = (
  id: number,
  x: number,
  y: number,
  extra: Partial<Extract<WallPointerEvent, { type: "down" }>> = {}
): WallPointerEvent => ({
  type: "down",
  id,
  x,
  y,
  pointerType: "touch",
  button: 0,
  onUi: false,
  ...extra,
});

const move = (
  id: number,
  x: number,
  y: number,
  extra: Partial<Extract<WallPointerEvent, { type: "move" }>> = {}
): WallPointerEvent => ({
  type: "move",
  id,
  x,
  y,
  pointerType: "touch",
  buttons: 1,
  ...extra,
});

const up = (
  id: number,
  x: number,
  y: number,
  extra: Partial<Extract<WallPointerEvent, { type: "up" }>> = {}
): WallPointerEvent => ({
  type: "up",
  id,
  x,
  y,
  pointerType: "touch",
  button: 0,
  cancel: false,
  ...extra,
});

/** Rejoue une suite d'événements datés et collecte tous les effets. */
function run(
  steps: ReadonlyArray<[WallPointerEvent, number]>,
  initial: WallPointerState = createWallPointerState()
): { state: WallPointerState; effects: WallPointerEffect[] } {
  let state = initial;
  const effects: WallPointerEffect[] = [];
  for (const [event, now] of steps) {
    const result = stepWallPointer(state, event, now);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

const types = (effects: WallPointerEffect[]) => effects.map((e) => e.type);

describe("stepWallPointer", () => {
  it("opens a sequence on the first finger: listeners, grab, pan start", () => {
    const { state, effects } = run([[down(1, 100, 100), 0]]);

    expect(types(effects)).toEqual(["attach", "grab", "panStart"]);
    expect(state.mode).toBe("pan");
    expect(state.attached).toBe(true);
  });

  it("is pure: the previous state is never mutated", () => {
    const initial = createWallPointerState();
    const snapshot = structuredClone(initial);
    const first = stepWallPointer(initial, down(1, 100, 100), 0);
    stepWallPointer(first.state, move(1, 150, 100), 10);

    expect(initial).toEqual(snapshot);
    expect(first.state.pointers).toEqual([{ id: 1, x: 100, y: 100 }]);
  });

  it("pans 1:1 and only turns into a drag beyond the tap slop", () => {
    const { effects } = run([
      [down(1, 100, 100), 0],
      [move(1, 104, 103), 10],
      [move(1, 130, 100), 20],
      [move(1, 130, 100), 30],
    ]);

    expect(effects.filter((e) => e.type === "panBy")).toEqual([
      { type: "panBy", dx: 4, dy: 3 },
      { type: "panBy", dx: 26, dy: -3 },
    ]);
    expect(types(effects).filter((t) => t === "dragStart")).toHaveLength(1);
    // Le drag est déclaré après le déplacement qui l'a provoqué.
    expect(types(effects).slice(-2)).toEqual(["panBy", "dragStart"]);
  });

  it("keeps a tap as a click: no momentum, no guard", () => {
    const { state, effects } = run([
      [down(1, 100, 100), 0],
      [move(1, 103, 101), 10],
      [up(1, 103, 101), 20],
    ]);

    expect(types(effects)).not.toContain("release");
    expect(types(effects)).not.toContain("dragStart");
    expect(types(effects).slice(-3)).toEqual(["panEnd", "dragEnd", "detach"]);
    expect(isWallClickGuarded(state, 20)).toBe(false);
    expect(state.attached).toBe(false);
  });

  it("releases a flick with its velocity and guards the synthetic click", () => {
    const { state, effects } = run([
      [down(1, 100, 100), 0],
      [move(1, 120, 100), 10],
      [move(1, 160, 100), 20],
      [up(1, 180, 100), 30],
    ]);

    const release = effects.find((e) => e.type === "release");
    expect(release).toEqual({ type: "release", velocityX: 3, velocityY: 0 });
    expect(types(effects).slice(-4)).toEqual([
      "release",
      "panEnd",
      "dragEnd",
      "detach",
    ]);
    expect(isWallClickGuarded(state, 30 + WALL_CLICK_GUARD_MS - 1)).toBe(true);
    expect(isWallClickGuarded(state, 30 + WALL_CLICK_GUARD_MS)).toBe(false);
  });

  it("drops the momentum when the finger stopped before lifting", () => {
    const { state, effects } = run([
      [down(1, 100, 100), 0],
      [move(1, 160, 100), 10],
      [up(1, 160, 100, { cancel: true }), 500],
    ]);

    expect(types(effects)).not.toContain("release");
    expect(isWallClickGuarded(state, 500)).toBe(true);
  });

  it("rebases a second finger into a pinch around the midpoint", () => {
    const { state, effects } = run([
      [down(1, 100, 100), 0],
      [down(2, 300, 100), 5],
      [move(2, 500, 100), 10],
    ]);

    expect(effects).toContainEqual({
      type: "pinchStart",
      midpoint: { x: 200, y: 100 },
    });
    expect(effects).toContainEqual({
      type: "pinchTo",
      midpoint: { x: 300, y: 100 },
      ratio: 2,
    });
    // Un seul `grab` et un seul `panStart` pour toute la séquence.
    expect(types(effects).filter((t) => t === "grab")).toHaveLength(1);
    expect(types(effects).filter((t) => t === "panStart")).toHaveLength(1);
    expect(state.mode).toBe("pinch");
    expect(isWallClickGuarded(state, 5)).toBe(true);
  });

  it("continues with the remaining finger after a pinch, never as a tap", () => {
    const { state, effects } = run([
      [down(1, 100, 100), 0],
      [down(2, 300, 100), 5],
      [up(1, 100, 100), 10],
      [move(2, 302, 101), 20],
    ]);

    expect(state.mode).toBe("pan");
    expect(state.panId).toBe(2);
    expect(state.moved).toBe(true);
    // Pas de saut : le premier mouvement part de la position du doigt restant.
    expect(effects.at(-1)).toEqual({ type: "panBy", dx: 2, dy: 1 });
    expect(types(effects)).not.toContain("panEnd");
  });

  it("re-arms the guard on the last finger of a pinch, however late it lifts", () => {
    const { state } = run([
      [down(1, 100, 100), 0],
      [down(2, 300, 100), 5],
      [up(1, 100, 100), 10],
      [up(2, 300, 100), 5000],
    ]);

    expect(isWallClickGuarded(state, 5000 + WALL_CLICK_GUARD_MS - 1)).toBe(true);
  });

  it("rebases the pinch when one of the first two fingers lifts among three", () => {
    const { effects } = run([
      [down(1, 0, 0), 0],
      [down(2, 100, 0), 1],
      [down(3, 200, 0), 2],
      [up(1, 0, 0), 3],
    ]);

    const starts = effects.filter((e) => e.type === "pinchStart");
    expect(starts).toEqual([
      { type: "pinchStart", midpoint: { x: 50, y: 0 } },
      { type: "pinchStart", midpoint: { x: 150, y: 0 } },
    ]);
  });

  it("ignores a press that starts on a wall control", () => {
    const { state, effects } = run([
      [down(1, 100, 100, { onUi: true }), 0],
      [move(1, 200, 100), 10],
      [down(2, 300, 300), 15],
      [up(1, 200, 100), 20],
    ]);

    expect(types(effects)).toEqual(["attach", "detach"]);
    expect(state.ignored).toEqual([]);
    expect(state.pointers).toEqual([]);
  });

  it("forgets a control pointer when the last wall finger ends the sequence", () => {
    // Finger 1 pans the wall, finger 2 rests on a control. Lifting finger 1
    // detaches the window listeners, so finger 2's pointerup never arrives:
    // it must not stay ignored and block every later gesture.
    const first = run([
      [down(1, 100, 100), 0],
      [down(2, 300, 300, { onUi: true }), 5],
      [up(1, 100, 100), 10],
    ]);
    expect(first.state.ignored).toEqual([]);
    expect(first.state.attached).toBe(false);
    expect(types(first.effects)).toContain("detach");

    const next = run(
      [
        [down(3, 50, 50), 1000],
        [move(3, 120, 50), 1010],
      ],
      first.state
    );
    expect(types(next.effects)).toEqual(["attach", "grab", "panStart", "panBy", "dragStart"]);
    expect(next.state.mode).toBe("pan");

    // The stale control pointer lifting later changes nothing.
    const late = stepWallPointer(next.state, up(2, 300, 300), 1020);
    expect(late.effects).toEqual([]);
    expect(late.state.mode).toBe("pan");
  });

  it("ignores secondary mouse buttons", () => {
    const { effects } = run([
      [down(1, 100, 100, { pointerType: "mouse", button: 2 }), 0],
    ]);
    expect(effects).toEqual([]);

    const pressed = run([[down(1, 100, 100, { pointerType: "mouse" }), 0]]);
    const released = stepWallPointer(
      pressed.state,
      up(1, 100, 100, { pointerType: "mouse", button: 2 }),
      10
    );
    expect(released.effects).toEqual([]);
    expect(released.state.pointers).toHaveLength(1);
  });

  it("ends a mouse drag whose button was released outside the window", () => {
    const { state, effects } = run([
      [down(1, 100, 100, { pointerType: "mouse" }), 0],
      [move(1, 150, 100, { pointerType: "mouse" }), 10],
      [move(1, 400, 400, { pointerType: "mouse", buttons: 0 }), 20],
    ]);

    // Le mouvement fantôme ne déplace pas le mur et ne compte pas pour l'élan.
    expect(effects.filter((e) => e.type === "panBy")).toHaveLength(1);
    expect(types(effects).slice(-3)).toEqual(["panEnd", "dragEnd", "detach"]);
    expect(state.mode).toBe("idle");
  });

  it("drops everything on window blur", () => {
    const { state, effects } = run([
      [down(1, 100, 100), 0],
      [down(2, 300, 100), 5],
      [{ type: "blur" }, 10],
    ]);

    expect(types(effects).slice(-3)).toEqual(["panEnd", "dragEnd", "detach"]);
    expect(state.pointers).toEqual([]);
    expect(state.mode).toBe("idle");
  });

  it("lets a new press and a keyboard activation through the guard", () => {
    const dragged = run([
      [down(1, 100, 100), 0],
      [move(1, 200, 100), 10],
      [up(1, 200, 100), 20],
    ]);
    expect(isWallClickGuarded(dragged.state, 25)).toBe(true);

    const pressed = stepWallPointer(dragged.state, down(1, 100, 100), 30);
    expect(isWallClickGuarded(pressed.state, 30)).toBe(false);

    const activated = stepWallPointer(dragged.state, { type: "activate" }, 25);
    expect(activated.effects).toEqual([]);
    expect(isWallClickGuarded(activated.state, 25)).toBe(false);
  });

  it("does not move for an unknown pointer", () => {
    const { effects } = run([[move(9, 10, 10), 0], [up(9, 10, 10), 1]]);
    expect(effects).toEqual([]);
  });
});
