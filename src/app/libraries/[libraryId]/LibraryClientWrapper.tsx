"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { RefreshProvider } from "@/contexts/RefreshContext";
import type { UserPreferences } from "@/types/preferences";

interface LibraryClientWrapperProps {
  children: ReactNode;
  libraryId: string;
  currentPage: number;
  unreadOnly: boolean;
  search?: string;
  pageSize: number;
  preferences: UserPreferences;
}

export function LibraryClientWrapper({ children }: LibraryClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Revalider la page côté serveur
      router.refresh();
      return { success: true };
    } catch {
      return { success: false, error: "Error refreshing library" };
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
      <RefreshProvider refreshLibrary={handleRefresh}>{children}</RefreshProvider>
    </>
  );
}
