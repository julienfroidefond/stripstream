import { HOME_FEED_PAGE_SIZE } from "@/constants/homeConstants";
import { FavoriteService } from "@/lib/services/favorite.service";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import {
  paginateFeed,
  type FeedPage,
  type HomeFeed,
  type HomeFeedItems,
} from "./feed-page";

/**
 * Règle de chargement d'un flux.
 *
 * `probe` : le provider accepte une limite ; on demande `offset + pageSize + 1`
 * pour savoir s'il reste une page sans requête de comptage.
 * `slice` : le provider renvoie toute la collection ; on la borne en la
 * découpant, sans exposer la collection complète au rendu.
 */
interface ProbeFeed<T> {
  pageRule: "probe";
  load: (provider: IMediaProvider, limit: number) => Promise<readonly T[]>;
}

interface SliceFeed<T> {
  pageRule: "slice";
  load: (provider: IMediaProvider) => Promise<readonly T[]>;
}

type FeedDefinition<T> = ProbeFeed<T> | SliceFeed<T>;

const feeds = {
  ongoing: {
    pageRule: "probe",
    load: (provider, limit) => provider.getHomeOngoingSeries(limit),
  },
  favorites: {
    pageRule: "slice",
    load: () => FavoriteService.listFavorites(),
  },
  "reading-lists": {
    pageRule: "slice",
    load: (provider) => provider.capabilities.readingLists
      ? provider.capabilities.readingLists.getReadingLists()
      : Promise.resolve([]),
  },
  "latest-series": {
    pageRule: "probe",
    load: (provider, limit) => provider.getHomeLatestSeries(limit),
  },
  "recently-read": {
    pageRule: "probe",
    load: (provider, limit) => provider.getHomeRecentlyRead(limit),
  },
  recommendations: {
    pageRule: "probe",
    load: (provider, limit) => provider.capabilities.discovery
      ? provider.capabilities.discovery.getRecommendations(limit)
      : Promise.resolve([]),
  },
} satisfies { [F in HomeFeed]: FeedDefinition<HomeFeedItems[F]> };

/**
 * Charge une page d'un flux de l'accueil.
 *
 * Le registre possède la seule politique de pagination : le rendu initial et
 * les actions « Voir plus » passent tous par ici, et chaque flux ne déclare
 * que son loader et sa règle de page.
 */
export async function loadHomeFeedPage<F extends HomeFeed>(
  provider: IMediaProvider,
  feed: F,
  offset: number,
  pageSize = HOME_FEED_PAGE_SIZE
): Promise<FeedPage<HomeFeedItems[F]>> {
  const definition = feeds[feed] as unknown as FeedDefinition<HomeFeedItems[F]>;
  const start = Math.max(0, offset);
  const items =
    definition.pageRule === "probe"
      ? await definition.load(provider, start + pageSize + 1)
      : await definition.load(provider);

  return paginateFeed(items, start, pageSize);
}
