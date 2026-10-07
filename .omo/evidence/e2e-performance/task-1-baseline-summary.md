# E2E baseline summary — pre-change (task 1)

Pinned definitions (later tasks depend on these exact definitions):
- `total` = all tests with `projectName != 'setup'`
- `runtime count` = tests with `projectName != 'setup'` whose status is not `'skipped'` (executed = total - skipped)
- `skipped count` = tests with `projectName != 'setup'` and status == `'skipped'`
- `flaky` counts as executed (not skipped)

Pinned numbers: **total = 61**, **runtime count = 59**, **skipped count = 2**, **wall-clock real = 155.40 s**.
Sources: `task-1-baseline.json` (counts) + `task-1-baseline.log` (wall-clock). Harness: `scripts/e2e-report.mjs`.

```text
total tests:   61
passed:        59
failed:        0
flaky:         0
skipped:       2
runtime count: 59 (executed = total - skipped)

per-project counts (project "setup" excluded):
  chromium: total=61 passed=59 failed=0 flaky=0 skipped=2 runtime=59

slowest 15 tests (summed results[].duration):
   1. 12474 ms — keeps reading statuses separate across two users and two connections [chromium]
   2. 11598 ms — blocks registration after too many attempts [chromium]
   3. 6845 ms — does not attribute anonymous reading progress to the current account [chromium]
   4. 4664 ms — loads pages, navigates, switches spread direction, and syncs progress [chromium]
   5. 4150 ms — opens thumbnails and reader information, then shows the end-of-book dialog [chromium]
   6. 4118 ms — shows continue reading and resumes the last viewed page [chromium]
   7. 3949 ms — marks a book read when reaching its last reader page [chromium]
   8. 3705 ms — marks a book read and unread from the series card [chromium]
   9. 3673 ms — sets, persists, then clears a series rating on the Stripstream connection [chromium]
  10. 3657 ms — synchronizes search with the URL and can clear it [chromium]
  11. 3497 ms — shows reading lists on the home page and opens one [chromium]
  12. 3314 ms — toggles unread and missing filters through the URL [chromium]
  13. 3199 ms — creates, edits, and deletes a Komga connection [chromium]
  14. 3188 ms — opens a real series and book when the provider has content [chromium]
  15. 3158 ms — cycles three sort states including community_score on Stripstream [chromium]

wall-clock: real 155.40
```
