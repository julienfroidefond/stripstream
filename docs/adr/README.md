# Architecture Decision Records

Decisions that shaped the current architecture and would be expensive or surprising to reverse. Each record states the context, the decision and the reasons; optional sections only appear when the rejected alternatives or downstream effects are worth remembering.

| ADR | Decision |
| --- | --- |
| [0001](./0001-single-provider-transport.md) | Every provider request goes through one transport. |
| [0002](./0002-explicit-provider-capabilities.md) | Optional provider features are declared, not inferred. |
| [0003](./0003-provider-neutral-media-pipeline.md) | Media is addressed by a provider-neutral ref, not a URL. |
| [0004](./0004-one-connection-module.md) | One connection module owns provider selection. |
| [0005](./0005-page-surface-gateway.md) | Pages resolve through one surface gateway. |
| [0006](./0006-server-action-runner.md) | Server actions run through one runner and return `ActionResult`. |
| [0007](./0007-cache-vocabulary-and-invalidation-recipes.md) | Cache tags are a vocabulary, invalidation is a recipe. |
| [0008](./0008-favorites-store-seam.md) | Favorites have one store seam and side-effect-free reads. |
| [0009](./0009-series-identity-at-the-provider-seam.md) | Series identity is resolved at the provider seam. |
| [0010](./0010-pure-client-policies.md) | Client interaction policies are pure modules with thin adapters. |
| [0011](./0011-reader-image-lifetime.md) | Reader image lifetime is owned by the loader and a synchronous registry. |
| [0012](./0012-home-feed-registry.md) | Home feed rows are driven by one registry. |
| [0013](./0013-continue-reading-single-loader.md) | Continue-reading has one loader for both render paths. |
| [0014](./0014-error-catalog-completeness.md) | Error codes, technical messages and localized copy cannot drift apart. |
| [0015](./0015-preferences-descriptor.md) | User preferences are described once and derived everywhere. |
| [0016](./0016-collection-query-contract.md) | Collection pages parse their query through one contract. |
| [0017](./0017-carousel-gesture-machine.md) | Carousel gestures and index transitions are pure policies. |
| [0018](./0018-durable-rate-limit-store.md) | Rate-limit counters live in a shared store behind one seam. |
| [0019](./0019-capability-owns-its-data.md) | A required capability owns its data and is handed to the loader. |
| [0020](./0020-drop-dead-schema-columns.md) | Dead schema columns are dropped, not documented. |
| [0021](./0021-one-pagination-contract.md) | Paginated provider lists share one page-number contract. |
| [0022](./0022-reader-side-actions-policy.md) | Reader side actions and the prefetch plan are pure policies. |
| [0023](./0023-every-action-through-the-runner.md) | Every server action runs through the runner, admin authorization included. |
| [0024](./0024-read-progress-mutation-seam.md) | Read progress has one client mutation seam. |
| [0025](./0025-wall-camera-speaks-in-intentions.md) | The wall camera speaks in intentions, the pointer machine is pure. |
| [0026](./0026-home-feed-policy-in-registry.md) | The home feed policy is declared by the registry. |
| [0027](./0027-media-addressed-and-cached-by-kind.md) | Media is addressed and cached by kind. |
| [0028](./0028-one-cache-profile-producer.md) | Cache profiles are produced in one place. |
| [0029](./0029-services-receive-the-caller-identity.md) | Services receive the caller's identity instead of reading the session. |
| [0030](./0030-provider-registry-for-connections.md) | A provider registry owns what differs between connection types. |

New records use the next number and the same shape: a short title, one paragraph of context/decision/why, and optional `Considered options` / `Consequences` sections.
