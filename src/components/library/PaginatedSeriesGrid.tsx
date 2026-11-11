"use client";

import { SeriesGrid } from "./SeriesGrid";
import { SeriesList } from "./SeriesList";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import type { NormalizedSeries } from "@/lib/providers/types";
import { SearchInput } from "./SearchInput";
import { useTranslate } from "@/hooks/useTranslate";
import { usePaginatedGrid } from "@/hooks/usePaginatedGrid";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { ViewModeButton } from "@/components/common/ViewModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";
import { SortButton } from "@/components/common/SortButton";
import { MissingFilterButton } from "@/components/common/MissingFilterButton";

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
  canSortByRating?: boolean;
}

export function PaginatedSeriesGrid({
  series,
  currentPage,
  totalPages,
  totalElements,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
  pageSize,
  initialCompact,
  initialViewMode,
  sort: initialSort,
  hasMissing: initialHasMissing,
  canSortByRating = false,
}: PaginatedSeriesGridProps) {
  const {
    effectivePageSize,
    isCompact,
    viewMode,
    showOnlyUnread,
    isNavigating,
    gridRef,
    captureLayout,
    updateUrlParams,
    persistPreferences,
    handlePageChange,
    handlePageSizeChange,
    handleCompactModeToggle,
    handleViewModeToggle,
    handleUnreadFilter,
  } = usePaginatedGrid({
    contentKey: series.map((item) => item.id).join(","),
    showOnlyUnread: initialShowOnlyUnread,
    defaultShowOnlyUnread,
    pageSize: pageSize ?? 30,
    initialCompact,
    initialViewMode,
    viewModePreference: "viewMode",
  });

  const [currentSort, setCurrentSort] = useState(initialSort);
  const [showMissing, setShowMissing] = useState(initialHasMissing);
  const { t } = useTranslate();

  const handleMissingToggle = useCallback(async () => {
    captureLayout();
    const next = !showMissing;
    setShowMissing(next);
    await updateUrlParams({ page: "1", missing: next ? "true" : null });
    await persistPreferences({ showMissingBooks: next });
  }, [captureLayout, showMissing, updateUrlParams, persistPreferences]);

  const handleSortToggle = useCallback(async () => {
    captureLayout();
    // Cycle : title → latest → (community_score si Stripstream) → title
    const nextSort = (() => {
      if (currentSort === "title") return "latest";
      if (currentSort === "latest") return canSortByRating ? "community_score" : "title";
      // currentSort === "community_score"
      return "title";
    })();
    setCurrentSort(nextSort);
    await updateUrlParams({ page: "1", sort: nextSort === "title" ? null : nextSort });
    await persistPreferences({ defaultSortOrder: nextSort });
  }, [captureLayout, currentSort, canSortByRating, updateUrlParams, persistPreferences]);

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * effectivePageSize + 1;
  const endIndex = Math.min(currentPage * effectivePageSize, totalElements);

  const getShowingText = () => {
    if (!totalElements) return t("series.empty");

    return t("books.display.showing", {
      start: startIndex,
      end: endIndex,
      total: totalElements,
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-surface-1 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Explorer
            </p>
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Séries</h2>
          </div>
          <p className="text-sm text-muted-foreground">{getShowingText()}</p>
        </div>

        <div className="space-y-3">
          <SearchInput placeholder={t("series.filters.search")} testId="library-search" />

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
                isCompact={isCompact}
                onSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pendant la navigation, la grille s'atténue et recule un peu ; elle est
          remontée à chaque nouveau contenu, et toutes ses cartes rejouent leur
          entrée. */}
      <div
        ref={gridRef}
        aria-busy={isNavigating}
        className={cn(
          "transition-[opacity,scale] duration-300 ease-projection motion-reduce:transition-none",
          isNavigating && "pointer-events-none scale-[0.985] opacity-45"
        )}
      >
        {viewMode === "grid" ? (
          <SeriesGrid
            series={series}
            isCompact={isCompact}
            showRating={currentSort === "community_score"}
          />
        ) : (
          <SeriesList series={series} isCompact={isCompact} />
        )}
      </div>

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
