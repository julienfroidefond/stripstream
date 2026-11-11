import { revalidatePath, updateTag } from "next/cache";
import { cacheTags } from "@/constants/cacheConstants";

/**
 * Recettes d'invalidation : une mutation déclare *ce qu'elle a changé*, pas la
 * liste des tags et chemins qui en dépendent. Chaque recette est le seul
 * endroit qui connaît cette correspondance, ce qui évite les listes recopiées
 * dans chaque action et les tags qu'on invalide sans producteur.
 *
 * `updateTag` est réservé aux Server Actions / Route Handlers : ce module ne
 * doit être importé que depuis ces contextes.
 */

/** Progression de lecture d'un livre, ou de toute une série. */
export function invalidateReadProgress(seriesId?: string | null): void {
  updateTag(cacheTags.home);
  updateTag(cacheTags.allLibrarySeries);
  updateTag(cacheTags.ratingsList);
  updateTag(cacheTags.stats);
  updateTag(seriesId ? cacheTags.seriesBooks(seriesId) : cacheTags.allSeriesBooks);
}

/**
 * Note d'une série. Ciblage granulaire : seul le tag per-id est invalidé, pas
 * le tag global, plus la liste des séries lues de la page « Mes notes ».
 */
export function invalidateSeriesRating(seriesId: string): void {
  updateTag(cacheTags.seriesRating(seriesId));
  updateTag(cacheTags.ratingsList);
}

/** Mise de côté / reprise d'une série. */
export function invalidateSeriesShelf(seriesId: string, libraryId?: string): void {
  updateTag(cacheTags.home);
  updateTag(cacheTags.seriesShelf(seriesId));
  if (libraryId) updateTag(cacheTags.librarySeries(libraryId));
  else updateTag(cacheTags.allLibrarySeries);

  revalidatePath("/");
  revalidatePath("/in-progress");
  revalidatePath(`/series/${seriesId}`);
  if (libraryId) revalidatePath(`/libraries/${libraryId}`);
}

/** Favoris : la home affiche la liste, donc elle dépend aussi de la mutation. */
export function invalidateFavorites(): void {
  updateTag(cacheTags.favorites);
  updateTag(cacheTags.home);
}

/** Création, mise à jour, suppression ou activation d'une connexion. */
export function invalidateConnectionChange(): void {
  updateTag(cacheTags.home);
  updateTag(cacheTags.allLibrarySeries);
  updateTag(cacheTags.allSeriesBooks);
  updateTag(cacheTags.favorites);

  revalidatePath("/settings");
  revalidatePath("/");
}

export type RefreshScope = "home" | "library" | "series" | "book";

/**
 * Rafraîchissement manuel demandé par le client. On ne touche que le scope
 * demandé ; le livre n'a pas de tag (lecture `no-store`), donc seule la route
 * est revalidée.
 */
export function invalidateForRefresh(scope: RefreshScope, id: string): void {
  switch (scope) {
    case "home":
      updateTag(cacheTags.home);
      revalidatePath("/");
      break;
    case "library":
      updateTag(cacheTags.allLibrarySeries);
      revalidatePath(`/libraries/${id}`);
      revalidatePath("/libraries");
      break;
    case "series":
      // Le livre peut avoir été mis en cache depuis une autre route (soft tags) :
      // on cible explicitement la liste des tomes en plus de la route.
      updateTag(cacheTags.seriesBooks(id));
      revalidatePath(`/series/${id}`);
      revalidatePath("/series");
      break;
    case "book":
      revalidatePath(`/books/${id}`);
      break;
  }
}
