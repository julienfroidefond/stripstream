"use client";

import { useEffect, useState } from "react";
import { PaginatedSeriesGrid } from "@/components/library/PaginatedSeriesGrid";
import { RefreshButton } from "@/components/library/RefreshButton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTranslate } from "@/hooks/useTranslate";
import { OptimizedSkeleton } from "@/components/skeletons/OptimizedSkeletons";
import type { LibraryResponse } from "@/types/library";
import type { KomgaSeries, KomgaLibrary } from "@/types/komga";
import type { UserPreferences } from "@/types/preferences";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

interface ClientLibraryPageProps {
  currentPage: number;
  libraryId: string;
  preferences: UserPreferences;
  unreadOnly: boolean;
  search?: string;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export function ClientLibraryPage({
  currentPage,
  libraryId,
  preferences,
  unreadOnly,
  search,
  pageSize,
}: ClientLibraryPageProps) {
  const { t } = useTranslate();
  const [library, setLibrary] = useState<KomgaLibrary | null>(null);
  const [series, setSeries] = useState<LibraryResponse<KomgaSeries> | null>(null);
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
        
        if (search) {
          params.append("search", search);
        }

        const response = await fetch(`/api/komga/libraries/${libraryId}/series?${params}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.code || "SERIES_FETCH_ERROR");
        }

        const data = await response.json();
        setLibrary(data.library);
        setSeries(data.series);
      } catch (err) {
        console.error("Error fetching library series:", err);
        setError(err instanceof Error ? err.message : "SERIES_FETCH_ERROR");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [libraryId, currentPage, unreadOnly, search, effectivePageSize]);

  const handleRefresh = async (libraryId: string) => {
    try {
      // Invalidate cache via API
      const cacheResponse = await fetch(`/api/komga/libraries/${libraryId}/series`, {
        method: 'DELETE',
      });

      if (!cacheResponse.ok) {
        throw new Error("Error invalidating cache");
      }
      
      // Recharger les données
      const params = new URLSearchParams({
        page: String(currentPage - 1),
        size: String(effectivePageSize),
        unread: String(unreadOnly),
      });
      
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/komga/libraries/${libraryId}/series?${params}`);
      
      if (!response.ok) {
        throw new Error("Error refreshing library");
      }

      const data = await response.json();
      setLibrary(data.library);
      setSeries(data.series);
      
      return { success: true };
    } catch (error) {
      console.error("Error during refresh:", error);
      return { success: false, error: "Error refreshing library" };
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
      
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/komga/libraries/${libraryId}/series?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.code || "SERIES_FETCH_ERROR");
      }

      const data = await response.json();
      setLibrary(data.library);
      setSeries(data.series);
    } catch (err) {
      console.error("Error fetching library series:", err);
      setError(err instanceof Error ? err.message : "SERIES_FETCH_ERROR");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        {/* Section header avec titre + actions */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <OptimizedSkeleton className="h-8 w-64" />
            <div className="flex items-center gap-2">
              <OptimizedSkeleton className="h-5 w-48" />
              <OptimizedSkeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-full">
              <OptimizedSkeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <OptimizedSkeleton className="h-10 w-24" />
              <OptimizedSkeleton className="h-10 w-10 rounded" />
              <OptimizedSkeleton className="h-10 w-10 rounded" />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: effectivePageSize }).map((_, i) => (
            <OptimizedSkeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <OptimizedSkeleton className="h-5 w-32 order-2 sm:order-1" />
          <OptimizedSkeleton className="h-10 w-64 order-1 sm:order-2" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Section
          title={library?.name || t("series.empty")}
          actions={<RefreshButton libraryId={libraryId} refreshLibrary={handleRefresh} />}
        />
        <ErrorMessage errorCode={error} onRetry={handleRetry} />
      </Container>
    );
  }

  if (!library || !series) {
    return (
      <Container>
        <ErrorMessage errorCode="SERIES_FETCH_ERROR" onRetry={handleRetry} />
      </Container>
    );
  }

  return (
    <Container>
      <Section
        title={library.name}
        actions={
          <div className="flex items-center gap-2">
            {series.totalElements > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("series.display.showing", {
                  start: ((currentPage - 1) * effectivePageSize) + 1,
                  end: Math.min(currentPage * effectivePageSize, series.totalElements),
                  total: series.totalElements,
                })}
              </p>
            )}
            <RefreshButton libraryId={libraryId} refreshLibrary={handleRefresh} />
          </div>
        }
      />
      <PaginatedSeriesGrid
        series={series.content || []}
        currentPage={currentPage}
        totalPages={series.totalPages}
        totalElements={series.totalElements}
        defaultShowOnlyUnread={preferences.showOnlyUnread}
        showOnlyUnread={unreadOnly}
      />
    </Container>
  );
}
