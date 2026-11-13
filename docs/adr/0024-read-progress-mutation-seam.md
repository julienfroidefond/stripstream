---
status: accepted
date: 2026-11-13
---

# Read progress has one client mutation seam

Marking a book read or unread lived in two `components/ui` buttons that each imported `@/app/actions/read-progress`, ran their own spinner, toast and logger, and left the refresh to whoever passed `onSuccess` (`BookCard` wired `router.refresh()` by hand). `SeriesHeader` repeated the same cycle for the whole series (action → `router.refresh()` → toast → log) with its own `bulkAction` state. Unlike favorites and shelf (`SeriesMutationsContext`, ADR 0008/0010), nothing was optimistic and nothing rolled back: the card waited for the round trip, and a failure left each surface to decide what to show. The protocol now lives in `ReadProgressMutationsProvider` (`src/contexts/ReadProgressMutationsContext.tsx`): `useReadProgressMutations()` returns `resolveBook`, `resolveSeries`, `markBook(book, read)`, `markSeries(series, read)`, `pendingBook(id)` and `pendingSeries(id)`. The provider owns the server actions, the optimistic override, the per-id lock, rollback, toasts, logging and the refresh; the override rules are a pure module (`src/contexts/read-progress-overrides.ts`) that pairs each override with the server state it observed, so the refreshed server value takes over without cleanup — the same rule as the series mutations. The buttons moved to `src/components/series/BookReadButtons.tsx` and only receive `onClick` and `pending`.

## Considered options

- Extend `SeriesMutationsContext` with read progress: rejected. Favorites and shelf are per-series booleans; read progress is per book with a page count and a series aggregate (`booksReadCount`), with its own toasts and its own refresh rule (a partial series failure must still refresh). Folding it in would double the size of a context whose callers never need both. The two seams share the override-with-observed-baseline rule, not their state.
- A hook without a provider (local state per card): rejected. The series header and the book cards must agree on what is pending, and a second mount of the same book (grid + list after a toggle) would show two different optimistic states.
- Keep the buttons smart and only centralise the toast: rejected. The duplication that hurt was the cycle (action → result check → refresh → toast → log), and optimism needs a single owner of the override to roll it back.

## Consequences

- Marking a book is optimistic: the card shows it read/unread immediately, the action targets the book's series tag (`invalidateReadProgress(seriesId)` instead of the global series-books tag), a failure removes the override and toasts, a success toasts and issues one `router.refresh()`. A second mark on the same id while one is in flight is ignored.
- Marking a series shows the optimistic count in the header (status badge, cover dimming) and keeps the previous refresh rule: refresh as soon as the action answers, including on partial failure, and roll the count back on failure. A thrown action does not refresh, as before.
- `ReadProgressMutationsProvider` is mounted in `app/layout.tsx` next to `SeriesMutationsProvider` (the two mutation roots are siblings, neither knows the other); tests mount it directly.
- The reader is untouched: its continuous progress session (`useReadProgressSession`) writes silently and is not a user "mark" action.
- The read celebration (`burst`) fires on click, since the optimistic render removes the button; the unread nudge on a button that disappears is dropped.
- Cleanups landed with the seam because they sat on the same cards:
  - `BookCover` lost `onSuccess`, `showControls`, `showOverlay` and `overlayVariant`. All five callers passed `showControls={false} showOverlay={false}`, so the overlay, the controls and the `home` variant (~80 lines) were dead; the rendered DOM is unchanged.
  - Missing volumes are no longer fake `NormalizedBook`s with `volumeType: "_missing"` recognised by a magic string. `mergeMissingBooks(books, missing)` (`src/components/series/bookGrouping.ts`) is pure and tested and returns a discriminated `DisplayBook` (`kind: "book" | "missing"`), which `BookCard`, `BookGrid` and `BookList` switch on. The "hide missing" toggle of the series grid goes through `usePaginatedGrid` (`initialHideMissingBooks` / `hideMissingBooks` / `handleHideMissingToggle`, local state plus the `hideMissingBooks` preference, part of the flip key), so `captureLayout`, `persistPreferences` and the unused `updateUrlParams` left the hook's public controller.
  - `ContinueReadingHero` uses `wrapIndex`, `resolveGoTo` and `resolveSlidesChange` from `src/lib/carousel/index-machine.ts` (ADR 0017) instead of recoding the modulo, the same-index refusal and the "land on the first new item" rule; its props and behaviour are unchanged.

Refs: ADR 0008, ADR 0010, ADR 0017.
