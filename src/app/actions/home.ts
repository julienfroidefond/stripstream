"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { HOME_FEED_PAGE_SIZE } from "@/constants/homeConstants";
import {
  emptyFeedPage,
  paginateFeed,
  type FeedPage,
  type HomeFeed,
  type HomeFeedItem,
  type HomeFeedPage,
} from "@/lib/home/feed-page";
import { loadHomeFeedPage } from "@/lib/home/feed-registry";
import {
  buildResumeEntries,
  mergeResumeBooks,
  type ResumeEntry,
} from "@/lib/resume/resume-state";
import { resolveSeriesPool } from "@/lib/resume/series-pool";

/** Une page du hero : seuls les nouveaux tomes sont renvoyés. */
export type ContinueReadingPage = FeedPage<ResumeEntry>;

/**
 * Charge la page suivante du hero « Reprendre la lecture ».
 *
 * `offset` est le nombre de tomes déjà affichés. La réponse ne contient que la
 * nouvelle page, avec la série et la progression déjà résolues : le hero
 * n'a plus à fusionner ni à matcher côté client.
 */
export async function loadContinueReading(
  offset: number
): Promise<ContinueReadingPage> {
  const provider = await getProvider();
  if (!provider) return emptyFeedPage();

  const start = Math.max(0, offset);
  const pageEnd = start + HOME_FEED_PAGE_SIZE;
  const books = mergeResumeBooks(
    await provider.getHomeContinueReadingData(pageEnd + 1)
  );
  const page = paginateFeed(books, start, HOME_FEED_PAGE_SIZE);
  const series = await resolveSeriesPool(provider, page.items);

  return {
    items: buildResumeEntries(page.items, series),
    hasMore: page.hasMore,
  };
}

/**
 * Charge une page d'un flux de l'accueil à partir de `offset`.
 *
 * Le registre des flux possède le loader et la règle de pagination de chaque
 * section ; l'action ne fait que résoudre le provider actif.
 */
export async function loadHomeFeed<F extends HomeFeed>(
  feed: F,
  offset: number
): Promise<HomeFeedPage<F>> {
  const provider = await getProvider();
  if (!provider) return emptyFeedPage<HomeFeedItem<F>>();

  return loadHomeFeedPage(provider, feed, offset);
}
