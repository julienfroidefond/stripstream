# Architecture chantiers

Running list of the architectural deepenings we still owe this codebase. A chantier is one branch, one PR, one ADR: the code change and its record under [`adr/`](./adr/README.md) ship together (see `AGENTS.md`, *Commit & Pull Request Guidelines*).

Done work is not repeated here — the ADR index is the history of every decision already taken.

## Backlog

Nothing open right now. The recent chantiers — preferences descriptor, collection query contract, carousel gesture machine, durable rate-limit store, the capability handoff and the dead-column cleanup — shipped in #162–#164 and #167–#170, and are recorded in the *Delivered* table below.

## Picking the next one

Order by the number of call sites a wrong change would silently break, not by file size. A chantier is worth opening when the duplication already exists and a boundary test can prove the orchestration left its callers; if exploration shows the duplication is not real, close it and say so instead of inventing a seam.

## Delivered

| PR | Change | ADR |
| --- | --- | --- |
| #170 | Dead schema columns are dropped, not documented. | [0020](./adr/0020-drop-dead-schema-columns.md) |
| #169 | A required capability owns its data and is handed to the loader. | [0019](./adr/0019-capability-owns-its-data.md) |
| #167 | Rate-limit counters live in a shared SQLite store behind one seam. | [0018](./adr/0018-durable-rate-limit-store.md) |
| #162 | Preferences are described once and the service derives read/update/create from it. | [0015](./adr/0015-preferences-descriptor.md) |
| #163 | Collection pages parse their query through one contract. | [0016](./adr/0016-collection-query-contract.md) |
| #164 | Carousel gestures and index transitions are pure policies. | [0017](./adr/0017-carousel-gesture-machine.md) |
| #156 | Continue-reading has one loader for both render paths. | [0013](./adr/0013-continue-reading-single-loader.md) |
| #157 | The error catalog is total and typed. | [0014](./adr/0014-error-catalog-completeness.md) |
| #158 | Series identity is resolved at the provider seam. | [0009](./adr/0009-series-identity-at-the-provider-seam.md) |
