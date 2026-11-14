# Architecture chantiers

Running list of the architectural deepenings we still owe this codebase. A chantier is one branch, one PR, one ADR: the code change and its record under [`adr/`](./adr/README.md) ship together (see `AGENTS.md`, *Commit & Pull Request Guidelines*).

Done work is not repeated here — the ADR index is the history of every decision already taken.

## Backlog

Opened by the architecture audit of 2026-11-13 (state of `main` at `a2e9fd1`). Chantiers A–K are delivered (see below); the backlog is empty.

## Picking the next one

Order by the number of call sites a wrong change would silently break, not by file size. A chantier is worth opening when the duplication already exists and a boundary test can prove the orchestration left its callers; if exploration shows the duplication is not real, close it and say so instead of inventing a seam.

## Delivered

| PR | Change | ADR |
| --- | --- | --- |
| — | K: sign-in and sign-up are throttled per client IP (`X-Forwarded-For` entry chosen by `TRUSTED_PROXY_HOPS`, behind the proxy); the per-email sign-in budget only counts failed passwords and is checked without being consumed. | [0032](./adr/0032-closed-by-default-auth-and-per-user-connections.md) |
| — | Sign-up closed by default, no environment connection, sessions revalidated against the database. | [0032](./adr/0032-closed-by-default-auth-and-per-user-connections.md) |
| #173 | Admin and account screens read every label from `admin.*` / `account.*` in both locales; dates follow the active language. | — |
| #172 | Komga's next book is cached like Stripstream's; reading stats declare a TTL. | [0028 amendment](./adr/0028-one-cache-profile-producer.md) |
| #172 | Media transports receive the caller identity from the route. | [0029 amendment](./adr/0029-services-receive-the-caller-identity.md) |
| #171 | A provider registry owns what differs between connection types. | [0030](./adr/0030-provider-registry-for-connections.md) |
| #171 | Services receive the caller's identity instead of reading the session. | [0029](./adr/0029-services-receive-the-caller-identity.md) |
| #171 | Cache profiles are produced in one place. | [0028](./adr/0028-one-cache-profile-producer.md) |
| #171 | Media is addressed and cached by kind. | [0027](./adr/0027-media-addressed-and-cached-by-kind.md) |
| #171 | The home feed policy is declared by the registry. | [0026](./adr/0026-home-feed-policy-in-registry.md) |
| #171 | The wall camera speaks in intentions, the pointer machine is pure. | [0025](./adr/0025-wall-camera-speaks-in-intentions.md) |
| #171 | Read progress has one client mutation seam. | [0024](./adr/0024-read-progress-mutation-seam.md) |
| #171 | Every server action runs through the runner, admin authorization included. | [0023](./adr/0023-every-action-through-the-runner.md) |
| #171 | Reader side actions and the prefetch plan are pure policies. | [0022](./adr/0022-reader-side-actions-policy.md) |
| #171 | Paginated provider lists share one page-number contract. | [0021](./adr/0021-one-pagination-contract.md) |
| #170 | Dead schema columns are dropped, not documented. | [0020](./adr/0020-drop-dead-schema-columns.md) |
| #169 | A required capability owns its data and is handed to the loader. | [0019](./adr/0019-capability-owns-its-data.md) |
| #167 | Rate-limit counters live in a shared SQLite store behind one seam. | [0018](./adr/0018-durable-rate-limit-store.md) |
| #162 | Preferences are described once and the service derives read/update/create from it. | [0015](./adr/0015-preferences-descriptor.md) |
| #163 | Collection pages parse their query through one contract. | [0016](./adr/0016-collection-query-contract.md) |
| #164 | Carousel gestures and index transitions are pure policies. | [0017](./adr/0017-carousel-gesture-machine.md) |
| #156 | Continue-reading has one loader for both render paths. | [0013](./adr/0013-continue-reading-single-loader.md) |
| #157 | The error catalog is total and typed. | [0014](./adr/0014-error-catalog-completeness.md) |
| #158 | Series identity is resolved at the provider seam. | [0009](./adr/0009-series-identity-at-the-provider-seam.md) |
