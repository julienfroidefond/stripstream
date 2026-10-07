total tests:   61
passed:        59
failed:        0
flaky:         0
skipped:       2
runtime count: 59 (executed = total - skipped)

per-project counts (project "setup" excluded):
  mutating: total=34 passed=32 failed=0 flaky=0 skipped=2 runtime=32
  read-only: total=27 passed=27 failed=0 flaky=0 skipped=0 runtime=27

slowest 15 tests (summed results[].duration):
   1. 11512 ms — keeps reading statuses separate across two users and two connections [mutating]
   2. 7126 ms — blocks registration after too many attempts [mutating]
   3. 4022 ms — does not attribute anonymous reading progress to the current account [mutating]
   4. 2787 ms — opens thumbnails and reader information, then shows the end-of-book dialog [mutating]
   5. 2144 ms — loads pages, navigates, switches spread direction, and syncs progress [mutating]
   6. 2116 ms — shows continue reading and resumes the last viewed page [mutating]
   7. 2088 ms — signs out and protects the application again [read-only]
   8. 1928 ms — synchronizes search with the URL and can clear it [mutating]
   9. 1784 ms — marks a book read when reaching its last reader page [mutating]
  10. 1551 ms — change de connexion, affiche le fallback, puis les données de la nouvelle home [mutating]
  11. 1518 ms — switches to registration and validates matching passwords client-side [read-only]
  12. 1469 ms — rejects mismatching new passwords before contacting the server [read-only]
  13. 1361 ms — remembers the active tab after a reload [read-only]
  14. 1290 ms — creates, edits, and deletes a Komga connection [mutating]
  15. 1214 ms — rejects invalid credentials and stays on login [mutating]
