import { invalidateConnectionChange } from "@/lib/cache/invalidation";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";
import { AppError } from "@/utils/errors";
import { normalizeServerUrl } from "@/lib/connections/server-url";
import { assertServerUrlResolvesSafely } from "@/lib/connections/server-url-dns";
import { getActiveConnection, setActiveConnection } from "./active";
import { validateConnectionInput } from "./descriptors";
import { definitionFor, getProviderDefinition, providerDefinitions } from "./registry";
import type { ConnectionInput, ConnectionLists } from "./types";

/**
 * Lecture de toutes les listes en un appel. L'état actif vient de la sélection
 * navigateur ; aucune colonne serveur ne porte plus cette information.
 */
export async function listConnections(userId: number): Promise<ConnectionLists> {
  const definitions = providerDefinitions();
  const [activeConnection, ...rows] = await Promise.all([
    getActiveConnection(userId),
    ...definitions.map((definition) => definition.store.list(userId)),
  ] as const);

  const entries = definitions.map((definition, index) => [
    definition.provider,
    rows[index].map((config) => ({
      ...config,
      isActive:
        activeConnection.provider === definition.provider &&
        activeConnection.configId === config.id,
    })),
  ]);
  // Une entrée par définition, dans l'ordre du registre exhaustif : l'objet a
  // la forme de `ConnectionLists`, ce que `Object.fromEntries` ne sait pas typer.
  return Object.fromEntries(entries) as ConnectionLists;
}

/**
 * Crée ou met à jour une config. Le secret est toujours chiffré par la
 * définition du provider : aucun appelant ne manipule la colonne en clair.
 *
 * - Sans `id` : création. Une config absente de cookie reste utilisable via le
 *   fallback « première config » de `resolve`.
 * - Avec `id` : mise à jour. Un secret vide conserve la valeur existante tant
 *   que l'URL (et pour Komga l'identifiant) ne change pas ; sinon le secret
 *   doit être ressaisi (`CONFIG_SECRET_REQUIRED`).
 *
 * La saisie est validée et normalisée par le descripteur du provider
 * (`CONFIG_INVALID_INPUT`), puis l'URL par `normalizeServerUrl` et son
 * adresse résolue par `assertServerUrlResolvesSafely` (`CONFIG_INVALID_URL`).
 * Retourne `null` si la config à mettre à jour n'appartient pas au user.
 */
export async function saveConnection(
  input: ConnectionInput,
  userId: number
): Promise<{ id: number } | null> {
  const validation = validateConnectionInput(input);
  if (!validation.ok) throw new AppError(validation.code);
  const normalized = { ...validation.value, url: normalizeServerUrl(validation.value.url) };
  await assertServerUrlResolvesSafely(normalized.url);
  const definition = definitionFor(normalized);

  if (normalized.id) {
    const existing = await definition.store.findOwned(userId, normalized.id);
    if (!existing) return null;

    const secret = definition.encodeSecret(normalized, existing);
    if (!secret) throw new AppError(ERROR_CODES.CONFIG.SECRET_REQUIRED);
    await definition.store.update(normalized.id, normalized, secret);
    invalidateConnectionChange();
    return { id: normalized.id };
  }

  const secret = definition.encodeSecret(normalized, null);
  if (!secret) throw new AppError(ERROR_CODES.CONFIG.INVALID_INPUT);
  const created = await definition.store.create(userId, normalized, secret);
  invalidateConnectionChange();
  return { id: created.id };
}

/** Supprime une config possédée par le user. Retourne `false` si elle n'existe pas. */
export async function deleteConnection(
  provider: ProviderType,
  id: number,
  userId: number
): Promise<boolean> {
  const { store } = getProviderDefinition(provider);
  const config = await store.findLabel(userId, id);
  if (!config) return false;

  await store.remove(id);
  invalidateConnectionChange();
  return true;
}

/**
 * Sélectionne une config et expire les données dérivées de l'ancienne. Les
 * cookies restent la source de sélection ; la DB ne fournit que les détails.
 */
export async function activateConnection(
  provider: ProviderType,
  id: number,
  userId: number
): Promise<{ id: number; name: string } | null> {
  const config = await getProviderDefinition(provider).store.findLabel(userId, id);
  if (!config) return null;

  await setActiveConnection(provider, id);
  invalidateConnectionChange();
  return config;
}
