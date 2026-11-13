---
status: accepted
date: 2026-11-13
---

# The carousel gesture is a pure policy, not a handler

`SwipeTrack` decided everything inline in its pointer handlers: the 6 px axis lock, the `0.7 / 0.3` velocity smoothing, the 80 ms stale-momentum cutoff, the 120 ms velocity projection, the `max(40, width * 0.12)` distance threshold, the `0.35` velocity threshold, the direction of the target slide, the snap duration formula and the click-suppression rule. `SpotlightCarousel` carried the other half — index wrap-around, refusal to "change" to the current slide, posing on the first newly loaded slide, clamping after a shrink — with the formulas inlined in `goTo` and one `useEffect`. None of it could be tested without a DOM, GSAP and pointer events, and the two halves had to agree by reading each other's source. The decision rules now live in `src/lib/carousel/gesture.ts` (`beginDrag`, `moveDrag`, `releaseDrag`, `snapDuration`, `shouldSuppressClick`) and `src/lib/carousel/index-machine.ts` (`wrapIndex`, `resolveGoTo`, `resolveSlidesChange`); `SwipeTrack` and `SpotlightCarousel` only translate events into transitions and apply the resulting tween, pointer capture and backdrop cross-fade.

## Considered options

- A full reducer with a `CarouselAction` union: rejected because the transitions are driven by continuous pointer samples, not discrete events, and a reducer would have had to return side-effect instructions (`capturePointer`, `advance`, `settle`) next to the state anyway — the plain transition functions state that contract more honestly and stay trivially testable.
- Extract only the threshold constants: rejected because the coupling that hurt was the sequence (axis lock → capture → velocity → release decision), not the numbers.
- Test through the component with a DOM testing library: rejected because jsdom does not produce useful pointer/timing behaviour; the policy is where the bugs were.

## Consequences

- Threshold, direction, inertia, axis lock, reduced-motion disablement, wrap-around, grow-pose and shrink-clamp are covered by 25 unit tests without a browser.
- `SwipeTrack` no longer owns constants or drag fields; `SpotlightCarousel` no longer owns the modulo or the clamp rules.
- Observable behaviour is unchanged: same thresholds, same velocity filter, same tween durations, same target index. GSAP still owns the animation, and the adapter still kills in-flight tweens on a new press or a key change.
- A second carousel (hero, reading lists) can reuse the same policy without copying the handlers.

Refs: #164.
