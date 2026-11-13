---
status: accepted
date: 2026-11-12
---

# Home feed rows are driven by one registry

Each home row and the "load more" action had their own loader and page rule, so the initial render and pagination could disagree, and collection feeds were serialized whole. `src/lib/home/feed-registry.ts` now owns each row feed's loader and page rule. Probe feeds ask the provider for `offset + pageSize + 1`, so `hasMore` needs no count query; collection feeds (favorites, reading lists) are sliced to the same bounded page. The hero has its own orchestration (`src/lib/home/continue-reading-feed.ts`) because it merges on-deck and ongoing books, but it reuses the registry's first `ongoing` page as its series pool. `src/app/page.tsx` and `loadHomeFeed` both call the registry, and `FeedRow` is typed by the feed-to-item map with no runtime cast.

## Considered options

- Run a count query per feed: rejected because it adds a provider round-trip and the count can disagree with the page.
- Serialize full collections: rejected because the payload grows with the library size.

## Consequences

- A new row is a registry entry plus its item type; only a cross-feed row such as the hero gets its own module.
- Pages and actions do not call feed methods directly.
- `loadContinueReadingPage` returns one page, never a cumulative list.

Refs: #133, #149, #156.
