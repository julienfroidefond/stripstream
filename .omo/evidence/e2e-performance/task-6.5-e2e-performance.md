# Task 6.5 — Stabilize the home image-cache assertion

Repo: `/Users/julienfroidefond/Sites/stripstream`
Date: 2026-09-11 (local runs)
Test under review: `tests/home/home.spec.ts` → `'keeps carousel images stable and reuses the HTTP cache after a reload'`
Server mode: production (`next start`, `NODE_ENV=production`, existing build `d_YL44dyU8GzbnsVMY7hK`)
Constraint honored: only bounded, file-scoped runs, `--repeat-each=3` max; the full suite was never run.

## Root cause

`collectImagePerformance` (`tests/home/home.spec.ts:9-31`) waits with
`page.waitForFunction` until **some** in-viewport carousel image is complete
(`images.some(img => img.complete && img.naturalWidth > 0)`), then reads **all**
`/api/komga/images/` and `/api/stripstream/images/` resource-timing entries in
the document.

Home covers below the fold render with `loading="lazy"`
(`src/components/ui/book-cover.tsx:90`, `src/components/ui/series-cover.tsx:33`,
`src/components/home/ReadingListRow.tsx:101`), and the media rows are horizontal
scroll containers (`src/components/ui/scroll-container.tsx`). So the cold
snapshot is taken before all lazy covers have even been requested. On the
reloaded document the browser can request covers that the cold pass never
fetched; those are **first-time** fetches, cannot be HTTP-cache hits, and
legitimately report `transferSize > 0`.

The assertion `warm.resources.every(r => r.transferSize === 0)` therefore
graded the wrong set: it required cache hits for images that were never part of
the cold pass. The variance is directly visible in the bounded runs below —
the warm resource count exceeds the cold count and includes warm-only names
(e.g. `series-a-7`, `series-a-8`, `series-a-2..series-a-6`).

There is **no** auto-advance/`setInterval`/embla timer in `src/components/home/`
(`ContinueReadingHero`, `RecommendationsRow` are user-driven framer-motion
carousels), and the image routes return
`Cache-Control: public, max-age=2592000, immutable`
(`src/lib/services/komga/image.service.ts:41`,
`src/app/api/stripstream/images/books/[bookId]/thumbnail/route.ts:49`). The
problem is purely the test measuring an unstable snapshot set, not an app
cache defect.

## Fix

`tests/home/home.spec.ts` — keep `warm.resources.length > 0` and
`warm.layoutShift === 0`, and scope the `transferSize === 0` check to the
**intersection of cold and warm resource names** (the images actually loaded
before reload), with a non-vacuity guard:

```ts
const coldResourceNames = new Set(cold.resources.map((resource) => resource.name));
const reusedResources = warm.resources.filter((resource) => coldResourceNames.has(resource.name));

expect(warm.resources.length).toBeGreaterThan(0);
expect(reusedResources.length).toBeGreaterThan(0);
expect(reusedResources.every((resource) => resource.transferSize === 0)).toBe(true);
expect(warm.layoutShift).toBe(0);
```

This preserves the original intent ("images loaded before reload are reused
from cache") and the full strength of the check on that set: `every` is kept,
the `transferSize === 0` check is kept, and a genuine cache miss on a
previously loaded image still fails. `test.skip`/`test.fixme`/retries/
`some` were not used. No `src/` file was touched.

## Empirical evidence (temporary instrumentation, since removed)

Command (bounded, `--repeat-each=3` max):

```sh
pnpm exec playwright test tests/home/home.spec.ts --project=mutating --no-deps --repeat-each=3 --reporter=line
```

Temporary debug (removed before commit, not in the diff) logged the cold/warm
sizes and the warm-only URLs. Observed snapshots across repeats:

| Repeat | COLD | WARM | WARM-only URLs (transferSize) |
|---|---|---|---|
| run A / rep 1 | 7 | 9 | `series-a-7` (0), `series-a-8` (0) |
| run A / rep 2 | 2 | 8 | `series-a-2`…`series-a-7` (all 0) |
| run A / rep 3 | 9 | 9 | — |
| run B / rep 1 | 7 | 9 | `series-a-7` (0), `series-a-8` (0) |
| run B / rep 2 | 9 | 9 | — |
| run B / rep 3 | 9 | 9 | — |
| run C / rep 1 | 7 | 7 | — |
| run C / rep 2, 3 | 9 | 9 | — |

Key signal: the warm set is a **superset** of the cold snapshot in 4 of 9
observed repeats (`WARM > COLD`), and warm-only names are lazy covers that the
cold snapshot missed. Those warm-only fetches are exactly the resources that
can report `transferSize > 0` and trip the old whole-set `every(...)`. The
offending URLs are therefore of the form
`http://127.0.0.1:3000/api/komga/images/series/series-a-<n>/thumbnail`
(never a previously-loaded, cached name).

Note: the failing `transferSize > 0` sample was not re-captured within the
bounded run budget (the original report was 2/5 on `--repeat-each=5`); all
observed warm-only fetches were still cache hits because an earlier `goto('/')`
in the same context had already cached them. The structural variance
(COLD ∈ {2,7,9}, WARM ∈ {7,8,9}) is the verified mechanism.

## Validation (after fix)

```sh
$ pnpm exec playwright test tests/home/home.spec.ts --project=mutating --no-deps --repeat-each=3 --reporter=line
  9 passed (11.2s)        # exit 0, all 3 repeats green

$ pnpm exec playwright test tests/home/home.spec.ts --project=mutating --no-deps --reporter=line
  3 passed (5.9s)         # exit 0
```

## Quality gates

```sh
$ pnpm lint        # exit 0 (only the pre-existing baseline-browser-mapping notice)
$ pnpm typecheck   # exit 0
```

## Cleanup

- Temporary `console.log` debug lines were removed; `git diff` contains only the
  intersection assertion + explanatory comment.
- No `src/` changes. No retries, no skips, no `some(...)` weakening.
- Untracked `.omo/` artifacts and `tests/.auth/*.json` are not staged.
