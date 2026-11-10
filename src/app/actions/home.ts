"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { FavoriteService } from "@/lib/services/favorite.service";
import { resolveSeriesPool } from "@/lib/services/home.service";
import { getContinueReading } from "@/components/home/HomeContent";
import { CONTINUE_READING_PAGE_SIZE } from "@/constants/homeConstants";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import type { StripstreamReadingList } from "@/types/stripstream";

export type HomeFeed =
  | "continue-reading"
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
  /**
   * Séries qui portent les nouveaux tomes (feed `continue-reading`
   * uniquement), pour que le hero retrouve nom/résumé/genres après « Voir plus ».
   */
  series?: NormalizedSeries[];
}

export async function loadHomeFeed(feed: HomeFeed, visibleCount: number): Promise<HomeFeedResult> {
  const provider = await getProvider();
  if (!provider) return { items: [], hasMore: false };

  const requestedCount = visibleCount + CONTINUE_READING_PAGE_SIZE;
  const queryLimit = requestedCount + 1;
  let items: HomeFeedItem[];
  let series: NormalizedSeries[] | undefined;

  switch (feed) {
    case "continue-reading": {
      const books = getContinueReading(await provider.getHomeContinueReadingData(queryLimit));
      items = books;
      series = await resolveSeriesPool(
        provider,
        books.slice(visibleCount, requestedCount)
      );
      break;
    }
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
    series,
  };
}
