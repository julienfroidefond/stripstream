"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshButton } from "@/components/library/RefreshButton";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useTranslate } from "@/hooks/useTranslate";

interface HomeClientWrapperProps {
  children: ReactNode;
}

export function HomeClientWrapper({ children }: HomeClientWrapperProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      <main className="container mx-auto px-4 py-8 space-y-12">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t("home.title")}</h1>
          <RefreshButton libraryId="home" refreshLibrary={handleRefresh} />
        </div>
        {children}
      </main>
    </>
  );
}
