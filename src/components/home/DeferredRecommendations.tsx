"use client";

import { useEffect, useState, useTransition } from "react";
import { loadHomeFeed } from "@/app/actions/home";
import { HomeRecommendationSkeleton } from "@/components/home/HomeContent";
import { RecommendationsRow } from "@/components/home/RecommendationsRow";
import { emptyFeedPage, type FeedPage } from "@/lib/home/feed-page";
import type { NormalizedSeries } from "@/lib/providers/types";

/**
 * Rangée chargée après le premier rendu (`initial: "deferred"`).
 *
 * La page ne la monte que si la politique ne la masque pas ; un échec de
 * l'action se rend comme une rangée vide (`onFailure: "empty"`).
 */
export function DeferredRecommendations() {
  const [feed, setFeed] = useState<FeedPage<NormalizedSeries> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await loadHomeFeed("recommendations", 0).catch(() => null);
      setFeed(
        result?.success
          ? { items: result.items, hasMore: result.hasMore }
          : emptyFeedPage<NormalizedSeries>()
      );
    });
  }, []);

  if (!isPending && feed?.items.length === 0) return null;
  if (!feed) return <HomeRecommendationSkeleton />;

  return <RecommendationsRow series={feed.items} initialHasMore={feed.hasMore} />;
}
