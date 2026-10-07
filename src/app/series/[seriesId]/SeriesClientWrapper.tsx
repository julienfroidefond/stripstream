"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { revalidateForRefresh } from "@/app/actions/refresh";

interface SeriesClientWrapperProps {
  children: ReactNode;
  seriesId?: string;
}

const REFRESH_ANIMATION_MS = 400;

export function SeriesClientWrapper({
  children,
  seriesId,
}: SeriesClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(
    async (seriesIdArg?: string) => {
      const id = seriesIdArg ?? seriesId;
      try {
        setIsRefreshing(true);
        if (id) {
          await revalidateForRefresh("series", id);
        }
        router.refresh();
        await new Promise((r) => setTimeout(r, REFRESH_ANIMATION_MS));
        return { success: true };
      } catch {
        return { success: false, error: "Error refreshing series" };
      } finally {
        setIsRefreshing(false);
      }
    },
    [seriesId, router]
  );

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await handleRefresh();
    },
    enabled: !isRefreshing,
  });

  return (
    <>
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing || isRefreshing}
        progress={pullToRefresh.progress}
        canRefresh={pullToRefresh.canRefresh}
        isHiding={pullToRefresh.isHiding}
      />
      <RefreshProvider refreshSeries={seriesId ? (id) => handleRefresh(id) : undefined}>
        {children}
      </RefreshProvider>
    </>
  );
}
