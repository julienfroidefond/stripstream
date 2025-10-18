"use client";

import { SeriesGrid } from "./SeriesGrid";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import type { KomgaSeries } from "@/types/komga";
import { SearchInput } from "./SearchInput";
import { useTranslate } from "@/hooks/useTranslate";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";

interface PaginatedSeriesGridProps {
  series: KomgaSeries[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  defaultShowOnlyUnread: boolean;
  showOnlyUnread: boolean;
  pageSize?: number;
}

export function PaginatedSeriesGrid({
  series,
  currentPage,
  totalPages,
  totalElements: _totalElements,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
  pageSize,
}: PaginatedSeriesGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const { isCompact, itemsPerPage: displayItemsPerPage } = useDisplayPreferences();
  
  // Utiliser la taille de page effective (depuis l'URL ou les préférences)
  const effectivePageSize = pageSize || displayItemsPerPage;
  const { t } = useTranslate();

  const updateUrlParams = useCallback(async (
    updates: Record<string, string | null>,
    replace: boolean = false
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
      await router.replace(`${pathname}?${params.toString()}`);
    } else {
      await router.push(`${pathname}?${params.toString()}`);
    }
  }, [router, pathname, searchParams]);

  // Update local state when prop changes
  useEffect(() => {
    setShowOnlyUnread(initialShowOnlyUnread);
  }, [initialShowOnlyUnread]);

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
    await updateUrlParams({
      page: "1",
      unread: newUnreadState ? "true" : "false",
    });
  };

  const handleCompactToggle = async (newCompactState: boolean) => {
    await updateUrlParams({
      page: "1",
      compact: newCompactState.toString(),
    });
  };

  const handlePageSizeChange = async (size: number) => {
    await updateUrlParams({
      page: "1",
      size: size.toString(),
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
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-right">{getShowingText()}</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-full">
            <SearchInput placeholder={t("series.filters.search")} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <PageSizeSelect onSizeChange={handlePageSizeChange} />
            <CompactModeButton onToggle={handleCompactToggle} />
            <UnreadFilterButton showOnlyUnread={showOnlyUnread} onToggle={handleUnreadFilter} />
          </div>
        </div>
      </div>

      <SeriesGrid series={series} isCompact={isCompact} />

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
