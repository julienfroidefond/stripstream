export const HOME_CACHE_TAG = "home-data";
export const LIBRARY_SERIES_CACHE_TAG = "library-series";
export const SERIES_BOOKS_CACHE_TAG = "series-books";
export const FAVORITES_CACHE_TAG = "favorites";
export const SERIES_RATING_CACHE_TAG = "series-rating";
/** État « mis de côté » d'une série pour le lecteur courant. */
export const SERIES_SHELF_CACHE_TAG = "series-shelf";
/** Liste des séries lues affichée sur la page de notation (données par utilisateur). */
export const RATINGS_LIST_CACHE_TAG = "ratings-list";
export const STATS_CACHE_TAG = "reading-stats";
/**
 * Tags TTL only : aucune mutation ne les invalide volontairement. Ils sont
 * déclarés ici pour que les producteurs et un éventuel invalidateur partagent
 * la même chaîne.
 */
export const SERIES_RELATED_CACHE_TAG = "series-related";
export const SERIES_RECOMMENDATIONS_CACHE_TAG = "series-recommendations";

/**
 * Vocabulaire des tags portant sur une entité. Les profils de lecture
 * (`cacheProfile`, `./cacheProfiles.ts`) et les recettes d'invalidation passent
 * par ici : un tag per-id n'est jamais reconstruit à la main, donc un renommage
 * casse à la compilation. Les providers ne lisent ni ces constantes ni
 * `cacheTags` : ils reçoivent un profil complet.
 */
export const cacheTags = {
  home: HOME_CACHE_TAG,
  favorites: FAVORITES_CACHE_TAG,
  stats: STATS_CACHE_TAG,
  ratingsList: RATINGS_LIST_CACHE_TAG,
  allLibrarySeries: LIBRARY_SERIES_CACHE_TAG,
  allSeriesBooks: SERIES_BOOKS_CACHE_TAG,
  allSeriesRatings: SERIES_RATING_CACHE_TAG,
  allSeriesShelves: SERIES_SHELF_CACHE_TAG,
  librarySeries: (libraryId: string) => `${LIBRARY_SERIES_CACHE_TAG}:${libraryId}`,
  libraryBooks: (libraryId: string) => `library-books:${libraryId}`,
  seriesBooks: (seriesId: string) => `${SERIES_BOOKS_CACHE_TAG}:${seriesId}`,
  seriesRating: (seriesId: string) => `${SERIES_RATING_CACHE_TAG}:${seriesId}`,
  seriesShelf: (seriesId: string) => `${SERIES_SHELF_CACHE_TAG}:${seriesId}`,
  seriesRelated: (seriesId: string) => `${SERIES_RELATED_CACHE_TAG}:${seriesId}`,
  seriesRecommendations: SERIES_RECOMMENDATIONS_CACHE_TAG,
} as const;
