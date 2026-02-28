"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshButton } from "@/components/library/RefreshButton";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { usePreferences } from "@/contexts/PreferencesContext";

interface HomeClientWrapperProps {
  children: ReactNode;
}

export function HomeClientWrapper({ children }: HomeClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { preferences } = usePreferences();

  const hasCustomBackground =
    (preferences.background.type === "gradient" && Boolean(preferences.background.gradient)) ||
    (preferences.background.type === "image" && Boolean(preferences.background.imageUrl)) ||
    preferences.background.type === "komga-random";

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Re-fetch server-side data
      router.refresh();
      return { success: true };
    } catch (_error) {
      return { success: false, error: "Erreur lors du rafraîchissement de la page d'accueil" };
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
      <main className="relative isolate overflow-hidden">
        {!hasCustomBackground && (
          <>
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,hsl(var(--background)/0.99)_0%,hsl(var(--background)/0.95)_28%,hsl(var(--background))_100%)]" />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(128deg,hsl(var(--primary)/0.14)_0%,transparent_36%),linear-gradient(235deg,hsl(185_82%_54%/0.1)_4%,transparent_34%),linear-gradient(320deg,hsl(332_82%_63%/0.08)_8%,transparent_32%)]" />
          </>
        )}

        <div className="container mx-auto space-y-12 px-4 py-8">
          <div className="flex justify-end">
            <RefreshButton libraryId="home" refreshLibrary={handleRefresh} />
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
