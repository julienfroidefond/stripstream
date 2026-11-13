---
status: accepted
date: 2026-11-13
---

# The home feed policy is declared by the registry

ADR 0012 gave every home row one loader and one page rule, and ADR 0013 gave the hero one orchestration, but the *policy* around them stayed in the callers. `src/app/page.tsx` wrapped each feed in its own fallback (`settleHomeFeed`, except favorites, which used a bare `.catch`), computed the "everything failed → error" rule on its own list of promises, and hid the personal sections in anonymous mode inside the section components — after the loader had already queried the provider for `ongoing` and `continue-reading` and thrown the result away. On the other path, `loadHomeFeed` and `loadContinueReading` had no fallback and no runner: a provider error reached the client as a raw rejection.

Each registry entry in `src/lib/home/feed-registry.ts` now declares its policy next to its loader and page rule: `{ anonymous: "hide" | "load", initial: "eager" | "deferred", onFailure: "empty", countsTowardOutage }`. The hero declares the same shape in `src/lib/home/home-feeds.ts`. That module owns the only two entry points: `loadHomeFeeds(provider, { isAnonymous })` returns settled states (`hidden`, `deferred`, `loaded`, `failed` — each with its page, empty on failure) plus an `outage` promise for the "everything failed" rule, and `loadNextHomeFeedPage(provider, section, offset, context)` serves "load more" for both rows and the hero. Hidden sections are never queried. The page only renders states; both actions go through `runProviderAction` and return `ActionResult<FeedPage<T>>`, and `useFeedPagination` keeps the current page and the button on a failed result.

## Considered options

- Keep the policy in the page and only add a runner to the action: rejected because the anonymous rule and the failure rule would still be duplicated between the two paths, and anonymous mode would keep paying for discarded requests.
- Put the policy in `loadSurface`: rejected because the gateway decides a page's terminal state, not the per-feed degradation inside a ready page.
- Make every loader swallow its own errors: rejected because the action must report a failure to the client (so the button stays available) while the initial render must degrade to an empty row; the policy, not the loader, chooses.

## Consequences

- A new row declares its policy with its registry entry; neither the page nor the action has a fallback to copy.
- Favorites keep `countsTowardOutage: false`: they stay visible in anonymous mode and do not hide a provider outage. Recommendations stay `initial: "deferred"`: the page mounts `DeferredRecommendations` only when the state is `deferred`, so anonymous mode no longer renders it at all.
- "Everything failed" counts only visible, eager, counted sections, so in anonymous mode it is decided on the catalog rows actually loaded.
- The actions read the viewer's preferences on each "load more" to apply the anonymous rule, one cached read per request.
- With no active provider, the actions now return `PROVIDER_NOT_CONFIGURED` instead of an empty page; the client keeps the current rows.
- Failed feeds are logged once, with the feed name, by `loadHomeFeeds`.
- `continue-reading-feed.architecture.test.ts` keeps loaders, fallbacks and `getProvider` out of `src/app/page.tsx` and `src/app/actions/home.ts`.

Refs: ADR 0012, ADR 0013, ADR 0006.
