# Glossary

Domain terms shared by the code, the docs and the UI. When a term has an
owner in the codebase, the owner is listed here.

## Resume state

"Which book to open next" plus "how far the reader is", for one book or one
series. The home hero, the continue-reading feed and the in-progress page all
present it. Owner: `src/lib/resume/resume-state.ts` — `mergeResumeBooks`,
`buildResumeEntries`, `getBookProgressPercent`, `getSeriesProgressPercent`.

## Series identity

The rule that maps a book to its series from its explicit reference. A
`NormalizedBook` carries two fields: `seriesId` is the provider series id and
is never a title; `seriesName` is the display name used only as a fallback when
the endpoint omits the id. `matchSeries` tries the exact id first, then the
normalized title, then the same-library candidate, a candidate without a
library, and finally the first candidate. Owner:
`src/lib/resume/identity.ts` (`matchSeries`, `bookSeriesRef`).
`resolveBookSeries` (`src/lib/resume/series-pool.ts`) is the single network
fallback for name-only rows; `resolveSeriesPool` reuses it for the home feeds.

## On deck

The next unread book of a series, as proposed by the provider (`onDeck`). It
may already have partial progress; the hero merges it with `ongoingBooks`,
on-deck first and deduplicated by book id.

## In progress

A series the reader has started but not finished (`ongoingBooks`, plus shelved
series). The in-progress page turns it into cards with the current book, the
next book and the series progress. Owner:
`src/lib/services/in-progress.service.ts`.

## Continue reading

The home hero built from the two feeds above. "Continue reading" is the
surface; "resume state" is the data policy behind it.

## Page surface

A page's data-backed view plus the context it needs to render (active provider,
provider type, preferences, anonymous mode). `loadSurface` resolves that
context once and returns one of four terminal states: `ready`,
`anonymous-empty`, `unavailable` or `error`. Owners:
`src/lib/surfaces/load-surface.ts` (Next wiring) and
`src/lib/surfaces/surface-loader.ts` (pure state machine).

## Action result

The discriminated result returned by server actions that use the action
runner: a success carries `success: true`, `code: "OK"` and a message; a
failure carries `success: false`, the stable `ErrorCode` and a message, plus
optional partial data. Owner: `src/lib/actions/action-runner.ts`.

## Media ref

A provider-neutral description of the bytes a media route asks for:
`book-file`, `book-page`, `book-page-thumbnail`, `book-cover` or
`series-cover`. It carries ids, the 1-based page number and (Stripstream) the
raw query string, never a provider URL. Owners: `src/lib/media/types.ts`
(`MediaRef`) and the route declarations (`createMediaRoute`).

## Book media contract

The two local proxy URL templates a `NormalizedBook` carries for the reader:
`media.pageUrlTemplate` and `media.thumbnailUrlTemplate`. Both contain a
`{page}` token filled with a 1-based page number by `resolveBookMediaUrl`;
provider adapters own the route shape, and the Komga transport owns the
conversion to Komga's zero-based pages. Owners:
`src/lib/providers/types.ts` (`NormalizedBookMedia`),
`src/lib/providers/book-media.ts`, `src/lib/media/komga-paths.ts`.

## Media transport

The adapter that turns a `MediaRef` into a provider request and normalizes the
response. The Komga transport wraps the book/image/series services; the
Stripstream transport uses the shared client factory, limiter and
deduplication. The route never sees credentials or provider paths. Owners:
`src/lib/media/komga.transport.ts`, `stripstream.transport.ts`,
`media-route-core.ts`; cache and error shape: `policies.ts`.

## Wall phase

The Wall's interaction state: `idle` (tilt and hover allowed), `pan` (a
pointer gesture is active), `focus` (the camera is flying to a cover),
`plaque` (the anchored panel is open) or `sheet` (the mobile bottom sheet is
open). Owner: `useWallPhase` (`src/components/wall/useWallPhase.ts`) with the
pure transition table in `src/lib/wall-phase.ts`; `WallTile` receives
`tiltAllowed` instead of inspecting stage attributes.
