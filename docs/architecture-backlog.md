# Architecture chantiers

Running list of the architectural deepenings we still owe this codebase. A chantier is one branch, one PR, one ADR: the code change and its record under [`adr/`](./adr/README.md) ship together (see `AGENTS.md`, *Commit & Pull Request Guidelines*).

Done work is not repeated here — the ADR index is the history of every decision already taken.

## Backlog

| Chantier | Problem it removes | Target shape |
| --- | --- | --- |
| Preferences descriptor | `UserPreferences` is enumerated three times in `preferences.service.ts` (read, `update`, `create`) and again in the defaults, so adding a preference means touching three places and a miss fails silently. | One declarative descriptor per preference (key, default, normalizer, Prisma projection); the service derives read/update/create from it. |
| Collection query contract | Series collection requests (page, size, sort, filters) are rebuilt by each surface — pages, services, provider calls — with defaults and bounds that can drift. | One `SeriesQuery` type plus a `searchParams` parser and provider-page builder shared by every collection surface. |
| Carousel gesture machine | The gesture policy of `SpotlightCarousel` (threshold, direction, snap, edges, reduced motion, settle on newly loaded slides) lives in refs, effects and DOM handlers, untestable outside a browser. | A pure reducer owns index, drag offset and settle decisions; the component becomes a thin adapter. |

## Picking the next one

Order by the number of call sites a wrong change would silently break, not by file size. A chantier is worth opening when the duplication already exists and a boundary test can prove the orchestration left its callers; if exploration shows the duplication is not real, close it and say so instead of inventing a seam.

## Delivered

| PR | Change | ADR |
| --- | --- | --- |
| #156 | Continue-reading has one loader for both render paths. | [0013](./adr/0013-continue-reading-single-loader.md) |
| #157 | The error catalog is total and typed. | [0014](./adr/0014-error-catalog-completeness.md) |
| #158 | Series identity is resolved at the provider seam. | [0009](./adr/0009-series-identity-at-the-provider-seam.md) |
