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
