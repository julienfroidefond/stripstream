import { AppError } from "@/utils/errors";
import type { ProviderType } from "@/lib/providers/types";
import { getActiveConnection } from "./active";
import { definitionFor, getProviderDefinition } from "./registry";
import type { ConnectionDraft, ConnectionOf, ResolvedConnection } from "./types";

/**
 * Règle de fallback unique : la config demandée si elle appartient au user,
 * sinon la première config de ce provider, puis la connexion d'environnement
 * que la définition déclare (Stripstream : `STRIPSTREAM_URL`/`STRIPSTREAM_TOKEN`,
 * Komga : aucune).
 */
async function resolveForProvider<P extends ProviderType>(
  provider: P,
  userId: number,
  preferredId: number | null
): Promise<ConnectionOf<P> | null> {
  const definition = getProviderDefinition(provider);
  const row =
    (preferredId !== null ? await definition.store.findOwned(userId, preferredId) : null) ??
    (await definition.store.findFirst(userId));

  return row ? definition.toConnection(row) : definition.environmentConnection();
}

/** Connexion sélectionnée par le navigateur, avec la même règle de fallback. */
export async function resolveActiveConnection(userId: number): Promise<ResolvedConnection | null> {
  const active = await getActiveConnection(userId);
  return resolveForProvider(active.provider, userId, active.configId);
}

/**
 * Connexion d'un provider précis. Si la sélection active porte sur un autre
 * provider, on retombe sur la première config de celui demandé.
 */
export async function resolveConnectionForProvider<P extends ProviderType>(
  provider: P,
  userId: number
): Promise<ConnectionOf<P> | null> {
  const active = await getActiveConnection(userId);
  return resolveForProvider(
    provider,
    userId,
    active.provider === provider ? active.configId : null
  );
}

/**
 * Connexion enregistrée précise, sans fallback ni variables d'environnement.
 * Sert aux actions « tester cette config » : on ne veut pas tester une autre
 * connexion à la place de celle demandée.
 */
export async function getStoredConnection<P extends ProviderType>(
  provider: P,
  id: number,
  userId: number
): Promise<ConnectionOf<P> | null> {
  const definition = getProviderDefinition(provider);
  const row = await definition.store.findOwned(userId, id);
  return row ? definition.toConnection(row) : null;
}

/**
 * Connexion du provider pour un utilisateur déjà authentifié, réservée aux
 * transports média : la route média résout la session et transmet `userId`
 * (ADR 0029). L'absence de connexion lève le code « config manquante » de la
 * définition.
 */
export async function requireConnectionForProvider<P extends ProviderType>(
  provider: P,
  userId: number
): Promise<ConnectionOf<P>> {
  const connection = await resolveConnectionForProvider(provider, userId);
  if (!connection) {
    throw new AppError(getProviderDefinition(provider).missingConfigCode);
  }
  return connection;
}

/** Connexion ad hoc pour tester des credentials pas encore enregistrés. */
export function connectionFromDraft(draft: ConnectionDraft): ResolvedConnection {
  return definitionFor(draft).draftConnection(draft);
}
