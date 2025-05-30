"use client";

import { SeriesGrid } from "./SeriesGrid";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const { isCompact, itemsPerPage } = useDisplayPreferences();
  const { t } = useTranslate();

  const updateUrlParams = async (
    updates: Record<string, string | null>,
    replace: boolean = false
  ) => {
    setIsChangingPage(true);
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
      updateUrlParams({ page: "1", unread: "true" }, true);
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
