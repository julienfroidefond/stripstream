import { lookup } from "node:dns/promises";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { isBlockedHostname } from "@/lib/connections/server-url";

/**
 * Vérification serveur de l'adresse résolue d'une URL provider.
 *
 * `normalizeServerUrl` ne voit que le nom saisi : `metadata.example.com`
 * pointant vers `169.254.169.254` passerait. À l'enregistrement et au test
 * d'une connexion, on résout donc le nom et on refuse si une des adresses
 * tombe dans les plages interdites (les mêmes que pour le nom). Localhost et
 * le LAN restent autorisés, comme pour le nom : c'est le déploiement normal
 * (et les stubs E2E sur 127.0.0.1).
 *
 * Un nom qui ne se résout pas n'est pas refusé ici : la connexion échouera
 * d'elle-même au test, et aucune requête ne peut partir vers une adresse
 * inexistante. Le transport ne suit jamais de redirection (`redirect:
 * "manual"`), donc la cible validée reste la seule contactée.
 */

export type ResolveAddresses = (hostname: string) => Promise<string[]>;

const resolveWithDns: ResolveAddresses = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }
}

function assertAddressesAllowed(addresses: string[]): void {
  if (addresses.some((address) => isBlockedHostname(address))) {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }
}

/** @throws {AppError} `CONFIG_INVALID_URL` si le nom résout vers une adresse interdite. */
export async function assertServerUrlResolvesSafely(
  url: string,
  resolve: ResolveAddresses = resolveWithDns
): Promise<void> {
  const hostname = hostnameOf(url);

  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch {
    // À l'enregistrement, un nom pas encore résolu reste accepté : la garde
    // par requête (`assertProviderTargetIsSafe`) refuse d'y envoyer quoi que
    // ce soit tant qu'il ne résout pas vers une adresse autorisée.
    return;
  }

  assertAddressesAllowed(addresses);
}

/** Durée pendant laquelle un nom déjà vérifié n'est pas re-résolu (ms). */
const SAFE_TARGET_TTL_MS = 60_000;
const verifiedTargets = new Map<string, number>();
const pendingChecks = new Map<string, Promise<void>>();

/** Erreur réseau levée quand l'hôte d'une requête provider ne se résout pas. */
export class UnresolvedProviderHostError extends Error {
  readonly code = "ENOTFOUND";

  constructor(hostname: string, options?: { cause?: unknown }) {
    super(`Provider host ${hostname} did not resolve`, options);
    this.name = "UnresolvedProviderHostError";
  }
}

/**
 * Garde de chaque requête provider (pas seulement de l'enregistrement) : un
 * nom validé à la sauvegarde peut ensuite être re-pointé vers une adresse
 * interne (DNS rebinding). On re-résout au plus toutes les 60 s par nom.
 *
 * - Seule une résolution réussie et autorisée est mise en cache ; un échec de
 *   résolution refuse la requête (sinon un SERVFAIL ouvrirait 60 s sans garde).
 * - Les requêtes concurrentes d'un même nom partagent une seule résolution.
 *
 * Limite assumée : `fetch` refait sa propre résolution juste après ; un DNS
 * hostile qui alterne ses réponses à la milliseconde garde une fenêtre. La
 * fermer demanderait un dispatcher undici à résolution épinglée, compatible
 * avec la version d'undici embarquée par Node.
 *
 * @throws {AppError} `CONFIG_INVALID_URL` pour une adresse interdite.
 * @throws {UnresolvedProviderHostError} si le nom ne se résout pas.
 */
export async function assertProviderTargetIsSafe(
  url: string,
  resolve: ResolveAddresses = resolveWithDns,
  now: number = Date.now()
): Promise<void> {
  const hostname = hostnameOf(url);
  const verifiedUntil = verifiedTargets.get(hostname);
  if (verifiedUntil !== undefined && verifiedUntil > now) return;

  const inFlight = pendingChecks.get(hostname);
  if (inFlight) return inFlight;

  const check = (async () => {
    let addresses: string[];
    try {
      addresses = await resolve(hostname);
    } catch (error) {
      throw new UnresolvedProviderHostError(hostname, { cause: error });
    }
    assertAddressesAllowed(addresses);
    verifiedTargets.set(hostname, now + SAFE_TARGET_TTL_MS);
  })();
  pendingChecks.set(hostname, check);
  try {
    await check;
  } finally {
    pendingChecks.delete(hostname);
  }
}

/** Tests uniquement : oublie les noms déjà vérifiés. */
export function resetVerifiedProviderTargets(): void {
  verifiedTargets.clear();
  pendingChecks.clear();
}
