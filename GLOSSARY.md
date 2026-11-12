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

## Read progress session

The write policy for the reader's current page: the trackable cursor, the
500 ms debounce, immediate completion at the last page, serialized writes and
the final flush. Navigation emits `track(page)` intents. Owners:
`src/lib/reader/read-progress-session.ts` (pure policy) and
`src/components/reader/hooks/useReadProgressSession.ts` (React lifecycle and
the `updateReadProgress` adapter).

## Reading list

A curated, ordered set of series exposed by Stripstream Librarian only. The
provider contract normalizes it to `NormalizedReadingList` (summary) and
`NormalizedReadingListDetail` (series items); `supportsReadingLists` gates the
dedicated page and Komga returns an empty collection. Preview covers are
resolved to displayable URLs at the provider boundary. Status and totals owner:
`src/lib/services/reading-lists.service.ts` (`getReadingListStatus`,
`getReadingListTotals`).

## Preference write

The client-side policy for changing `UserPreferences`: optimistic merge,
coalescing of continuous controls, serialized server writes, rollback to the
last confirmed snapshot, auth reset and one feedback event per batch. Owners:
`src/lib/preferences/preferences-writer.ts` (pure policy) and
`src/contexts/PreferencesContext.tsx` (server action, snapshot and toast
adapter). `feedback` is `silent`, `errors` or `all`; `flushPreferences()`
commits the last slider value.

## Continue reading

The home hero built from the two feeds above. "Continue reading" is the
surface; "resume state" is the data policy behind it.

## Page surface

A page's data-backed view plus the context it needs to render (active provider,
provider type, preferences, anonymous mode). `loadSurface` resolves that
context once and returns one of four terminal states: `ready`,
`anonymous-empty`, `unavailable` or `error`. Owners:
`src/lib/surfaces/load-surface.ts` (Next wiring),
`src/lib/surfaces/surface-loader.ts` (pure state machine) and
`src/components/ui/SurfaceBoundary.tsx` (single terminal; pages render only
`ready` and override the terminal they need).

## Book card

The single series book surface used by both the grid and the list. It owns the
cover link, the missing-volume placeholder, the derived reading status, the
read/unread/download actions and the one post-mutation refresh
(`router.refresh()`). `BookGrid` and `BookList` only choose the layout. Owners:
`src/components/series/BookCard.tsx` (component, actions, layouts) and
`src/components/series/book-card-view.ts` (pure labels and reading state);
reading badge derivation: `src/lib/books/reading-status.ts`.

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

The adapter that turns a `MediaRef` into a provider path and a raw byte request
through `ProviderTransport.response()`. It resolves the active connection once
per request, owns the image deadline, the limiter, the conditional validators
and the coalescing key (built from the resolved `configId`, not the cookie),
then rebuilds one `Response` per caller when a buffered payload is shared. The
route never sees credentials or provider paths. Owners:
`src/lib/media/komga.transport.ts`, `stripstream.transport.ts`,
`media-route-core.ts`, `media-fetch.ts`; cache and error shape: `policies.ts`.

## Provider transport

The shared request lifecycle for both providers: URL assembly, auth headers,
Next cache options, one retry, the 15 s timeout, JSON parsing / empty-body
handling and HTTP/network error mapping. `request<T>()` carries JSON API calls
(reads and mutations); `response()` opens a raw image or source-file stream with
the same policy plus per-call `Accept`, validators, `304` acceptance and
`no-store`. A provider only supplies a policy (origin and path prefix, headers,
HTTP-to-error codes, retry rule, cache key). Owner:
`src/lib/providers/provider-transport.ts`; policies:
`komga.transport-policy.ts` and `stripstream.transport-policy.ts`.

## Wall phase

The Wall's interaction state: `idle` (tilt and hover allowed), `pan` (a
pointer gesture is active), `focus` (the camera is flying to a cover),
`plaque` (the anchored panel is open) or `sheet` (the mobile bottom sheet is
open). Owner: `useWallPhase` (`src/components/wall/useWallPhase.ts`) with the
pure transition table in `src/lib/wall-phase.ts`; `WallTile` receives
`tiltAllowed` instead of inspecting stage attributes.

## Wall filter session

The client-side owner of the Wall's library and read-state filters: restored
selection, write gate, visible items, composition seed, panel close when the
wall empties and the one-shot entrance skip. Owner: `useWallFilters`
(`src/components/wall/useWallFilters.ts`); pure parsing and filtering stay in
`src/lib/wall-filter.ts`, and a fake `WallFilterStorage` drives hydration-order
tests.
