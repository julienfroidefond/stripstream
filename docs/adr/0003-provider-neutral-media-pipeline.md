---
status: accepted
date: 2026-11-12
---

# Media is addressed by a provider-neutral ref, not a URL

The reader and route handlers used to know provider paths and derive page URLs from thumbnails. A `MediaRef` now describes *what* bytes are wanted (`book-file`, `book-page`, `book-page-thumbnail`, `book-cover`, `series-cover`), and `createMediaRoute` plus `MediaTransport` resolve it through the provider transport. `NormalizedBook.media` carries local `pageUrlTemplate` and `thumbnailUrlTemplate` with a 1-based `{page}` token; `resolveBookMediaUrl` fills it, and the Komga transport is the only place that converts to zero-based pages.

## Considered options

- Keep one route per provider endpoint: rejected because ten routes copied auth, 304, cache and error policy.
- Let clients build page URLs from `thumbnailUrl`: rejected because it couples the reader to Komga's path shape and caused page-thumbnail offset bugs.

## Consequences

- Adding a media kind means extending the union, its route declaration and its policy.
- Media route handlers never see credentials or provider paths.
- Cache headers and 304 handling come from `MEDIA_POLICIES`, not from individual routes.

Refs: #141, #142.
