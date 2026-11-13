---
status: accepted
date: 2026-11-13
---

# Collection pages parse their query in one place

The library grid, the series book grid and the ratings page each read their own `searchParams` and rebuilt the same defaults: `DEFAULT_PAGE_SIZE = 30` twice, `page ? parseInt(page) : 1` twice, the page-size fallback on `displayMode.itemsPerPage` followed by `normalizeGridPageSize`, the unread fallback on `showOnlyUnread`, and, for the library only, the sort fallback plus the `community_score` downgrade. The client controller already normalised the sort (`normalizeSortOrder` in `usePaginatedGrid`), so a hand-edited URL could be served with a garbage sort while the UI displayed `title`. All of this now lives in `src/lib/collections/query.ts`: `parsePage`, `parseCollectionQuery`, `parseSeriesCollectionQuery`, plus the two provider adapters (`fetchSeriesCollectionPage`, `bookCollectionFilter`). Pages pass their resolved preferences and the provider capabilities once, receive a `CollectionQuery` / `SeriesCollectionQuery`, and hand it to the provider. The ratings page shares `parsePage` but keeps its own in-memory sort vocabulary (`read-series.service.ts`) and its fixed 60-item page: it is a different collection, and unifying it would have meant inventing a denominator.

## Considered options

- One generic `CollectionQuery<TFilter, TSort>` for series, books and ratings: rejected because the three differ by sort vocabulary, filter set and data source (provider page vs in-memory slice); the shared part is the page/size/unread trio, which is what the module exposes.
- Keep parsing in the pages and only share constants: rejected because the drift was in the fallbacks (preference vs URL precedence, capability downgrade), not in the numbers.

## Consequences

- A malformed `page` or `sort` is normalised (`1` / `title`) instead of being forwarded to the provider as `NaN` or an unknown string; valid URLs behave exactly as before.
- The default page size, the sort fallback and the unread fallback have one definition; a new collection surface gets them by calling the parser.
- `usePaginatedGrid` imports the same `normalizeSortOrder`, so client state and server fetch can no longer disagree on the sort.
- Ratings keeps its own page size and sort parser on purpose; the ADR records the divergence instead of hiding it.

Refs: #163.
