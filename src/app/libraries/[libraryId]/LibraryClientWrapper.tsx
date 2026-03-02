"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { revalidateForRefresh } from "@/app/actions/refresh";

interface LibraryClientWrapperProps {
  children: ReactNode;
  libraryId?: string;
}

const REFRESH_ANIMATION_MS = 400;

export function LibraryClientWrapper({ children, libraryId }: LibraryClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(
    async (libraryIdArg?: string) => {
      const id = libraryIdArg ?? libraryId;
      if (!id) {
        router.refresh();
        return { success: true };
      }
      try {
        setIsRefreshing(true);
        await revalidateForRefresh("library", id);
        router.refresh();
        await new Promise((r) => setTimeout(r, REFRESH_ANIMATION_MS));
        return { success: true };
      } catch {
        return { success: false, error: "Error refreshing library" };
      } finally {
        setIsRefreshing(false);
      }
    },
    [libraryId, router]
  );

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await handleRefresh();
    },
    enabled: !isRefreshing,
  });

  return (
    <RefreshProvider
      refreshLibrary={libraryId ? (id) => handleRefresh(id) : undefined}
    >
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing || isRefreshing}
        progress={pullToRefresh.progress}
        canRefresh={pullToRefresh.canRefresh}
        isHiding={pullToRefresh.isHiding}
      />
      {children}
    </RefreshProvider>
  );
}
