/**
 * Clavier du curseur de notation (échelle 1-10, demi-étoiles).
 *
 * Flèches droite/haut : +½ étoile, gauche/bas : −½ étoile, Page haut/bas :
 * ±1 étoile, Début : ½ étoile, Fin : note maximale. La note ne descend pas
 * sous ½ étoile au clavier : effacer passe par le bouton dédié. Renvoie `null`
 * pour une touche qui ne concerne pas le curseur (elle n'est alors pas
 * interceptée), et la note courante quand elle est déjà en butée.
 */
export function nextRatingForKey(
  key: string,
  current: number | null,
  max: number
): number | null {
  const value = current ?? 0;
  const clamp = (next: number) => Math.min(max, Math.max(1, next));

  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clamp(value + 1);
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(value - 1);
    case "PageUp":
      return clamp(value + 2);
    case "PageDown":
      return clamp(value - 2);
    case "Home":
      return 1;
    case "End":
      return max;
    default:
      return null;
  }
}
