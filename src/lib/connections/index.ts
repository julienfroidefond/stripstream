/**
 * Seam unique vers une connexion provider.
 *
 * Les appelants ne choisissent pas entre plusieurs résolveurs : ils demandent
 * une connexion active ou une connexion propre à un provider, et le module
 * applique la même règle de fallback, déchiffre les credentials et invalide les
 * caches après mutation. Ce qui varie par provider vit dans le registre
 * (`registry.ts`, ADR 0030).
 */
export type {
  ConnectionDraft,
  ConnectionInput,
  ConnectionLists,
  ConnectionOf,
  ConnectionProvider,
  ConnectionRef,
  ConnectionSummaryBase,
  ConnectionSummaryOf,
  ConnectionTestRateLimit,
  ConnectionTestResult,
  ConnectionTestTarget,
  KomgaConnection,
  KomgaConnectionSummary,
  ResolvedConnection,
  StripstreamConnection,
  StripstreamConnectionSummary,
} from "./types";

export { getActiveConnection, setActiveConnection } from "./active";
export type { ActiveConnection } from "./active";

export {
  connectionFromDraft,
  getStoredConnection,
  requireConnectionForProvider,
  resolveActiveConnection,
  resolveConnectionForProvider,
} from "./resolve";

export {
  activateConnection,
  deleteConnection,
  listConnections,
  saveConnection,
} from "./manage";

export {
  CONNECTION_TEST_RATE_LIMIT,
  checkConnectionTestRateLimit,
  connectionTestRateLimitKey,
  testConnection,
  testStoredConnection,
} from "./probe";

export {
  PROVIDER_DEFINITIONS,
  definitionFor,
  getProviderDefinition,
  providerDefinitions,
} from "./registry";
export type { ConnectionStore, ProviderDefinition, StoredConnectionRow } from "./registry";
