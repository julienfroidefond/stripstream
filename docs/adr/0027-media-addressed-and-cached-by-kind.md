---
status: accepted
date: 2026-11-13
---

# Media is addressed and cached by kind

ADR 0003 made `MediaRef` provider-neutral, but the edges around it stayed provider-shaped. `MEDIA_POLICIES` had six ad hoc entries keyed by provider, so the same `book-page` ref was `public, max-age=2592000, immutable` from Komga and `public, max-age=86400` from Stripstream, and a failed Stripstream cover answered an empty `404` where a Komga cover answered JSON. Some fifteen `/api/komga/...` and `/api/stripstream/...` literals in the adapters and providers rebuilt the route shapes by hand, and ten route handlers re-parsed them with their own page validation. Three routes were dead (`komga/books/[bookId]/pages/[pageNumber]`, a clone of the image page route with its own one-year policy; `komga/images/series/[seriesId]/first-page`, identical to the series thumbnail route; `stripstream/search`, a clone of `provider/search`). Worse, the Komga transport read the user's `showThumbnails` preference to pick the thumbnail or the first page, and served the result `public, immutable` for 30 days at a URL that does not carry the choice: changing the setting had no visible effect for a month, and a shared cache could hand one user's choice — or one user's server's bytes — to another.

`src/lib/media/media-url.ts` is now the single source of the route shape. `MEDIA_ROUTE_PATTERNS` maps each kind to its path under `/api/<provider>/` (the dynamic segments are the `src/app/api` folders), `SERVED_MEDIA_KINDS` lists what each provider serves, `mediaUrl(provider, ref)` and `bookPageUrlTemplate(provider, kind, bookId)` build every URL the adapters and providers emit, and `parseMediaRef(kind, params, url)` is the inverse the routes apply. A route file is one line, `createMediaRoute(provider, kind)`; `media-url.test.ts` fails when a served pair has no file at its pattern, when an undeclared media route exists, or when a URL does not round-trip to its ref. `MEDIA_POLICIES` holds one policy per kind, resolved by `mediaPolicy(provider, kind)`; every response is `private`, images share one JSON error shape, and the only remaining provider override is the Komga cover pair, which is `private, no-cache` because its bytes depend on the preference.

| Kind | `Cache-Control` | Errors |
| --- | --- | --- |
| `book-file` | `private, no-store` | JSON, mapped status, provider HTTP error fallback |
| `book-page`, `book-page-thumbnail` | `private, max-age=2592000, immutable` | JSON, `404` not found, else `500` |
| `book-cover`, `series-cover` | same; Komga override `private, no-cache` | same |

## Considered options

- **Carry the cover choice in the URL** (`?source=first-page`), decided at render where the preference is known: rejected for now. Cover URLs are emitted by the adapters inside `unstable_cache` entries that are not keyed by user preference, and are rendered by about a dozen `<img>` sites. Doing it right means per-preference cache keys in the providers (owned by the provider cache chantier) or a client-side rewrite that would teach components which provider honours the setting. It stays the better end state if revalidation cost shows up.
- **`Vary: Cookie` or a preference cookie**: rejected. Any cookie change (session rotation, provider switch, locale) would bust every cover, and caches handle `Vary: Cookie` inconsistently.
- **Drop the preference for Komga**: rejected, it removes a user-visible setting without a product decision.
- **One neutral `/api/media/...` route family**: rejected. The `/api/komga/...` and `/api/stripstream/...` URLs are already in browser caches and in cached provider payloads; the prefix stays, only its construction is centralised.
- **Keep provider-keyed policies and document the gaps**: rejected. The one-day Stripstream page TTL and the empty-404 cover shape had no recorded reason, and `<img>` and the reader only test `response.ok`, so neither difference was observable to a client.

## Consequences

- Changing `showThumbnails` now takes effect on the next display of a Komga cover. Each display revalidates: the route resolves the session and the preference and sends a conditional request to Komga, which answers `304` while the source is unchanged. Covers are the most numerous images, so this trades a 30-day pin for one cheap round trip per cover view; `imageRequestLimiter` still bounds the upstream concurrency.
- Stripstream pages go from one day to 30 days immutable. The page URL already includes the book id, page number and format query; a book file rewritten in place under the same id would show stale pages for up to 30 days in that browser, as Komga pages always could.
- `public` becomes `private` everywhere: browsers cache exactly as before, but a CDN or reverse proxy in front of Stripstream no longer stores media. Entries already cached under `public, immutable` (including Komga covers with the old preference) are not invalidated by this change and expire on their own schedule — up to 30 days in a browser that already holds them.
- A Stripstream image failure is now JSON `500` (or `404` when upstream says not found) instead of an empty `404`; Komga `book-page` gains the `image/jpeg` default content type the Stripstream page already had.
- Adding a kind means the union, its pattern, `SERVED_MEDIA_KINDS`, `parseMediaRef`, its `MEDIA_POLICIES` entry and the route file; the tests fail until all of them agree.
- `stripstream.client.ts` still wraps `ProviderTransport` for the Stripstream provider. Removing it touches about forty-five call sites in `stripstream.provider.ts`, which is being reworked in parallel, so it is left for a follow-up rather than folded into this change.

Refs: ADR 0001, ADR 0003, ADR 0007, ADR 0015.
