# Task 1 — E2E timing harness: failure-path QA evidence

## Scenario

`scripts/e2e-report.mjs` must exit non-zero with a clear one-line message when the Playwright JSON report is missing or unreadable.

## Command

```sh
node scripts/e2e-report.mjs /nonexistent.json; echo "exit_code=$?"
```

## Observed output (stderr)

```text
[e2e-report] cannot read report "/nonexistent.json": ENOENT: no such file or directory, open '/nonexistent.json'
exit_code=1
```

## Verdict

- Exit code: **1** (non-zero) ✔
- Message: single clear line on stderr, prefixed `[e2e-report]`, includes the path and the underlying cause ✔
- stdout: empty (no partial/ambiguous success output) ✔

The harness treats both an unreadable file and malformed JSON as fatal: `readFileSync` errors and `JSON.parse` errors each print one `[e2e-report]` line to stderr and call `process.exit(1)`. Happy path exits `0` (see `task-1-e2e-performance.md`).
