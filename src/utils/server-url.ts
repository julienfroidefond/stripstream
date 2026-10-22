import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

/**
 * Garde-fous pour les URLs de serveurs configurées par l'utilisateur.
 *
 * StripStream est auto-hébergé : l'URL pointe forcément vers un serveur
 * personnel (localhost, LAN, reverse proxy). On ne peut donc pas restreindre
 * les hôtes à une liste fermée sous peine de casser l'usage principal. On
 * verrouille en revanche ce qui n'a aucune raison d'être un serveur Komga ou
 * Stripstream : protocoles exotiques, credentials embarqués et endpoints de
 * métadonnées cloud (SSRF vers 169.254.169.254 & co).
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Hôtes de métadonnées cloud, jamais légitimes pour un provider média. */
const BLOCKED_HOSTNAMES = new Set([
  "instance-data",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
]);

/** IPv4 de métadonnées hors plage link-local. */
const BLOCKED_IPV4 = new Set(["100.100.100.200"]);

function isBlockedHostname(rawHostname: string): boolean {
  const hostname = rawHostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_IPV4.has(hostname)) return true;

  // 169.254.0.0/16 : link-local, dont l'endpoint de métadonnées 169.254.169.254.
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;

  // Même plage en IPv4-mapped IPv6, normalisée en hexa par le parseur URL.
  if (hostname.startsWith("::ffff:a9fe:")) return true;
  if (hostname === "::ffff:6464:64c8") return true;

  // Endpoint de métadonnées IPv6 d'AWS.
  if (hostname === "fd00:ec2::254") return true;

  return false;
}

/**
 * Valide et normalise une URL de serveur provider.
 *
 * @throws {AppError} `CONFIG_INVALID_URL` si l'URL est inutilisable.
 */
export function normalizeServerUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }
  if (url.username || url.password) {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }
  if (url.search || url.hash || !url.hostname) {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }
  if (isBlockedHostname(url.hostname)) {
    throw new AppError(ERROR_CODES.CONFIG.INVALID_URL);
  }

  // Un préfixe de reverse proxy (https://host/komga) reste autorisé ; on
  // supprime seulement les slashs finaux pour un stockage déterministe.
  return url.toString().replace(/\/+$/, "");
}
