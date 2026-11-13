/**
 * Abandonne les fetches suivis sans laisser une exception interrompre le
 * nettoyage.
 *
 * `AbortController.abort()` déclenche les listeners `abort` de façon
 * synchrone : si l'un d'eux lève, la boucle s'arrête avant les `clear()` et
 * les maps de suivi gardent des entrées fantômes (pages considérées en cours,
 * mémoire qui grimpe). Le helper isole chaque abandon et renvoie les erreurs
 * pour que l'appelant les journalise — il ne décide pas à leur place.
 */
export function abortTrackedFetches(
  controllers: Iterable<AbortController>
): unknown[] {
  const failures: unknown[] = [];

  for (const controller of controllers) {
    try {
      controller.abort();
    } catch (error) {
      failures.push(error);
    }
  }

  return failures;
}
