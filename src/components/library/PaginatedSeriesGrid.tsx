"use client";

import { SeriesGrid } from "./SeriesGrid";
import { SeriesList } from "./SeriesList";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { SearchInput } from "./SearchInput";
import { useTranslate } from "@/hooks/useTranslate";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { ViewModeButton } from "@/components/common/ViewModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";
import { SortButton } from "@/components/common/SortButton";
import { MissingFilterButton } from "@/components/common/MissingFilterButton";
import { updatePreferences as updatePreferencesAction } from "@/app/actions/preferences";

interface PaginatedSeriesGridProps {
  series: NormalizedSeries[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  defaultShowOnlyUnread: boolean;
  showOnlyUnread: boolean;
  pageSize?: number;
  initialCompact: boolean;
  initialViewMode: "grid" | "list";
  sort: string;
  hasMissing: boolean;
}

export function PaginatedSeriesGrid({
  series,
  currentPage,
  totalPages,
  totalElements: _totalElements,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
  pageSize,
  initialCompact,
  initialViewMode,
  sort: initialSort,
  hasMissing: initialHasMissing,
}: PaginatedSeriesGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const [isCompact, setIsCompact] = useState(initialCompact);
  const [viewMode, setViewMode] = useState<"grid" | "list">(initialViewMode);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize || 20);
  const [currentSort, setCurrentSort] = useState(initialSort);
  const [showMissing, setShowMissing] = useState(initialHasMissing);

  const effectivePageSize = pageSize || currentPageSize;
  const { t } = useTranslate();

  const persistPreferences = useCallback(async (payload: Parameters<typeof updatePreferencesAction>[0]) => {
    try {
      await updatePreferencesAction(payload);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des préférences:", error);
    }
  }, []);

  const updateUrlParams = useCallback(
    async (updates: Record<string, string | null>, replace: boolean = false) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      if (replace) {
        await router.replace(`${pathname}?${params.toString()}`);
      } else {
        await router.push(`${pathname}?${params.toString()}`);
      }
    },
    [router, pathname, searchParams]
  );

  // Update local state when prop changes
  useEffect(() => {
    setShowOnlyUnread(initialShowOnlyUnread);
  }, [initialShowOnlyUnread]);

  useEffect(() => {
    setIsCompact(initialCompact);
  }, [initialCompact]);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  useEffect(() => {
    setCurrentPageSize(pageSize || 20);
  }, [pageSize]);

  // Apply default filter on initial load
  useEffect(() => {
    if (defaultShowOnlyUnread && !searchParams.has("unread")) {
      updateUrlParams({ page: "1", unread: "true" }, true);
    }
  }, [defaultShowOnlyUnread, pathname, router, searchParams, updateUrlParams]);

  const handlePageChange = async (page: number) => {
    await updateUrlParams({ page: page.toString() });
  };

  const handleUnreadFilter = async () => {
    const newUnreadState = !showOnlyUnread;
    setShowOnlyUnread(newUnreadState);
    await updateUrlParams({ page: "1", unread: newUnreadState ? "true" : "false" });
    await persistPreferences({ showOnlyUnread: newUnreadState });
  };

  const handlePageSizeChange = async (size: number) => {
    setCurrentPageSize(size);
    await updateUrlParams({ page: "1", size: size.toString() });

    await persistPreferences({
      displayMode: {
        compact: isCompact,
        itemsPerPage: size,
        viewMode,
      },
    });
  };

  const handleCompactModeToggle = async (nextCompactMode: boolean) => {
    setIsCompact(nextCompactMode);

    await persistPreferences({
      displayMode: {
        compact: nextCompactMode,
        itemsPerPage: effectivePageSize,
        viewMode,
      },
    });
  };

  const handleMissingToggle = async () => {
    const next = !showMissing;
    setShowMissing(next);
    await updateUrlParams({ page: "1", missing: next ? "true" : null });
  };

  const handleSortToggle = async () => {
    const nextSort = currentSort === "title" ? "latest" : "title";
    setCurrentSort(nextSort);
    await updateUrlParams({ page: "1", sort: nextSort === "title" ? null : nextSort });
  };

  const handleViewModeToggle = async (nextViewMode: "grid" | "list") => {
    setViewMode(nextViewMode);

    await persistPreferences({
      displayMode: {
        compact: isCompact,
        itemsPerPage: effectivePageSize,
        viewMode: nextViewMode,
      },
    });
  };

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * effectivePageSize + 1;
  const endIndex = Math.min(currentPage * effectivePageSize, _totalElements);

  const getShowingText = () => {
    if (!_totalElements) return t("series.empty");

    return t("books.display.showing", {
      start: startIndex,
      end: endIndex,
      total: _totalElements,
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/60 bg-[linear-gradient(140deg,hsl(var(--background)/0.6),hsl(var(--background)/0.38))] p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Explorer
            </p>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Séries</h2>
          </div>
          <p className="text-sm text-muted-foreground">{getShowingText()}</p>
        </div>

        <div className="space-y-3">
          <SearchInput placeholder={t("series.filters.search")} />

          <div className="pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <SortButton
                sort={currentSort}
                onToggle={handleSortToggle}
              />
              <UnreadFilterButton
                showOnlyUnread={showOnlyUnread}
                onToggle={handleUnreadFilter}
              />
              <MissingFilterButton
                active={showMissing}
                onToggle={handleMissingToggle}
              />
              <ViewModeButton
                viewMode={viewMode}
                onToggle={handleViewModeToggle}
              />
              <CompactModeButton
                isCompact={isCompact}
                onToggle={handleCompactModeToggle}
              />
              <PageSizeSelect
                pageSize={effectivePageSize}
                onSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <SeriesGrid series={series} isCompact={isCompact} />
      ) : (
        <SeriesList series={series} isCompact={isCompact} />
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground order-2 sm:order-1">
          {t("series.display.page", { current: currentPage, total: totalPages })}
        </p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="order-1 sm:order-2"
        />
      </div>
    </div>
  );
}
