import { HOME_FEED_PAGE_SIZE } from "@/constants/homeConstants";
import { FavoriteService } from "@/lib/services/favorite.service";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import {
  paginateFeed,
  probeLimit,
  type FeedPage,
  type HomeFeed,
  type HomeFeedItems,
  type HomeFeedPolicy,
} from "./feed-page";

/**
 * Entrée du registre : la politique de la rangée et sa règle de chargement.
 *
 * `probe` : le provider accepte une limite ; on demande `offset + pageSize + 1`
 * pour savoir s'il reste une page sans requête de comptage.
 * `slice` : le provider renvoie toute la collection ; on la borne en la
 * découpant, sans exposer la collection complète au rendu.
 */
interface ProbeFeed<T> {
  policy: HomeFeedPolicy;
  pageRule: "probe";
  load: (provider: IMediaProvider, limit: number) => Promise<readonly T[]>;
}

interface SliceFeed<T> {
  policy: HomeFeedPolicy;
  pageRule: "slice";
  load: (provider: IMediaProvider) => Promise<readonly T[]>;
}

type FeedDefinition<T> = ProbeFeed<T> | SliceFeed<T>;

/** Rangée personnelle : masquée en anonyme, comptée dans la règle d'échec. */
export const PERSONAL_FEED_POLICY: HomeFeedPolicy = {
  anonymous: "hide",
  initial: "eager",
  onFailure: "empty",
  countsTowardOutage: true,
};

/** Rangée de catalogue : visible en anonyme, comptée dans la règle d'échec. */
const CATALOG_FEED_POLICY: HomeFeedPolicy = {
  anonymous: "load",
  initial: "eager",
  onFailure: "empty",
  countsTowardOutage: true,
};

const feeds = {
  ongoing: {
    policy: PERSONAL_FEED_POLICY,
    pageRule: "probe",
    load: (provider, limit) => provider.getHomeOngoingSeries(limit),
  },
  favorites: {
    // Les favoris restent visibles en anonyme et ne prouvent pas que le
    // provider répond : ils ne comptent pas dans la règle « tout a échoué ».
    policy: { ...CATALOG_FEED_POLICY, countsTowardOutage: false },
    pageRule: "slice",
    // Le registre ne reçoit que le provider : il résout l'identité ici en
    // attendant que ses appelants lui passent le `userId` (ADR 0029). Sans
    // session, la rangée reste vide comme avant.
    load: async (provider) => {
      const { getCurrentUserId } = await import("@/lib/auth-utils");
      const userId = await getCurrentUserId();
      return userId === null ? [] : FavoriteService.listFavorites({ userId, provider });
    },
  },
  "reading-lists": {
    policy: CATALOG_FEED_POLICY,
    pageRule: "slice",
    load: (provider) => provider.capabilities.readingLists
      ? provider.capabilities.readingLists.getReadingLists()
      : Promise.resolve([]),
  },
  "latest-series": {
    policy: CATALOG_FEED_POLICY,
    pageRule: "probe",
    load: (provider, limit) => provider.getHomeLatestSeries(limit),
  },
  "recently-read": {
    policy: CATALOG_FEED_POLICY,
    pageRule: "probe",
    load: (provider, limit) => provider.getHomeRecentlyRead(limit),
  },
  recommendations: {
    // Chargées par le client après le premier rendu : hors règle d'échec.
    policy: {
      ...PERSONAL_FEED_POLICY,
      initial: "deferred",
      countsTowardOutage: false,
    },
    pageRule: "probe",
    load: (provider, limit) => provider.capabilities.discovery
      ? provider.capabilities.discovery.getRecommendations(limit)
      : Promise.resolve([]),
  },
} satisfies { [F in HomeFeed]: FeedDefinition<HomeFeedItems[F]> };

/** Flux de rangée, dans l'ordre de déclaration du registre. */
export const HOME_FEEDS = Object.keys(feeds) as HomeFeed[];

/** Politique déclarée par l'entrée de registre d'un flux. */
export function homeFeedPolicy(feed: HomeFeed): HomeFeedPolicy {
  return feeds[feed].policy;
}

/**
 * Charge une page d'un flux de l'accueil, sans appliquer la politique.
 *
 * Le registre possède la seule règle de pagination : le rendu initial et
 * les actions « Voir plus » passent tous par ici (via `home-feeds.ts`), et
 * chaque flux ne déclare que sa politique, son loader et sa règle de page.
 * Les erreurs provider remontent ; `home-feeds.ts` applique `onFailure`.
 */
export async function loadHomeFeedPage<F extends HomeFeed>(
  provider: IMediaProvider,
  feed: F,
  offset: number,
  pageSize = HOME_FEED_PAGE_SIZE
): Promise<FeedPage<HomeFeedItems[F]>> {
  const definition = feeds[feed] as unknown as FeedDefinition<HomeFeedItems[F]>;
  const items =
    definition.pageRule === "probe"
      ? await definition.load(provider, probeLimit(offset, pageSize))
      : await definition.load(provider);

  return paginateFeed(items, offset, pageSize);
}
