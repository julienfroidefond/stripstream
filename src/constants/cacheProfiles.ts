import { cacheTags } from "./cacheConstants";

/**
 * Profils de cache des lectures provider (ADR 0028).
 *
 * Un profil répond à « combien de temps et sous quels tags cette lecture
 * est-elle cachée ? ». Les deux providers le passent tel quel à leur mécanisme
 * (`unstable_cache` ou options de `ProviderTransport.request`) : aucun provider
 * ne choisit lui-même un TTL ni n'assemble une liste de tags. Le vocabulaire
 * des tags reste `cacheTags` ; l'invalidation reste dans
 * `src/lib/cache/invalidation.ts`.
 *
 * Chaque appel renvoie un objet neuf : un appelant peut l'étaler dans ses
 * options sans risquer de muter le profil d'une autre lecture.
 */

/** Durées en secondes. Les seules valeurs de TTL des lectures provider. */
export const CACHE_TTL = {
  /** Données quasi statiques : liste des bibliothèques. */
  long: 300,
  /** Listes et fiches : séries, tomes, accueil, favoris. */
  medium: 120,
  /** Données qui bougent avec la lecture : progression, recherche, note. */
  short: 30,
} as const;

/** Lecture mise en cache : un TTL et, si une mutation doit l'expirer, des tags. */
export interface CachedProfile {
  revalidate?: number;
  tags?: string[];
}

/** Lecture jamais mise en cache (position du lecteur). */
export interface NoStoreProfile {
  cache: "no-store";
}

export type CacheProfile = CachedProfile | NoStoreProfile;

/** Filtre d'une liste de tomes, réduit à ce qui décide de ses tags. */
export interface BooksProfileFilter {
  /** Identifiant de série tel que le backend le connaît (déjà résolu). */
  seriesId?: string | null;
  libraryId?: string | null;
}

export const cacheProfile = {
  /** Liste des bibliothèques (et `getLibraryById`, qui la relit). */
  libraries: (): CachedProfile => ({ revalidate: CACHE_TTL.long }),

  /** Séries d'une bibliothèque : tag global + tag de la bibliothèque. */
  librarySeries: (libraryId: string): CachedProfile => ({
    revalidate: CACHE_TTL.medium,
    tags: [cacheTags.allLibrarySeries, cacheTags.librarySeries(libraryId)],
  }),

  /**
   * Tomes d'une liste filtrée : toujours le tag global, plus le tag de la série
   * et celui de la bibliothèque quand le filtre les porte.
   */
  books: ({ seriesId, libraryId }: BooksProfileFilter = {}): CachedProfile => {
    const tags: string[] = [cacheTags.allSeriesBooks];
    if (seriesId) tags.push(cacheTags.seriesBooks(seriesId));
    if (libraryId) tags.push(cacheTags.libraryBooks(libraryId));
    return { revalidate: CACHE_TTL.medium, tags };
  },

  /**
   * Fiche d'un tome ouverte par le lecteur : la position de reprise doit venir
   * du backend à chaque visite, aucune donnée n'est gardée.
   */
  readerBook: (): NoStoreProfile => ({ cache: "no-store" }),

  /** Liste des pages d'un tome. */
  bookPages: (): CachedProfile => ({ revalidate: CACHE_TTL.short }),

  /** Progression de lecture d'un tome. */
  readProgress: (): CachedProfile => ({ revalidate: CACHE_TTL.short }),

  /** Recherche du tome suivant (fiche du tome + page de la série). */
  nextBook: (): CachedProfile => ({ revalidate: CACHE_TTL.short }),

  /** Recherche plein texte. */
  search: (): CachedProfile => ({ revalidate: CACHE_TTL.short }),

  /**
   * Identité et fiche d'une série : détails, métadonnées, résolution par nom ou
   * par premier tome, liens de métadonnées et tomes manquants.
   */
  series: (): CachedProfile => ({ revalidate: CACHE_TTL.medium }),

  /** Flux de l'accueil (reprendre, en cours, nouveautés, récents). */
  home: (): CachedProfile => ({ revalidate: CACHE_TTL.medium, tags: [cacheTags.home] }),

  /** Listes de lecture affichées sur l'accueil : expirent avec lui. */
  readingLists: (): CachedProfile => ({
    revalidate: CACHE_TTL.medium,
    tags: [cacheTags.home],
  }),

  /** Détail d'une liste de lecture (TTL seul). */
  readingListDetail: (): CachedProfile => ({ revalidate: CACHE_TTL.medium }),

  /** Séries mises de côté : accueil et listes de séries. */
  shelvedSeries: (): CachedProfile => ({
    revalidate: CACHE_TTL.medium,
    tags: [cacheTags.home, cacheTags.allLibrarySeries],
  }),

  /** État « mis de côté » d'une série pour le lecteur courant. */
  seriesShelf: (seriesId: string): CachedProfile => ({
    revalidate: CACHE_TTL.short,
    tags: [cacheTags.allSeriesShelves, cacheTags.seriesShelf(seriesId)],
  }),

  /** Séries entièrement lues, listées sur la page « Mes notes ». */
  readSeries: (): CachedProfile => ({
    revalidate: CACHE_TTL.medium,
    tags: [cacheTags.ratingsList],
  }),

  /** Notes d'une série. */
  seriesRating: (seriesId: string): CachedProfile => ({
    revalidate: CACHE_TTL.short,
    tags: [cacheTags.allSeriesRatings, cacheTags.seriesRating(seriesId)],
  }),

  /** Favoris (liste et appartenance d'une série). */
  favorites: (): CachedProfile => ({
    revalidate: CACHE_TTL.medium,
    tags: [cacheTags.favorites],
  }),

  /** Recommandations (TTL seul en pratique : aucune mutation ne les expire). */
  recommendations: (): CachedProfile => ({
    revalidate: CACHE_TTL.medium,
    tags: [cacheTags.seriesRecommendations],
  }),

  /** Séries liées (TTL seul en pratique : aucune mutation ne les expire). */
  relatedSeries: (seriesId: string): CachedProfile => ({
    revalidate: CACHE_TTL.medium,
    tags: [cacheTags.seriesRelated(seriesId)],
  }),

  /**
   * Compteurs des statistiques de lecture. Aucun TTL déclaré (comportement
   * historique) : seule `invalidateReadProgress` expire le tag.
   */
  stats: (): CachedProfile => ({ tags: [cacheTags.stats] }),
} as const;
