---
status: accepted
date: 2026-11-13
---

# The wall camera speaks in intentions, the pointer machine is pure

`useWallCamera` returned twenty members, including the three writable `MotionNumber`s, so every caller had to know the camera's internal order. The wheel handler ran `stopMomentum → scale.stop → x.stop → y.stop → markPanning → cancelView → x.set`, the pan wrote `x.set + markPanning + cancelView`, `WallExperience` primed the zoom label with an effect that only worked because of where it was declared relative to the hook's own effects, and it rebuilt the visible rectangle from `x`/`y`/`scale` to draw a random tile. The pointer state machine (idle / pan / pinch, pointer rebasing, ignored UI pointers, ghost mouse button, pinch → pan without a tap) lived in an effect closure covered only by seven `renderHook` tests, and `wall-pinch.ts` mixed the zoom clamp with a mutable click guard shared by three call sites with two durations (420 ms in the hook, 500 ms in the lib) and a dead `endWallPinch`. `WallExperience` also inlined the plaque geometry, the anchor/sheet choice, the random draw, the dim-veil rectangle, a keyboard table with its own editable-field check, and two entrance timers (1500 ms and 1600 ms).

The camera now exposes intentions: `grab`, `panBy`, `beginPinch` / `pinchTo`, `release`, `wheel`, `cancelView`, `zoomBy`, `reset`, `fit`, `focusOn`, `viewRect`, plus read state (`camera`, `viewport`, `overview`, `panning`, `canvasRef`) and one read-only `zoom` reading whose `subscribe` delivers the current value immediately (the zoom label is the only render consumer that must follow every frame outside React). The `MotionNumber`s, `animateView`, `clampZoom`, `markPanning` and `stopMomentum` are private: 20 members became 18, none of them writable motion values. `src/lib/wall-pointer-machine.ts` is a pure `stepWallPointer(state, event, now) → { state, effects }` that owns the pointer sequence and the click guard (`WALL_CLICK_GUARD_MS`); `useWallGestures` only translates DOM events and applies effects to the camera, React and the window listeners, and returns `isClickGuarded` / `releaseClickGuard`. `WallExperience` delegates to `planWallFocus` (`wall-focus.ts`), `wallDimRect` / `pickRandomWallTile` (`wall-composition.ts`) and `resolveWallShortcut` (`wall-shortcuts.ts`). The zoom bounds moved next to the rest of the camera geometry in `wall-camera.ts` (with `wallWheelIntent` and `wallViewRect`) and `wall-pinch.ts` is gone.

## Considered options

- Keep the raw `MotionNumber`s public and document the call order: rejected — the order was exactly what leaked into three files and broke silently when an effect moved.
- A reducer with a dispatch inside the camera hook: rejected, for the same reason as ADR 0017 — the inputs are continuous pointer samples, and a pure transition returning explicit effects tests the sequence without React, GSAP or a DOM.
- Keep the click guard as a shared mutable object: rejected — three owners mutated it with different durations; the guard is part of the pointer sequence and now lives in its state.
- Keep a wall-specific input guard: rejected. `isEditableTarget` / `isActivableTarget` now live in the neutral `src/lib/keyboard-targets.ts`, shared by `resolveReaderShortcut` and `resolveWallShortcut`, so both surfaces agree on what swallows a shortcut.

## Consequences

- The pointer sequence is covered by 16 pure tests (pan slop, flick velocity and stale release, pinch rebasing among three fingers, pinch → pan continuation, late last finger, ignored UI pointers, secondary buttons, ghost button, blur, guard reset by a new press or a keyboard activation, purity), the camera intents by `renderHook` tests through public reads only, and the focus plan, random draw, veil, wheel translation and shortcut table by unit tests.
- Two durations were unified, deliberately: the click guard is 500 ms after both a drag and a pinch (was 420 ms after a drag), and the entrance wave lasts 1600 ms both on first open and when a filter change replays it (was 1500 ms on replay). A new press or a keyboard activation still lifts the guard at once, so the longer drag window only affects synthetic clicks. Every other duration, threshold and physics constant is unchanged.
- The wall's keyboard guard now matches the reader's: `input[type=button|submit|reset]` no longer swallows wall shortcuts, and a descendant of a `contenteditable` region is recognised through `closest` rather than `isContentEditable`. The wall renders neither case today.
- Callers can no longer bypass the camera's order: a new gesture adds an intention to `useWallCamera` or an effect to the machine, never a `MotionNumber` write.

Refs: ADR 0010, ADR 0017.
