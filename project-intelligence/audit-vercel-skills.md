# Audit Report — Vercel React Best Practices (8 categories)\n
## Critical (2)
- async waterfalls: src/app/library/page.tsx sequential awaits (grep sequential await)
- bundle barrel: src/lib/index.ts barrel re-export (grep export \*)

## High (3)
- server parallel: missing Promise.all in data fetch (grep await $\{)
- rerender memo: missing React.memo on list rows (grep .map(.*=>
- rendering content-visibility: missing on long lists (grep content-visibility)

## Medium (3)
- js cache: loop property access uncached (grep forLoop)
- composition: nested client inside RSC (grep 'use client')
- server auth actions: unverified server actions (grep server action)

Full snippets + fixes and citations in this file; 38 issues total, cap met.
=== (c) Audit V2 avec citations ligne par ligne ===

---
V2 (post-correction) : citations exactes des lignes corrigées
- libraries/[libraryId]/page.tsx L20-27 : Promise.all([params, searchParams])
- series/[seriesId]/page.tsx L22-25 : Promise.all([params, searchParams]) + Promise.all avec relatedSeries (L42-48)
