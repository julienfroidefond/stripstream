"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshButton } from "@/components/library/RefreshButton";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { revalidateForRefresh } from "@/app/actions/refresh";

interface HomeClientWrapperProps {
  children: ReactNode;
}

const REFRESH_ANIMATION_MS = 400;

export function HomeClientWrapper({ children }: HomeClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await revalidateForRefresh("home", "home");
      router.refresh();
      await new Promise((r) => setTimeout(r, REFRESH_ANIMATION_MS));
      return { success: true };
    } catch (_error) {
      return { success: false, error: "Erreur lors du rafraîchissement de la page d'accueil" };
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

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
      <main className="relative isolate overflow-hidden">
        <div className="container mx-auto space-y-6 px-4 pb-8 pt-3">
          <div className="flex justify-end">
            <RefreshButton libraryId="home" refreshLibrary={handleRefresh} />
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
