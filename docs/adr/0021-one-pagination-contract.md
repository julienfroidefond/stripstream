---
status: accepted
date: 2026-11-13
---

# Paginated provider lists share one page-number contract

`NormalizedSeriesPage` / `NormalizedBooksPage` carried a `nextCursor: string | null` and optional `totalPages` / `totalElements`, and the input was a `cursor?: string`. In practice no backend has an opaque cursor: Komga paginates with zero-based Spring pages, the Librarian with one-based pages. The "cursor" was a page number in a string, and each side read it differently. Komga's `getSeries` and `getBooks` parsed it as `page = cursor - 1` and returned `nextCursor = String(page + 1)` — the cursor they had just received. `getAllSeriesBooks` trusted `nextCursor` first, so marking a Komga series of more than 100 volumes as read refetched page 1 until its 500-page guard tripped. Stripstream returned `nextCursor: null` with `totalPages` for the same methods but a real next page for `getReadSeries`, so every consumer wrote its own loop to cope with both. The unit test for `getAllSeriesBooks` simulated a `nextCursor: "2"` that Komga never produced, so the bug passed.

The contract is now explicit and typed: every paginated list (`getSeries`, `getBooks`, `ratings.getReadSeries`) takes a 1-based `page?: number` and returns `Page<T> = { items, page, totalPages, totalElements }`, with `totalPages >= 1` and every field required (`src/lib/providers/pagination.ts`). Each adapter translates its backend page once (`KomgaAdapter.toPage`, `StripstreamAdapter.toPage`); Komga's zero base never leaves its provider. Callers that need several pages go through a single `iteratePages(fetchPage, { max, concurrency? })`. A shared contract test runs the same walk against both providers over a simulated `fetch` and requires every item exactly once, in order, in `ceil(N / size)` requests — it is the test that would have caught the Komga bug.

## Considered options

- Fix the two Komga lines and keep `nextCursor`: rejected. It repairs this bug but leaves a string that each provider and each caller interprets differently, and the next adapter can repeat the mistake; the consumers still need a loop that understands both shapes.
- Keep a real opaque cursor for `getReadSeries`: rejected. The Librarian endpoint is the same page-numbered `GET /series` as `getSeries`; its "cursor" was `String(page + 1)`. Nothing justifies a second shape today. If a backend ever exposes a real cursor, it gets its own `CursorPage<T>` type and iterator rather than overloading this one.
- An async generator iterator: rejected for now. Every caller collects the whole list; a promise of an array is simpler to test and lets `getReadSeries` keep fetching its remaining pages in parallel through `concurrency`.
- Derive the next page from `items.length < limit` instead of `totalPages`: rejected. Komga filters `deleted` items after the response, so a short page is not proof of the last page.

## Consequences

- `getAllSeriesBooks` walks a Komga series page by page and stops at `totalPages`; bulk read/unread works beyond 100 volumes.
- `BookListFilter.cursor` became `page`, and `getSeries`'s second parameter is a `number`. Call sites (`collections/query.ts`, `wall.service.ts`, `series-pool.ts`) pass numbers. The ad hoc loops in `series-books.ts` and `read-series.service.ts` are gone.
- `totalPages` / `totalElements` are now required, so the UI fallbacks (`?? 1`, `?? items.length`) and the `totalElements &&` guard in `getReaderData` were removed.
- `iteratePages` stops on the first empty page and at `max`, so an inconsistent total cannot loop forever; the bound stays a caller decision (500 pages for a series, 5 for the ratings page).
- `iteratePages` does not deduplicate. `getReadSeries` keeps its own id filter, because offset pagination can shift an item across pages if the list changes during the walk.
- A new provider is held to the contract by `pagination.contract.test.ts`: add its simulated backend to the `describe.each` list.
