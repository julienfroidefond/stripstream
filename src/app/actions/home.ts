"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { FavoriteService } from "@/lib/services/favorite.service";
import { CONTINUE_READING_PAGE_SIZE } from "@/constants/homeConstants";
import {
  buildResumeEntries,
  mergeResumeBooks,
  type ResumeEntry,
} from "@/lib/resume/resume-state";
import { resolveSeriesPool } from "@/lib/resume/series-pool";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { StripstreamReadingList } from "@/types/stripstream";

export type HomeFeed =
  | "ongoing"
  | "favorites"
  | "reading-lists"
  | "latest-series"
  | "recently-read"
  | "recommendations";

export type HomeFeedItem = NormalizedBook | NormalizedSeries | StripstreamReadingList;

export interface HomeFeedResult {
  items: HomeFeedItem[];
  hasMore: boolean;
}

export interface ContinueReadingPage {
  /** Uniquement les nouveaux tomes : le hero ajoute la page à sa liste. */
  items: ResumeEntry[];
  hasMore: boolean;
}

/**
 * Charge la page suivante du hero « Reprendre la lecture ».
 *
 * `visibleCount` est le nombre de tomes déjà affichés. La réponse ne contient
 * que les nouveaux tomes, avec leur série et leur progression déjà résolues :
 * le hero n'a plus à fusionner ni à matcher côté client.
 */
export async function loadContinueReading(
  visibleCount: number
): Promise<ContinueReadingPage> {
  const provider = await getProvider();
  if (!provider) return { items: [], hasMore: false };

  const requestedCount = visibleCount + CONTINUE_READING_PAGE_SIZE;
  const books = mergeResumeBooks(
    await provider.getHomeContinueReadingData(requestedCount + 1)
  );
  const newBooks = books.slice(visibleCount, requestedCount);
  const series = await resolveSeriesPool(provider, newBooks);

  return {
    items: buildResumeEntries(newBooks, series),
    hasMore: books.length > requestedCount,
  };
}

export async function loadHomeFeed(feed: HomeFeed, visibleCount: number): Promise<HomeFeedResult> {
  const provider = await getProvider();
  if (!provider) return { items: [], hasMore: false };

  const requestedCount = visibleCount + CONTINUE_READING_PAGE_SIZE;
  const queryLimit = requestedCount + 1;
  let items: HomeFeedItem[];

  switch (feed) {
    case "ongoing":
      items = await provider.getHomeOngoingSeries(queryLimit);
      break;
    case "favorites":
      items = await FavoriteService.listFavorites();
      break;
    case "reading-lists":
      items = await provider.getHomeReadingLists();
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

  const visibleItems = items.slice(0, requestedCount);

  return {
    items: visibleItems,
    hasMore: items.length > requestedCount,
  };
}
