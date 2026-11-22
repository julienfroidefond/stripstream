import { revalidatePath, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import type { UserPreferences } from "@/types/preferences";

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

/**
 * Lancement du scan d'une bibliothèque. Le scan tourne côté backend après la
 * réponse : aucune donnée taguée n'a encore changé, seules les routes de la
 * bibliothèque sont revalidées pour refléter l'état « scan lancé ».
 */
export function invalidateLibraryScan(libraryId: string): void {
  revalidatePath(`/libraries/${libraryId}`);
}

/**
 * Réglages de préférences réellement lus par le rendu serveur des pages
 * per-id. Tout le reste (thème, fond, lecteur, vignettes…) ne vit que côté
 * client.
 */
const SERVER_RENDERED_PREFERENCE_KEYS = [
  "displayMode",
  "showOnlyUnread",
  "defaultSortOrder",
  "showMissingBooks",
] as const satisfies ReadonlyArray<keyof UserPreferences>;

/**
 * Indique si une écriture de préférences peut modifier le rendu serveur d'une
 * page per-id. `usePaginatedGrid` enregistre aussi des réglages purement
 * client (fond, lecteur, vignettes…) : sans ce filtre, chaque bascule
 * jetterait toutes les pages de bibliothèque et de série. Un appel sans patch
 * ne permet pas de savoir ce qui a changé : on revalide par prudence.
 */
export function affectsServerRenderedPreferences(patch?: Partial<UserPreferences>): boolean {
  if (!patch) return true;
  return SERVER_RENDERED_PREFERENCE_KEYS.some((key) => key in patch);
}

/**
 * Préférences utilisateur (taille de page, filtres, affichage…). Elles ne
 * changent aucune lecture provider, donc aucun tag. Les pages `/libraries` et
 * `/series` n'existent pas : ce sont les pages per-id qui rendent les
 * préférences, et c'est leur payload RSC gardé 120 s par le Router Cache
 * client (`staleTimes.dynamic`) qu'on purge ici. Les réglages purement client
 * ne revalident aucune route.
 */
export function invalidatePreferences(patch?: Partial<UserPreferences>): void {
  if (!affectsServerRenderedPreferences(patch)) return;

  revalidatePath("/libraries/[libraryId]", "page");
  revalidatePath("/series/[seriesId]", "page");
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
      // Le profil `librarySeries` porte à la fois le tag global et le tag
      // per-id : invalider le seul per-id rafraîchit cette bibliothèque sans
      // expulser la grille de toutes les autres.
      updateTag(cacheTags.librarySeries(id));
      revalidatePath(`/libraries/${id}`);
      break;
    case "series":
      // Le livre peut avoir été mis en cache depuis une autre route (soft tags) :
      // on cible explicitement la liste des tomes en plus de la route.
      updateTag(cacheTags.seriesBooks(id));
      revalidatePath(`/series/${id}`);
      break;
    case "book":
      revalidatePath(`/books/${id}`);
      break;
  }
}
