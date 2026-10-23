"use client";

import { SeriesGrid } from "./SeriesGrid";
import { SeriesList } from "./SeriesList";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGridFlip, useGridFlipPlayback } from "@/components/motion";
import { useState, useEffect, useCallback, useRef, useTransition } from "react";
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
import { normalizeGridPageSize } from "@/lib/pageSize";

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
  totalElements: _totalElements,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
  pageSize,
  initialCompact,
  initialViewMode,
  sort: initialSort,
  hasMissing: initialHasMissing,
  canSortByRating = false,
}: PaginatedSeriesGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const [isCompact, setIsCompact] = useState(initialCompact);
  const [viewMode, setViewMode] = useState<"grid" | "list">(initialViewMode);
  const [currentPageSize, setCurrentPageSize] = useState(
    normalizeGridPageSize(pageSize || 30, initialCompact)
  );
  const [currentSort, setCurrentSort] = useState(initialSort);
  const [showMissing, setShowMissing] = useState(initialHasMissing);

  const effectivePageSize = normalizeGridPageSize(pageSize || currentPageSize, isCompact);
  const { t } = useTranslate();

  const persistPreferences = useCallback(async (payload: Parameters<typeof updatePreferencesAction>[0]) => {
    try {
      await updatePreferencesAction(payload);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des préférences:", error);
    }
  }, []);

  // La grille reste en place, atténuée, le temps que la nouvelle page arrive.
  const [isNavigating, startNavigation] = useTransition();
  /** Change avec le contenu affiché : la grille est alors remontée. */
  const gridKey = series.map((item) => item.id).join(",");
  // Compact, tri, filtres : les cartes glissent vers leur nouvelle place.
  const gridRef = useRef<HTMLDivElement>(null);
  const gridFlip = useGridFlip(gridRef);
  const captureLayout = gridFlip.capture;
  useGridFlipPlayback(gridFlip, `${isCompact ? "compact" : "full"}:${gridKey}`);

  const updateUrlParams = useCallback(
    async (
      updates: Record<string, string | null>,
      replace: boolean = false,
      { dim = true }: { dim?: boolean } = {}
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      if (replace) {
        await router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      } else {
        const navigate = () => router.push(`${pathname}?${params.toString()}`, { scroll: false });
        // La grille ne s'atténue que si son contenu va être remplacé ; un
        // changement de mise en page (compact, taille) glisse directement.
        if (dim) startNavigation(navigate);
        else navigate();
      }
    },
    [router, pathname, searchParams]
  );

  // Apply default filter on initial load
  useEffect(() => {
    if (defaultShowOnlyUnread && !searchParams.has("unread")) {
      updateUrlParams({ page: "1", unread: "true" }, true);
    }
  }, [defaultShowOnlyUnread, pathname, router, searchParams, updateUrlParams]);

  const handlePageChange = useCallback(
    async (page: number) => {
      await updateUrlParams({ page: page.toString() });
    },
    [updateUrlParams]
  );

  const handleUnreadFilter = useCallback(async () => {
    captureLayout();
    const newUnreadState = !showOnlyUnread;
    setShowOnlyUnread(newUnreadState);
    await updateUrlParams({ page: "1", unread: newUnreadState ? "true" : "false" });
    await persistPreferences({ showOnlyUnread: newUnreadState });
  }, [captureLayout, showOnlyUnread, updateUrlParams, persistPreferences]);

  const handlePageSizeChange = useCallback(
    async (size: number) => {
      captureLayout();
      const nextSize = normalizeGridPageSize(size, isCompact);
      setCurrentPageSize(nextSize);
      await updateUrlParams({ page: "1", size: nextSize.toString() }, false, { dim: false });

      await persistPreferences({
        displayMode: {
          compact: isCompact,
          itemsPerPage: nextSize,
          viewMode,
        },
      });
    },
    [captureLayout, isCompact, updateUrlParams, persistPreferences, viewMode]
  );

  const handleCompactModeToggle = useCallback(
    async (nextCompactMode: boolean) => {
      captureLayout();
      setIsCompact(nextCompactMode);
      const nextSize = normalizeGridPageSize(effectivePageSize, nextCompactMode);
      setCurrentPageSize(nextSize);

      if (nextSize !== effectivePageSize) {
        await updateUrlParams({ page: "1", size: nextSize.toString() }, false, { dim: false });
      }

      await persistPreferences({
        displayMode: {
          compact: nextCompactMode,
          itemsPerPage: nextSize,
          viewMode,
        },
      });
    },
    [captureLayout, effectivePageSize, updateUrlParams, persistPreferences, viewMode]
  );

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
    await persistPreferences({ defaultSortOrder: nextSort as "title" | "latest" | "community_score" });
  }, [captureLayout, currentSort, canSortByRating, updateUrlParams, persistPreferences]);

  const handleViewModeToggle = useCallback(
    async (nextViewMode: "grid" | "list") => {
      setViewMode(nextViewMode);

      await persistPreferences({
        displayMode: {
          compact: isCompact,
          itemsPerPage: effectivePageSize,
          viewMode: nextViewMode,
        },
      });
    },
    [isCompact, effectivePageSize, persistPreferences]
  );

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
