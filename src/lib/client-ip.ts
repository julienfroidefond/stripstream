/**
 * Adresse du client pour les budgets de rate-limit par IP.
 *
 * Hypothèse de déploiement : l'app tourne derrière un reverse proxy qui
 * réécrit `X-Forwarded-For` (le premier élément est alors l'adresse vue par le
 * proxy). Sans proxy, l'en-tête est contrôlé par le client et le budget par IP
 * devient contournable : le budget par compte (échecs de mot de passe) reste
 * la protection de fond. Sans adresse exploitable, on renvoie `null` et le
 * budget par IP est ignoré plutôt que de mettre tous les clients dans un même
 * seau (ce qui permettrait de bloquer toutes les connexions).
 */

/** Une adresse IPv4/IPv6 raisonnable ; tout le reste est ignoré. */
const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

interface HeaderReader {
  get(name: string): string | null;
}

export function clientIpFromHeaders(headers: HeaderReader | null | undefined): string | null {
  if (!headers) return null;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || headers.get("x-real-ip")?.trim();
  return candidate && IP_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}
