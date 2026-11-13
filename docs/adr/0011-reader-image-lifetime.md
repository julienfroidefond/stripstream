---
status: accepted
date: 2026-11-12
---

# Reader image lifetime is owned by the loader and a synchronous registry

Blob URLs were tracked in React state, so a URL created just before unmount could escape revocation, and prefetch and eviction logic lived in more than one place. `BlobUrlRegistry` is now the synchronous source of truth for live URLs; `useImageLoader` owns prefetch, retry, the eviction window, replacement and unmount revocation, and pages render through `getPageImage(page)`. `useReaderState` only passes the current page and the double-page predicate.

## Considered options

- Keep URLs in state: rejected because state can lag a commit and loses the cleanup race.
- Revoke on navigation only: rejected because a long book still grows between navigations.

## Consequences

- No other code creates or revokes page blob URLs.
- Do not reintroduce a second prefetch or eviction effect.
- Eviction preserves pending fetches and `next-*` prefetched pages.

Refs: #130.
