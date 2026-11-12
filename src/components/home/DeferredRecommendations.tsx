"use client";

import { useEffect, useState, useTransition } from "react";
import { loadHomeFeed } from "@/app/actions/home";
import { HomeRecommendationSkeleton } from "@/components/home/HomeContent";
import { RecommendationsRow } from "@/components/home/RecommendationsRow";
import type { FeedPage } from "@/lib/home/feed-page";
import type { NormalizedSeries } from "@/lib/providers/types";

export function DeferredRecommendations({ isAnonymous }: { isAnonymous: boolean }) {
  const [feed, setFeed] = useState<FeedPage<NormalizedSeries> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isAnonymous) return;

    startTransition(async () => {
      const result = await loadHomeFeed("recommendations", 0).catch(() => ({ items: [], hasMore: false }));
      setFeed(result);
    });
  }, [isAnonymous]);

  if (isAnonymous || (!isPending && feed?.items.length === 0)) return null;
  if (!feed) return <HomeRecommendationSkeleton />;

  return <RecommendationsRow series={feed.items} initialHasMore={feed.hasMore} />;
}
