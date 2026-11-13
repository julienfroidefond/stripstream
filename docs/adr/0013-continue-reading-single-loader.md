---
status: accepted
date: 2026-11-13
---

# Continue-reading has one loader for both render paths

The hero's initial render and its "load more" action rebuilt the same orchestration — probe limit, merge of on-deck and ongoing books, slice, series resolution and entry building — with different limits and different series pools, so a book could show different metadata depending on which path rendered it. `loadContinueReadingPage` (`src/lib/home/continue-reading-feed.ts`) now owns that orchestration. The initial render passes the already-loaded ongoing pool as a value or a promise, so its two provider requests still run in parallel; the action passes nothing and the module seeds the pool from the first ongoing page, so both paths see the same series metadata. `probeLimit` is the shared probe rule, and a boundary test keeps the orchestration out of both callers.

## Considered options

- Keep two orchestrations: rejected because pagination limits and series metadata could diverge.
- Always load the pool inside the module: rejected because the initial render already has it and would pay for a duplicate request.

## Consequences

- The initial render may pass a promise; the module awaits it before resolving series.
- The action path costs one extra ongoing page to seed the pool.
- Neither caller computes the probe limit, merge, slice or entries.

Refs: #156.
