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
}: SeriesClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Revalider la page côté serveur
      router.refresh();
      return { success: true };
    } catch {
      return { success: false, error: "Error refreshing series" };
    } finally {
      // Petit délai pour laisser le temps au serveur de revalider
      setTimeout(() => setIsRefreshing(false), 500);
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
      <RefreshProvider refreshSeries={handleRefresh}>
        {children}
      </RefreshProvider>
    </>
  );
}

