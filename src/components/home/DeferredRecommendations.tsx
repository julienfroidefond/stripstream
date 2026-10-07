"use client";

import { useEffect, useState, useTransition } from "react";
import { Wand2 } from "lucide-react";
import { loadHomeFeed } from "@/app/actions/home";
import { HomeCarouselSkeleton } from "@/components/home/HomeContent";
import { RecommendationsRow } from "@/components/home/RecommendationsRow";
import type { NormalizedSeries } from "@/lib/providers/types";

export function DeferredRecommendations({ isAnonymous }: { isAnonymous: boolean }) {
  const [series, setSeries] = useState<NormalizedSeries[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isAnonymous) return;

    startTransition(async () => {
      const result = await loadHomeFeed("recommendations", 0).catch(() => ({ items: [], hasMore: false }));
      setSeries(result.items as NormalizedSeries[]);
    });
  }, [isAnonymous]);

  if (isAnonymous || (!isPending && series?.length === 0)) return null;
  if (!series) return <HomeCarouselSkeleton icon={Wand2} />;

  return <RecommendationsRow series={series} />;
}
