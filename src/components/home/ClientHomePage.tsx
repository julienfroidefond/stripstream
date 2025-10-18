"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeContent } from "./HomeContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { HomePageSkeleton } from "@/components/skeletons/OptimizedSkeletons";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { HomeData } from "@/types/home";

export function ClientHomePage() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/komga/home", {
        cache: 'default' // Utilise le cache HTTP du navigateur
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.error?.code || ERROR_CODES.KOMGA.SERVER_UNREACHABLE;
        
        // Si la config Komga est manquante, rediriger vers les settings
        if (errorCode === ERROR_CODES.KOMGA.MISSING_CONFIG) {
          router.push("/settings");
          return;
        }
        
        throw new Error(errorCode);
      }

      const homeData = await response.json();
      setData(homeData);
    } catch (err) {
      console.error("Error fetching home data:", err);
      setError(err instanceof Error ? err.message : ERROR_CODES.KOMGA.SERVER_UNREACHABLE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    try {
      // Invalider le cache via l'API
      const deleteResponse = await fetch("/api/komga/home", {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        throw new Error("Erreur lors de l'invalidation du cache");
      }

      // Récupérer les nouvelles données
      const response = await fetch("/api/komga/home", {
        cache: 'reload' // Force un nouveau fetch après invalidation
      });

      if (!response.ok) {
        throw new Error("Erreur lors du rafraîchissement de la page d'accueil");
      }

      const homeData = await response.json();
      setData(homeData);

      return { success: true };
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
      return { success: false, error: "Erreur lors du rafraîchissement de la page d'accueil" };
    }
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await handleRefresh();
    },
    enabled: !loading && !error && !!data,
  });

  if (loading) {
    return <HomePageSkeleton />;
  }

  const handleRetry = () => {
    fetchData();
  };

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={error} onRetry={handleRetry} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={ERROR_CODES.KOMGA.SERVER_UNREACHABLE} onRetry={handleRetry} />
      </main>
    );
  }

  return (
    <>
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        progress={pullToRefresh.progress}
        canRefresh={pullToRefresh.canRefresh}
        isHiding={pullToRefresh.isHiding}
      />
      <HomeContent data={data} refreshHome={handleRefresh} />
    </>
  );
}

