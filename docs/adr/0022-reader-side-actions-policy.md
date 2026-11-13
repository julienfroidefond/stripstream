---
status: accepted
date: 2026-11-13
---

# Reader side actions and the prefetch plan are pure policies

The rule "in LTR the left side goes back, in RTL it goes forward" was written six times: in the keyboard resolver, the swipe handler, the edge buttons, the spread order, the start-of-book bump and the shortcuts dialog. The copies drifted. `ControlButtons` tied each arrow's visibility to its side (`currentPage > 1` for the left arrow) while its action followed the direction, so on page 1 of an RTL book the left arrow — which moves forward — was hidden and only a dead "previous" arrow showed; both tooltips also stayed "previous"/"next" by side. The pinch-zoom threshold `visualViewport.scale > 1.15` was duplicated between the swipe and the page-turn animation, and `usePageNavigation` received an `onClose` it never used. In parallel, `useImageLoader` decided inline which pages to prefetch, and its next-book branch ignored the failure state that the current-book branch honoured, so a failed `next-*` page was retried (three attempts with backoff) on every page turn near the end of a book.

The side rule now lives in `src/lib/reader/side-actions.ts`: `resolveSideAction(side, { direction, currentPage, totalPages })` returns `{ side, action, visible, labelKey }`, where `visible` is true exactly when `planPageMove` would turn a page and `labelKey` follows the action. `actionForSide`, `sideForAction`, `sideForArrowKey`, `sideForSwipe`, `spreadOrder`, `startBumpMotion`, `arrowGlyphForAction` and `isViewportZoomed` (with the shared `ZOOM_SCALE_THRESHOLD` and `SWIPE_MIN_DISTANCE`) serve the other spatial inputs. The prefetch choice lives in `src/lib/reader/prefetch-plan.ts`: `planPrefetch({ currentPage, totalPages, isSpread, prefetchCount, hasNextBook, statusOf })` returns the visible pages, the upcoming window with its concurrency and the next-book keys, skipping every key the loader reports as loaded, pending or failed. `useImageLoader` keeps the execution, retry, abort, eviction and blob lifetime unchanged (ADR 0011).

## Considered options

- Fix only the `ControlButtons` conditions: rejected because the same rule would still be re-derived in five other places and could drift again.
- Keep the edge buttons by side and pass the action as a prop: rejected because visibility, tooltip and test id all depend on the action, not on the side; one resolved object carries the three.
- Put the prefetch plan inside `imageEviction.ts`: rejected because eviction answers "what to drop" over the registry while the plan answers "what to fetch" from the reader position; they share no inputs beyond the current page.

## Consequences

- On page 1 of an RTL book the left arrow is visible and moves forward; on the last page it hides. Tooltips read "previous"/"next" according to what the arrow does.
- Edge-button test ids follow the action (`reader-previous-page`, `reader-next-page`), so in RTL `reader-next-page` is the left arrow.
- A new spatial input (click zones, a gamepad) asks `actionForSide` instead of reading `isRTL`.
- A failed next-book page stays failed for the life of the reader; it is not retried on page turns. Visible pages are still requested on every move, so a failed visible page keeps its explicit retry path.
- In spread mode the prefetch window always reaches one page further, including when that page is the last of the book (the previous code skipped it in that single boundary case).
- The behaviour is covered by unit tests on both pure policies and one loader regression test; the on-screen arrows and the bump animation remain E2E-only.

Refs: ADR 0010, ADR 0011.
