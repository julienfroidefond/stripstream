---
status: accepted
date: 2026-11-13
---

# Cache profiles are produced in one place

ADR 0007 made tags a vocabulary and invalidation a recipe, but the read side stayed in the providers. `CACHE_TTL_LONG/MED/SHORT` were copied verbatim into `komga.provider.ts` and `stripstream.provider.ts` (and a third `120` hid in `series-identity.ts`); the tag selection of `getBooks` (`series-books` + `series-books:${seriesId}` + `library-books:${libraryId}`) was written twice line for line; and providers mixed raw constants (`STATS_CACHE_TAG`, `FAVORITES_CACHE_TAG`, …) with `cacheTags`, against the comment of `cacheConstants.ts`. A tag added to one provider's read and forgotten in the other would only show up as a stale page on one backend. On the invalidation side, `actions/library.ts` (scan) and `actions/preferences.ts` still called `revalidatePath` themselves.

`src/constants/cacheProfiles.ts` now owns the read side. `CACHE_TTL` holds the three durations and `cacheProfile` exposes one function per kind of read, returning a fresh `{ revalidate?, tags? }` (or `{ cache: "no-store" }` for the reader's book): `libraries()`, `librarySeries(libraryId)`, `books({ seriesId, libraryId })`, `readerBook()`, `bookPages()`, `readProgress()`, `nextBook()`, `search()`, `series()`, `home()`, `readingLists()`, `readingListDetail()`, `shelvedSeries()`, `seriesShelf(id)`, `readSeries()`, `seriesRating(id)`, `favorites()`, `recommendations()`, `relatedSeries(id)`, `stats()`. Providers pass the profile unchanged to their existing mechanism — Komga's `unstable_cache` options for the home feeds, `ProviderTransport.request` options everywhere else (Komga's transport policy still wraps POST reads in `unstable_cache`, Stripstream's still forwards `next` fetch options). Providers no longer import a tag constant, `cacheTags` or a TTL. The two invalidations that bypassed `invalidation.ts` became recipes: `invalidateLibraryScan(libraryId)` and `invalidatePreferences()`.

## Considered options

- Hoist only the TTL constants into `cacheConstants.ts`: rejected. It removes the copied numbers but leaves each provider assembling its own tag list, which is the duplication that can silently drift.
- Let `ProviderTransport` choose the profile from the request path: rejected. Paths differ per backend (`books/list` vs `books`), so the transport would need a per-provider table, and the decision would move away from the read that knows its filter.
- A per-provider profile table (`komgaProfiles`, `stripstreamProfiles`): rejected. The point is that the same read gets the same profile on both backends; two tables would only rename the duplication.
- Fold the profiles into `cacheConstants.ts`: possible, but a neighbouring module keeps `cacheConstants.ts` the plain vocabulary that recipes and profiles both read.

## Consequences

- TTLs and tag sets per read are unchanged; `cacheProfiles.test.ts` pins every profile and `cache-profile.contract.test.ts` proves that both providers hand over the same profile for `getBooks`, `getSeries`, `getLibraries`, `getReadProgress`, `getBook`, `search`, the home feeds and the reading stats. TTLs and tags are now both applied by the transport (see below).
- A new read picks or adds a profile; a new tag goes into `cacheTags` first, then into the profile that produces it and the recipe that expires it.
- `cacheTags` gained `allSeriesRatings` and `allSeriesShelves`, the global tags the rating and shelf reads already produced.
- `src/app/actions/` has no direct `revalidatePath`/`updateTag` call left; every action invalidates through a recipe.
- Inherited inconsistencies are kept, not fixed here: Komga's `getNextBook` has no profile (uncached) while Stripstream's uses `nextBook()` (30 s); the stats profile declares no TTL. Changing either alters cache behaviour and deserves its own decision.
- `ProviderTransport.request` used to forward only `tags` when a profile carried both `tags` and `revalidate`, so a tagged read stayed cached until a local mutation expired its tag and never saw changes made directly on the backend. The transport now forwards both (`next: { revalidate, tags }`, and the same object to `unstable_cache` for POST reads): the profile's TTL is the freshness bound and the tag the targeted invalidation. Tagged reads therefore refresh at most every `CACHE_TTL` seconds where they previously did not.

Refs: ADR 0007.
