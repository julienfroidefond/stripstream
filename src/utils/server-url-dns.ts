import { lookup } from "node:dns/promises";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { isBlockedHostname } from "@/utils/server-url";

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

/** @throws {AppError} `CONFIG_INVALID_URL` si le nom résout vers une adresse interdite. */
export async function assertServerUrlResolvesSafely(
  url: string,
  resolve: ResolveAddresses = resolveWithDns
): Promise<void> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }

  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch {
    return;
  }

  if (addresses.some((address) => isBlockedHostname(address))) {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }
}
