/**
 * Chemin de retour sûr après connexion ou inscription (`?from=`).
 *
 * Le paramètre vient de l'URL, donc de n'importe qui : on le résout comme le
 * ferait le navigateur (`new URL(from, origin)`, qui normalise notamment `\`
 * en `/`) et on n'accepte que la même origine. Seuls le chemin, la query et le
 * fragment sont renvoyés ; tout le reste retombe sur `/`. Un chemin qui
 * commencerait par `//` serait relu comme une URL sans schéma vers un autre
 * hôte : il est refusé aussi.
 */
export function safeRedirectPath(from: string | null | undefined, origin: string): string {
  if (!from) return "/";

  let base: URL;
  let target: URL;
  try {
    base = new URL(origin);
    target = new URL(from, base);
  } catch {
    return "/";
  }

  if (target.origin !== base.origin) return "/";

  const path = `${target.pathname}${target.search}${target.hash}`;
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}
