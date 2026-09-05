# End-to-end tests

The default suite starts the local Next.js server and tests public authentication,
access control, API protection, and responsive behaviour:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Authenticated, read-only journeys are enabled when a dedicated seeded account is
provided. The account should have a provider and at least one populated library:

```sh
E2E_USER_EMAIL=e2e@example.test E2E_USER_PASSWORD='...' pnpm test:e2e
```

Set `E2E_USER_IS_ADMIN=true` when that account is expected to access the admin
dashboard. Without it, the suite verifies that `/admin` redirects the user away.

Authenticated tests discover real library, series, and book IDs from the UI. If
the seeded account has no matching data, only the data-dependent scenario is
skipped; authentication, account, settings, and authorization tests still run.

When `E2E_DATABASE_URL` is set, `global-setup` recreates the dedicated
`e2e-stream@test.local` account before the run. It is then safe to run the
mutable journeys that persist reader preferences and create, edit, then delete
a provider connection. The reader fixture also serves ten deterministic pages,
thumbnails, and in-memory read-progress mutations. Never point this variable at
a shared development or production database.

Password changes remain intentionally out of the suite. Favorites, reading
lists, and reading progress are covered only through the isolated account and
deterministic provider fixtures described above.

To target a deployed environment explicitly, set `E2E_BASE_URL`. Tests never
register users or mutate library data:

```sh
E2E_BASE_URL=https://staging.example.test pnpm test:e2e
```
