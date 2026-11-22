import { revalidatePath, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import type { PreferencesPatch } from "@/lib/preferences/preferences-writer";
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
 * Réglages que le rendu serveur des pages per-id lit réellement :
 * `/libraries/[libraryId]` et `/series/[seriesId]` rendent `itemsPerPage`,
 * `compact`, `showOnlyUnread`, `defaultSortOrder` et `showMissingBooks`, et
 * passent le mode d'affichage initial de chaque grille (`viewMode`,
 * `booksViewMode`) au composant client. Toute écriture de `displayMode` influe
 * donc sur le payload RSC, même si la grille applique ensuite le changement
 * côté client : sans revalidation, revenir sur la page dans les 120 s de
 * `staleTimes.dynamic` réafficherait l'ancien mode.
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
 * client (fond, lecteur, vignettes, masquage local des tomes manquants) : sans
 * ce filtre, chaque bascule jetterait le Router Cache de toutes les pages de
 * bibliothèque et de série.
 *
 * Exception intentionnelle — `anonymousMode` : il change bien le rendu serveur
 * (`/` et `/in-progress`), mais il est piloté par le contexte client, qui
 * rafraîchit la route courante une fois l'écriture confirmée
 * (`AnonymousContext.toggleAnonymous`). Le revalider pendant la transition
 * réinjecterait l'ancien état et ferait clignoter le bouton ; les routes déjà
 * visitées peuvent donc rester périmées jusqu'à `staleTimes.dynamic` (120 s).
 *
 * Un appel sans patch ne permet pas de savoir ce qui a changé : on revalide
 * par prudence.
 */
export function affectsServerRenderedPreferences(patch?: PreferencesPatch): boolean {
  if (!patch) return true;
  return SERVER_RENDERED_PREFERENCE_KEYS.some((key) => patch[key] !== undefined);
}

/**
 * Préférences utilisateur (taille de page, filtres, affichage…). Elles ne
 * changent aucune lecture provider, donc aucun tag. Les pages `/libraries` et
 * `/series` n'existent pas : ce sont les pages per-id qui rendent les
 * préférences. Depuis une Server Action, `revalidatePath` invalide le Router
 * Cache client de l'appelant ; la portée `"page"` est celle qu'exige un
 * segment dynamique (utile aussi si la recette est appelée depuis un Route
 * Handler). Les réglages purement client ne revalident aucune route.
 */
export function invalidatePreferences(patch?: PreferencesPatch): void {
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
