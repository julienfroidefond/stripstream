# Glossary

Domain terms shared by the code, the docs and the UI. When a term has an
owner in the codebase, the owner is listed here.

## Resume state

"Which book to open next" plus "how far the reader is", for one book or one
series. The home hero, the continue-reading feed and the in-progress page all
present it. Owner: `src/lib/resume/resume-state.ts` — `mergeResumeBooks`,
`buildResumeEntries`, `getBookProgressPercent`, `getSeriesProgressPercent`.

## Series identity

The rule that maps a book to its series when `seriesId` can be an id (Komga) or
a title (Stripstream). Order: exact id, normalized title, same-library
candidate, candidate without a library, first candidate. Owner:
`src/lib/resume/identity.ts` (`matchSeries`). `resolveSeriesPool` applies the
same comparison when it asks the provider for a missing series.

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
