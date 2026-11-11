"use client";

import { SeriesGrid } from "./SeriesGrid";
import { SeriesList } from "./SeriesList";
import { SearchInput } from "./SearchInput";
import { CollectionShell } from "@/components/common/CollectionShell";
import { useTranslate } from "@/hooks/useTranslate";
import { usePaginatedGrid } from "@/hooks/usePaginatedGrid";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { ViewModeButton } from "@/components/common/ViewModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";
import { SortButton } from "@/components/common/SortButton";
import { MissingFilterButton } from "@/components/common/MissingFilterButton";
import type { NormalizedSeries } from "@/lib/providers/types";

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
  search?: string;
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
  search: initialSearch = "",
}: PaginatedSeriesGridProps) {
  const { t } = useTranslate();
  const {
    effectivePageSize,
    isCompact,
    viewMode,
    showOnlyUnread,
    searchTerm,
    isSearchPending,
    sort,
    showMissing,
    isNavigating,
    gridRef,
    handlePageChange,
    handlePageSizeChange,
    handleCompactModeToggle,
    handleViewModeToggle,
    handleUnreadFilter,
    handleSearchChange,
    handleSortToggle,
    handleMissingToggle,
  } = usePaginatedGrid({
    contentKey: series.map((item) => item.id).join(","),
    showOnlyUnread: initialShowOnlyUnread,
    defaultShowOnlyUnread,
    pageSize: pageSize ?? 30,
    initialCompact,
    initialViewMode,
    viewModePreference: "viewMode",
    initialSearch,
    initialSort,
    canSortByRating,
    initialHasMissing,
  });

  return (
    <CollectionShell
      panel
      eyebrow={t("series.filters.explore")}
      title={t("series.filters.seriesTitle")}
      showingKey="series.display.showing"
      emptyText={t("series.empty")}
      pageKey="series.display.page"
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={effectivePageSize}
      totalElements={totalElements}
      busy={isNavigating}
      gridRef={gridRef}
      onPageChange={handlePageChange}
      search={
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          isPending={isSearchPending}
          placeholder={t("series.filters.search")}
          testId="library-search"
        />
      }
      toolbar={
        <>
          <SortButton sort={sort} onToggle={handleSortToggle} />
          <UnreadFilterButton
            showOnlyUnread={showOnlyUnread}
            onToggle={handleUnreadFilter}
          />
          <MissingFilterButton active={showMissing} onToggle={handleMissingToggle} />
          <ViewModeButton viewMode={viewMode} onToggle={handleViewModeToggle} />
          <CompactModeButton
            isCompact={isCompact}
            onToggle={handleCompactModeToggle}
          />
          <PageSizeSelect
            pageSize={effectivePageSize}
            isCompact={isCompact}
            onSizeChange={handlePageSizeChange}
          />
        </>
      }
    >
      {viewMode === "grid" ? (
        <SeriesGrid
          series={series}
          isCompact={isCompact}
          showRating={sort === "community_score"}
        />
      ) : (
        <SeriesList series={series} isCompact={isCompact} />
      )}
    </CollectionShell>
  );
}
