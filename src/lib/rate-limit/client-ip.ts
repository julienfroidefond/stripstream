/**
 * Adresse du client pour les budgets de rate-limit par IP.
 *
 * Qui écrit `X-Forwarded-For` dépend du déploiement :
 * - un proxy qui *réécrit* l'en-tête n'y laisse qu'une adresse, la bonne ;
 * - un proxy qui *ajoute* l'adresse vue (nginx `$proxy_add_x_forwarded_for`,
 *   Traefik, Caddy) garde devant elle ce que le client a envoyé : le premier
 *   élément est alors choisi par l'attaquant.
 *
 * `TRUSTED_PROXY_HOPS=N` (N ≥ 1) déclare N proxys de confiance devant l'app :
 * l'adresse retenue est le N-ième élément en partant de la droite, celle
 * qu'a écrite le proxy de confiance le plus éloigné. `X-Real-IP` n'est alors
 * jamais lu : rien ne garantit qu'un proxy de confiance l'a écrit, et un
 * client pourrait le changer à chaque requête. Sans la variable, on garde le
 * premier élément (proxy qui réécrit), puis `X-Real-IP`, comme avant.
 * Sans adresse exploitable, on renvoie `null` et le budget par IP est ignoré
 * plutôt que de mettre tous les clients dans un même seau.
 */

/** Une adresse IPv4/IPv6 raisonnable ; tout le reste est ignoré. */
const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

interface HeaderReader {
  get(name: string): string | null;
}

/** Nombre de proxys de confiance déclarés, `null` si non configuré ou invalide. */
export function trustedProxyHops(value = process.env.TRUSTED_PROXY_HOPS): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const hops = Number(value.trim());
  return hops >= 1 ? hops : null;
}

function forwardedClient(header: string | null | undefined, hops: number | null): string | undefined {
  const entries = header
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries || entries.length === 0) return undefined;
  if (hops === null) return entries[0];
  // Moins d'entrées que de proxys déclarés : la requête n'est pas passée par
  // toute la chaîne attendue, on ne fait confiance à aucune.
  return entries.length >= hops ? entries[entries.length - hops] : undefined;
}

export function clientIpFromHeaders(
  headers: HeaderReader | null | undefined,
  hops: number | null = trustedProxyHops()
): string | null {
  if (!headers) return null;
  const forwarded = forwardedClient(headers.get("x-forwarded-for"), hops);
  const candidate = hops === null ? forwarded || headers.get("x-real-ip")?.trim() : forwarded;
  return candidate && IP_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}
