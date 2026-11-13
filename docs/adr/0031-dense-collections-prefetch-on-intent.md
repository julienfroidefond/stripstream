---
status: accepted
date: 2026-11-13
---

# Dense collections prefetch on intent, never on viewport entry

Every series and book card rendered a Next `<Link>` with the default `prefetch`, so each link that entered the viewport prefetched its route: one `/series/<id>?_rsc=…` RSC request per card, two requests per route in Next 16 (route tree, then segment data). A library grid shows up to 90 cards, the home rows a few dozen, and the wall up to 420 tiles at once in its overview — and panning the wall, scrolling a grid or letting the prefetch cache expire replays the whole set. In production this burst (≈ 5 400 requests) tripped the reverse proxy's rate limit (Traefik answered 429) and the server was blacklisted. On `main`, the E2E stub data alone (18 wall tiles, 32 library cards) produced 15 and 9 prefetches before the user touched anything.

Collections now link through `IntentLink` (`src/components/common/IntentLink.tsx`): a `<Link prefetch={false}>` that calls `router.prefetch(href)` once per mounted link, on keyboard focus or pointer press immediately, and after the mouse rests `INTENT_PREFETCH_DELAY_MS` (150 ms) on it — a pointer sweeping across a grid prefetches nothing. The wall tile uses `prefetch={false}` with no intent prefetch, because a click there opens the plaque, whose single series link keeps the default prefetch. Navigation links that exist once per page (header, sidebar, plaque, pagination, empty states) keep the default.

## Considered options

- Keep the default and rely on the proxy: rejected. The request count grows with the collection size and the user's scrolling, not with intent, and one heavy library is enough to get blacklisted.
- `prefetch={false}` everywhere with no replacement: rejected. Next's App Router then skips hover prefetching too, so every card navigation would wait for the full RSC round-trip; one intent prefetch keeps navigation instant for the card the user is about to open.
- Raise `staleTimes` so prefetches are not replayed: rejected as the fix. It only stretches the interval between bursts; the first render of a dense surface still fires one prefetch per card.

## Consequences

- `src/components/common/IntentLink.architecture.test.ts` fails if a dense surface (`cover-card`, `book-cover-scene`, `RecommendationsRow`, `InProgressCard`, `BookCard`, `ReadingListCard`, `GlobalSearch`, the ratings grid) imports `next/link` again, or if the wall tile loses `prefetch={false}`.
- `tests/integrations/prefetch-budget.spec.ts` (production build) asserts zero `/series/…?_rsc=` requests after rendering the wall and a library grid, zero while flinging the wall around (12 fast drags + wheel; `main` fired 19 for 6 newly revealed covers), and a single route prefetch for the card the user hovers.
- A new collection component links through `IntentLink`; the default `<Link>` is for links that appear a bounded number of times per page.
- The first navigation from a card the user clicks without hovering (touch, or a fast click) starts its RSC request on press instead of ahead of time; the route's `loading.tsx` covers that wait.
