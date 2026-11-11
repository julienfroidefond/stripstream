/**
 * Seam unique vers une connexion provider.
 *
 * Les appelants ne choisissent pas entre plusieurs résolveurs : ils demandent
 * une connexion active ou une connexion propre à un provider, et le module
 * applique la même règle de fallback, déchiffre les credentials et invalide les
 * caches après mutation.
 */
export type {
  ConnectionLists,
  ConnectionProvider,
  ConnectionSummaryBase,
  ConnectionTestRateLimit,
  ConnectionTestResult,
  KomgaConnection,
  KomgaConnectionSummary,
  ResolvedConnection,
  SaveConnectionInput,
  StripstreamConnection,
  StripstreamConnectionSummary,
} from "./types";

export { getActiveConnection, setActiveConnection } from "./active";
export type { ActiveConnection } from "./active";

export {
  connectionFromKomgaCredentials,
  connectionFromStripstreamToken,
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
  checkConnectionTestRateLimit,
  testConnection,
  testStoredConnection,
} from "./probe";
