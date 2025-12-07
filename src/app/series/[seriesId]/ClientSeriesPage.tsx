"use client";

import { useEffect, useState } from "react";
import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { OptimizedSkeleton } from "@/components/skeletons/OptimizedSkeletons";
import type { LibraryResponse } from "@/types/library";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import type { UserPreferences } from "@/types/preferences";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";

interface ClientSeriesPageProps {
  seriesId: string;
  currentPage: number;
  preferences: UserPreferences;
  unreadOnly: boolean;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export function ClientSeriesPage({
  seriesId,
  currentPage,
  preferences,
  unreadOnly,
  pageSize,
}: ClientSeriesPageProps) {
  const [series, setSeries] = useState<KomgaSeries | null>(null);
  const [books, setBooks] = useState<LibraryResponse<KomgaBook> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectivePageSize = pageSize || preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(currentPage - 1),
          size: String(effectivePageSize),
          unread: String(unreadOnly),
        });

        const response = await fetch(`/api/komga/series/${seriesId}/books?${params}`, {
          cache: "default", // Utilise le cache HTTP du navigateur
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.code || ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
        }

        const data = await response.json();
        setSeries(data.series);
        setBooks(data.books);
      } catch (err) {
        logger.error({ err }, "Error fetching series books");
        setError(err instanceof Error ? err.message : ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [seriesId, currentPage, unreadOnly, effectivePageSize]);

  const handleRefresh = async (seriesId: string) => {
    try {
      // Invalidate cache via API
      const cacheResponse = await fetch(`/api/komga/series/${seriesId}/books`, {
        method: "DELETE",
      });

      if (!cacheResponse.ok) {
        throw new Error("Erreur lors de l'invalidation du cache");
      }

      // Recharger les données
      const params = new URLSearchParams({
        page: String(currentPage - 1),
        size: String(effectivePageSize),
        unread: String(unreadOnly),
      });

      const response = await fetch(`/api/komga/series/${seriesId}/books?${params}`, {
        cache: "reload", // Force un nouveau fetch après invalidation
      });

      if (!response.ok) {
        throw new Error("Erreur lors du rafraîchissement de la série");
      }

      const data = await response.json();
      setSeries(data.series);
      setBooks(data.books);

      return { success: true };
    } catch (error) {
      logger.error({ err: error }, "Erreur lors du rafraîchissement:");
      return { success: false, error: "Erreur lors du rafraîchissement de la série" };
    }
  };

  const handleRetry = async () => {
    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(currentPage - 1),
        size: String(effectivePageSize),
        unread: String(unreadOnly),
      });

      const response = await fetch(`/api/komga/series/${seriesId}/books?${params}`, {
        cache: "reload", // Force un nouveau fetch lors du retry
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.code || ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
      }

      const data = await response.json();
      setSeries(data.series);
      setBooks(data.books);
    } catch (err) {
      logger.error({ err }, "Error fetching series books");
      setError(err instanceof Error ? err.message : ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await handleRefresh(seriesId);
    },
    enabled: !loading && !error && !!series && !!books,
  });

  if (loading) {
    return (
      <div className="container py-8 space-y-8">
        <div className="space-y-4">
          <OptimizedSkeleton className="h-64 w-full rounded" />
          <OptimizedSkeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: effectivePageSize }).map((_, i) => (
            <OptimizedSkeleton key={i} className="aspect-[3/4] w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Série</h1>
        <ErrorMessage errorCode={error} onRetry={handleRetry} />
      </div>
    );
  }

  if (!series || !books) {
    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Série</h1>
        <ErrorMessage errorCode={ERROR_CODES.SERIES.FETCH_ERROR} onRetry={handleRetry} />
      </div>
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
      <div className="container">
        <SeriesHeader series={series} refreshSeries={handleRefresh} />
        <PaginatedBookGrid
          books={books.content || []}
          currentPage={currentPage}
          totalPages={books.totalPages}
          totalElements={books.totalElements}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
          onRefresh={() => handleRefresh(seriesId)}
        />
      </div>
    </>
  );
}
