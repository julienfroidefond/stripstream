import { HOME_FEED_PAGE_SIZE } from "@/constants/homeConstants";
import { loadHomeFeedPage } from "@/lib/home/feed-registry";
import {
  paginateFeed,
  probeLimit,
  type FeedPage,
  type HomeFeedViewer,
} from "@/lib/home/feed-page";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedSeries } from "@/lib/providers/types";
import {
  buildResumeEntries,
  mergeResumeBooks,
  type ResumeEntry,
} from "@/lib/resume/resume-state";
import { resolveSeriesPool } from "@/lib/resume/series-pool";

/** Une page du hero : seuls les nouveaux tomes sont renvoyés. */
export type ContinueReadingPage = FeedPage<ResumeEntry>;

export interface ContinueReadingPageOptions {
  /**
   * Séries déjà connues de l'appelant, utilisées pour nommer, résumer et
   * créditer les tomes sans nouvelle requête.
   *
   * Un tableau quand le pool est déjà chargé, une promesse quand l'appelant
   * veut lancer les deux requêtes ensemble (rendu initial). Sans pool, le
   * module charge la première page du flux « ongoing », exactement comme le
   * rendu initial : les deux chemins voient donc le même pool.
   */
  knownSeries?:
    | readonly NormalizedSeries[]
    | Promise<readonly NormalizedSeries[]>;
  /** Taille de page ; le hero et l'action gardent la taille de l'accueil. */
  pageSize?: number;
}

/**
 * Charge une page du hero « Reprendre la lecture ».
 *
 * Point unique de l'orchestration : la limite de sonde, la fusion
 * « à suivre » + « en cours », la découpe, la résolution des séries
 * manquantes et la construction des entrées. Le rendu initial et l'action
 * « Voir plus » passent tous les deux par ici.
 *
 * Les erreurs provider remontent : le rendu initial dégrade le hero (il ne
 * s'affiche pas), l'action laisse le bouton disponible. Le module ne décide
 * donc pas à la place des surfaces.
 */
export async function loadContinueReadingPage(
  provider: IMediaProvider,
  offset: number,
  viewer: HomeFeedViewer,
  {
    knownSeries,
    pageSize = HOME_FEED_PAGE_SIZE,
  }: ContinueReadingPageOptions = {}
): Promise<ContinueReadingPage> {
  const start = Math.max(0, offset);
  const [source, pool] = await Promise.all([
    provider.getHomeContinueReadingData(probeLimit(offset, pageSize)),
    knownSeries
      ? Promise.resolve(knownSeries)
      : seedSeriesPool(provider, viewer),
  ]);

  const books = mergeResumeBooks(source);
  const page = paginateFeed(books, start, pageSize);
  const series = await resolveSeriesPool(provider, page.items, pool);

  return {
    items: buildResumeEntries(page.items, series),
    hasMore: page.hasMore,
  };
}

/** Pool de repli : la première page « ongoing », celle du rendu initial. */
async function seedSeriesPool(
  provider: IMediaProvider,
  viewer: HomeFeedViewer
): Promise<readonly NormalizedSeries[]> {
  const page = await loadHomeFeedPage(provider, "ongoing", 0, viewer);
  return page.items;
}
