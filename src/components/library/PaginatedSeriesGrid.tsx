"use client";

import { SeriesGrid } from "./SeriesGrid";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Filter, LayoutGrid, LayoutList, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KomgaSeries } from "@/types/komga";
import { SearchInput } from "./SearchInput";
import { useTranslate } from "@/hooks/useTranslate";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginatedSeriesGridProps {
  series: KomgaSeries[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  defaultShowOnlyUnread: boolean;
  showOnlyUnread: boolean;
}

export function PaginatedSeriesGrid({
  series,
  currentPage,
  totalPages,
  totalElements,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
}: PaginatedSeriesGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const { isCompact, itemsPerPage, handleCompactToggle, handlePageSizeChange } =
    useDisplayPreferences();
  const { t } = useTranslate();

  const updateUrlParams = async (updates: Record<string, string | null>) => {
    setIsChangingPage(true);
    const params = new URLSearchParams(searchParams.toString());

    // Mettre à jour les paramètres
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    await router.push(`${pathname}?${params.toString()}`);
  };

  // Reset loading state when series change
  useEffect(() => {
    setIsChangingPage(false);
  }, [series]);

  // Update local state when prop changes
  useEffect(() => {
    setShowOnlyUnread(initialShowOnlyUnread);
  }, [initialShowOnlyUnread]);

  // Apply default filter on initial load
  useEffect(() => {
    if (defaultShowOnlyUnread && !searchParams.has("unread")) {
      updateUrlParams({ page: "1", unread: "true" });
    }
  }, [defaultShowOnlyUnread, pathname, router, searchParams]);

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

  const handleCompactToggleClick = async () => {
    const newCompactState = !isCompact;
    await handleCompactToggle(newCompactState);
    await updateUrlParams({
      page: "1",
      compact: newCompactState.toString(),
    });
  };

  const handlePageSizeChangeClick = async (value: string) => {
    const size = parseInt(value);
    await handlePageSizeChange(size);
    await updateUrlParams({
      page: "1",
      size: value,
    });
  };

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalElements);

  const getShowingText = () => {
    if (!totalElements) return t("series.empty");

    return t("series.display.showing", {
      start: startIndex,
      end: endIndex,
      total: totalElements,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="w-full sm:w-auto sm:flex-1">
          <SearchInput placeholder={t("series.filters.search")} />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{getShowingText()}</p>
          <Select value={itemsPerPage.toString()} onValueChange={handlePageSizeChangeClick}>
            <SelectTrigger className="w-[80px]">
              <LayoutList className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={handleCompactToggleClick}
            className="inline-flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
          >
            {isCompact ? (
              <>
                <LayoutTemplate className="h-4 w-4" />
                {t("series.filters.normal")}
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                {t("series.filters.compact")}
              </>
            )}
          </button>
          <button
            onClick={handleUnreadFilter}
            className="inline-flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
          >
            <Filter className="h-4 w-4" />
            {showOnlyUnread ? t("series.filters.showAll") : t("series.filters.unread")}
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Loading indicator */}
        {isChangingPage && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("sidebar.libraries.loading")}</span>
            </div>
          </div>
        )}

        {/* Grid with transition animation */}
        <div
          className={cn(
            "transition-opacity duration-200",
            isChangingPage ? "opacity-25" : "opacity-100"
          )}
        >
          <SeriesGrid series={series} isCompact={isCompact} />
        </div>
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
