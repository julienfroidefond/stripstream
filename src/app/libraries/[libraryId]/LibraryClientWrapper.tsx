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

export function LibraryClientWrapper({
  children,
  libraryId,
  currentPage,
  unreadOnly,
  search,
  pageSize,
}: LibraryClientWrapperProps) {
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
        ...(search && { search }),
      });

      const response = await fetch(`/api/komga/libraries/${libraryId}/series?${params}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh library");
      }

      // Trigger Next.js revalidation to update the UI
      router.refresh();
      return { success: true };
    } catch {
      return { success: false, error: "Error refreshing library" };
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
      <RefreshProvider refreshLibrary={handleRefresh}>{children}</RefreshProvider>
    </>
  );
}
