# End-to-end tests

The suite is organized by user-facing area:

```text
tests/
├── public/        # authentication, access control, PWA, responsive, security
├── account/       # account, settings, session, administrator access
├── home/          # continue reading, favorites, and reading lists
├── library/       # navigation, libraries, favorites, lists, reading status
├── reader/        # reader controls and deterministic reader fixture
└── integrations/  # provider mutations and streaming connection changes
```

The default suite starts the local Next.js server and tests public authentication,
access control, API protection, and responsive behaviour:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Authenticated journeys use a local SQLite database and seeded accounts by
default. No production or shared-development credentials are required.

Set `E2E_USER_IS_ADMIN=true` when that account is expected to access the admin
dashboard. Without it, the suite verifies that `/admin` redirects the user away.

Authenticated tests discover real library, series, and book IDs from the UI. If
the seeded account has no matching data, only the data-dependent scenario is
skipped; authentication, account, settings, and authorization tests still run.

`global-setup` recreates the dedicated `e2e-stream@test.local` account before
each run in a temporary SQLite database. It is then safe to run the
mutable journeys that persist reader preferences and create, edit, then delete
a provider connection. The reader fixture also serves ten deterministic pages,
thumbnails, and in-memory read-progress mutations. You may set
`E2E_DATABASE_URL` to another local SQLite file when debugging, but never point
it at a shared development or production database.

Password changes remain intentionally out of the suite. Favorites, reading
lists, and reading progress are covered only through the isolated account and
deterministic provider fixtures described above.

To target a deployed environment explicitly, set `E2E_BASE_URL`. Tests never
register users or mutate library data:

```sh
E2E_BASE_URL=https://staging.example.test pnpm test:e2e
```
