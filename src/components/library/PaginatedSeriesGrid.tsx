"use client";

import { SeriesGrid } from "./SeriesGrid";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { KomgaSeries } from "@/types/komga";
import { SearchInput } from "./SearchInput";
import { useTranslate } from "@/hooks/useTranslate";

interface PaginatedSeriesGridProps {
  series: KomgaSeries[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  defaultShowOnlyUnread: boolean;
  showOnlyUnread: boolean;
}

export function PaginatedSeriesGrid({
  series,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
}: PaginatedSeriesGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const { t } = useTranslate();

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
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      params.set("unread", "true");
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [defaultShowOnlyUnread, pathname, router, searchParams]);

  const handlePageChange = async (page: number) => {
    setIsChangingPage(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    params.set("unread", showOnlyUnread.toString());
    await router.push(`${pathname}?${params.toString()}`);
  };

  const handleUnreadFilter = async () => {
    setIsChangingPage(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    const newUnreadState = !showOnlyUnread;
    setShowOnlyUnread(newUnreadState);
    params.set("unread", newUnreadState.toString());

    await router.push(`${pathname}?${params.toString()}`);
  };

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1">
          <SearchInput placeholder={t("series.filters.search")} />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{getShowingText()}</p>
          <button
            onClick={handleUnreadFilter}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
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
          <SeriesGrid series={series} />
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
