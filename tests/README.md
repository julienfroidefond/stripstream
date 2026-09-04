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

The suite deliberately does not change passwords, users, provider connections,
favorites, or reading progress. Those operations need isolated seeded data and a
database reset hook before they can safely become parallel E2E tests.

To target a deployed environment explicitly, set `E2E_BASE_URL`. Tests never
register users or mutate library data:

```sh
E2E_BASE_URL=https://staging.example.test pnpm test:e2e
```
