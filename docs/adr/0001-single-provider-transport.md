---
status: accepted
date: 2026-11-12
---

# Every provider request goes through one transport

Both backends had their own fetch, auth, retry, cache and error handling, and media bytes had a third path. All provider traffic now goes through `ProviderTransport` (`src/lib/providers/provider-transport.ts`): `request<T>()` for JSON reads and mutations, `response()` for image and source streams. A provider only supplies a `ProviderTransportPolicy` (origin, path prefix, headers, HTTP-to-error codes, retry, cache key); adding a `fetch` to a provider or a media transport is a bug.

## Considered options

- Keep per-provider clients: rejected because retries, timeouts and error mapping drifted between providers and between JSON and media.
- Use raw `fetch` with shared helpers: rejected because cache options, timeout, 304 acceptance and empty-body handling are a lifecycle, not a helper.

## Consequences

- A new provider is a policy plus an adapter, not a new request implementation.
- Media transports inherit the same URL, auth, timeout and error policy.
- Provider quirks stay declarative in `komga.transport-policy.ts` and `stripstream.transport-policy.ts`.

Refs: #147, #148.
