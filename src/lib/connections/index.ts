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
  ConnectionRef,
  ConnectionTestResult,
  ConnectionTestTarget,
  KomgaConnection,
  ResolvedConnection,
} from "./types";

export { getActiveConnection } from "./active";

export { connectionFromDraft, requireConnectionForProvider } from "./resolve";

export {
  activateConnection,
  deleteConnection,
  listConnections,
  saveConnection,
} from "./manage";

export {
  CONNECTION_TEST_RATE_LIMIT,
  connectionTestRateLimitKey,
  testConnection,
  testStoredConnection,
} from "./probe";
