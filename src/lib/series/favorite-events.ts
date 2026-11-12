import type { NormalizedSeries } from "@/lib/providers/types";

const FAVORITES_CHANGED_EVENT = "favoritesChanged";

export interface FavoriteChangeDetail {
  seriesId: string;
  action: "add" | "remove";
  series?: NormalizedSeries;
}

/**
 * S'abonne aux changements de favoris sans exposer l'événement DOM aux
 * surfaces. La sidebar est la seule consommatrice de cette notification.
 */
export function subscribeToFavoriteChanges(
  listener: (detail: FavoriteChangeDetail) => void
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FavoriteChangeDetail>).detail;
    if (
      detail &&
      typeof detail.seriesId === "string" &&
      (detail.action === "add" || detail.action === "remove")
    ) {
      listener(detail);
    }
  };

  window.addEventListener(FAVORITES_CHANGED_EVENT, handler);
  return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handler);
}

/** Émet le delta favori ; réservé au module de mutation. */
export function emitFavoriteChange(detail: FavoriteChangeDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<FavoriteChangeDetail>(FAVORITES_CHANGED_EVENT, { detail })
  );
}
