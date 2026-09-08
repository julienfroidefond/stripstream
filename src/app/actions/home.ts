"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { FavoriteService } from "@/lib/services/favorite.service";
import { getContinueReading } from "@/components/home/HomeContent";
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
}

export async function loadHomeFeed(feed: HomeFeed, visibleCount: number): Promise<HomeFeedResult> {
  const provider = await getProvider();
  if (!provider) return { items: [], hasMore: false };

  const requestedCount = visibleCount + 8;
  const queryLimit = requestedCount + 1;
  let items: HomeFeedItem[];

  switch (feed) {
    case "continue-reading":
      items = getContinueReading(await provider.getHomeContinueReadingData(queryLimit));
      break;
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

  return {
    items: items.slice(0, requestedCount),
    hasMore: items.length > requestedCount,
  };
}
