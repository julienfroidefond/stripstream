"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshButton } from "@/components/library/RefreshButton";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { revalidateForRefresh } from "@/app/actions/refresh";
import Image from "next/image";
import { HomeCarouselSkeleton, HomeHeroSkeleton } from "@/components/home/HomeContent";
import { Bookmark, Heart, History, LibraryBig, Sparkles, Wand2 } from "lucide-react";
import { useConnectionTransition } from "@/contexts/ConnectionTransitionContext";

interface HomeClientWrapperProps {
  children: ReactNode;
}

const REFRESH_ANIMATION_MS = 400;

export function HomeClientWrapper({ children }: HomeClientWrapperProps) {
  const router = useRouter();
  const { isSwitchingConnection } = useConnectionTransition();
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
        <div className="pointer-events-none absolute inset-0 z-0 flex items-start justify-center pt-10">
          <Image
            src="/images/logostripstream.png"
            alt=""
            width={600}
            height={600}
            aria-hidden
            className="hidden h-auto w-[min(78vw,600px)] opacity-[0.08] saturate-125 dark:block"
          />
          <Image
            src="/images/logostripstream-white.png"
            alt=""
            width={600}
            height={600}
            aria-hidden
            className="h-auto w-[min(78vw,600px)] opacity-[0.1] saturate-125 dark:hidden"
          />
        </div>
        <div className="container relative z-10 mx-auto px-4 pb-8 pt-3">
          <div className="mb-6 hidden justify-end md:flex">
            <RefreshButton libraryId="home" refreshLibrary={handleRefresh} />
          </div>
          {isSwitchingConnection ? <ConnectionSwitchingSkeleton /> : children}
        </div>
      </main>
    </>
  );
}

function ConnectionSwitchingSkeleton() {
  return (
    <div aria-busy="true" data-testid="connection-switch-loading" className="space-y-10 pb-2">
      <span className="sr-only">Chargement de la nouvelle connexion</span>
      <HomeHeroSkeleton />
      <HomeCarouselSkeleton icon={LibraryBig} />
      <HomeCarouselSkeleton icon={Heart} />
      <HomeCarouselSkeleton icon={Bookmark} />
      <HomeCarouselSkeleton icon={Sparkles} />
      <HomeCarouselSkeleton icon={History} />
      <HomeCarouselSkeleton icon={Wand2} />
    </div>
  );
}
