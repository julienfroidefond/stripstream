---
status: accepted
date: 2026-11-13
---

# A required capability owns its data and is handed to the loader

`getReadSeries` sat in `MediaProviderCore` because "the series a user has fully read" looked like a collection. Only one surface consumes it — the ratings page — and that page already requires the `ratings` capability. Komga, which declares no ratings, was therefore forced to implement a listing nobody could reach: it scanned up to ten pages of 200 series per library and filtered/sorted in memory, and the capabilities table had to describe it as a ratings feature anyway. In parallel, the page gateway checked `requireCapability` and then dropped the answer, so a page that needed the capability had to re-read `provider.capabilities` and assert non-null.

The listing now belongs to `RatingsCapability`, Komga's implementation is deleted, and the gateway hands the required capability back to the loader: `requireCapability: K` makes `context.capability` a `NonNullable<ProviderCapabilities[K]>`, and `SurfaceBoundary` carries the same type parameter to the `ready`/`anonymousEmpty` renderers. The page consumes `capability` directly and never re-checks what the gateway already proved.

## Considered options

- Keep `getReadSeries` in the core and make the Komga version honest (throw or return an empty page): rejected — that is exactly the "simulate an absent capability" pattern the capability contract forbids.
- A dedicated `readSeries` capability: rejected. The ratings page is the only consumer and rating the series you have read is the feature; a fourth key would duplicate the null state of `ratings` for every provider.
- A local guard in the page (`provider.capabilities.ratings!`): rejected. It repeats the gateway's check and hides the invariant in a non-null assertion, so a future change to the gateway would not surface as a type error.
- Always putting the whole `capabilities` object in the surface context: rejected. It brings back the nullable reads the gateway exists to remove; the context only carries the one capability the page declared.

## Consequences

- The ratings page executes no Komga scan at all: the surface renders `unavailable` before the loader runs, and the dead N×10 scan is gone.
- `src/lib/services/read-series.service.ts` takes a `RatingsCapability` instead of an `IMediaProvider`; its five-page × 200-item walk stays a product bound owned by the service and documented in the architecture notes.
- `SurfaceContext` / `SurfaceResult` / `SurfaceBoundary` gained a defaulted generic over `ProviderCapabilityKey | undefined`, so existing pages and terminals keep compiling unchanged (`capability?: undefined` on the default context).
- A future capability-gated page is type-driven: declare `requireCapability` and consume `context.capability`. There is no runtime guard to copy.
- The conditional field needs one `as unknown as SurfaceContext<C>` cast inside `surface-loader.ts`, because TypeScript cannot prove `ProviderCapabilities[C]` from the generic key. The runtime check stays the single source of truth; the cast only expresses it to the compiler.
- `provider.interface.ts` no longer exposes a collection method that only one feature uses, so a new backend cannot mistake the read-series listing for a required capability.

Refs: #169.
