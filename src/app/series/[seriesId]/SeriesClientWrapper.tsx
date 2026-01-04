"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { RefreshProvider } from "@/contexts/RefreshContext";
import type { UserPreferences } from "@/types/preferences";

interface SeriesClientWrapperProps {
  children: ReactNode;
  seriesId: string;
  currentPage: number;
  unreadOnly: boolean;
  pageSize: number;
  preferences: UserPreferences;
}

export function SeriesClientWrapper({
  children,
  seriesId,
  currentPage,
  unreadOnly,
  pageSize,
}: SeriesClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      // Fetch fresh data from network with cache bypass
      const params = new URLSearchParams({
        page: String(currentPage),
        size: String(pageSize),
        ...(unreadOnly && { unreadOnly: "true" }),
      });

      const response = await fetch(`/api/komga/series/${seriesId}/books?${params}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh series");
      }

      // Trigger Next.js revalidation to update the UI
      router.refresh();
      return { success: true };
    } catch {
      return { success: false, error: "Error refreshing series" };
    } finally {
      setIsRefreshing(false);
    }
  };

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
      <RefreshProvider refreshSeries={handleRefresh}>{children}</RefreshProvider>
    </>
  );
}
