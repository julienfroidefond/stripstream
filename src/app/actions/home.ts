"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { FavoriteService } from "@/lib/services/favorite.service";
import { HOME_FEED_PAGE_SIZE } from "@/constants/homeConstants";
import { paginateFeed, type FeedPage } from "@/lib/home/feed-page";
import {
  buildResumeEntries,
  mergeResumeBooks,
  type ResumeEntry,
} from "@/lib/resume/resume-state";
import { resolveSeriesPool } from "@/lib/resume/series-pool";
import type {
  NormalizedBook,
  NormalizedReadingList,
  NormalizedSeries,
} from "@/lib/providers/types";

export type HomeFeed =
  | "ongoing"
  | "favorites"
  | "reading-lists"
  | "latest-series"
  | "recently-read"
  | "recommendations";

export type HomeFeedItem = NormalizedBook | NormalizedSeries | NormalizedReadingList;

/** Une page d'un flux de l'accueil : seuls les nouveaux éléments sont renvoyés. */
export type HomeFeedPage = FeedPage<HomeFeedItem>;

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
  if (!provider) return { items: [], hasMore: false };

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
 * Chaque flux est lu avec un élément de sonde en plus (`pageEnd + 1`) pour
 * connaître `hasMore` sans requête de comptage. Seule la page demandée est
 * renvoyée : la politique de pagination reste côté client, dans un seul module.
 */
export async function loadHomeFeed(
  feed: HomeFeed,
  offset: number
): Promise<HomeFeedPage> {
  const provider = await getProvider();
  if (!provider) return { items: [], hasMore: false };

  const start = Math.max(0, offset);
  const pageEnd = start + HOME_FEED_PAGE_SIZE;
  const queryLimit = pageEnd + 1;
  let items: HomeFeedItem[];

  switch (feed) {
    case "ongoing":
      items = await provider.getHomeOngoingSeries(queryLimit);
      break;
    case "favorites":
      items = await FavoriteService.listFavorites();
      break;
    case "reading-lists":
      items = await provider.getReadingLists();
      break;
    case "latest-series":
      items = await provider.getHomeLatestSeries(queryLimit);
      break;
    case "recently-read":
      items = await provider.getHomeRecentlyRead(queryLimit);
      break;
    case "recommendations":
      items = await provider.getRecommendations(queryLimit);
      break;
  }

  return paginateFeed(items, start, HOME_FEED_PAGE_SIZE);
}
