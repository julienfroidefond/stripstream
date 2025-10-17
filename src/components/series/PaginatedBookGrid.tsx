"use client";

import { BookGrid } from "./BookGrid";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KomgaBook } from "@/types/komga";
import { useTranslate } from "@/hooks/useTranslate";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";

interface PaginatedBookGridProps {
  books: KomgaBook[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  defaultShowOnlyUnread: boolean;
  showOnlyUnread: boolean;
}

export function PaginatedBookGrid({
  books,
  currentPage,
  totalPages,
  totalElements,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
}: PaginatedBookGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const { isCompact, itemsPerPage } = useDisplayPreferences();
  const { t } = useTranslate();

  const updateUrlParams = useCallback(async (
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
  }, [router, pathname, searchParams]);

  // Reset loading state when books change
  useEffect(() => {
    setIsChangingPage(false);
  }, [books]);

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

  const handleBookClick = (book: KomgaBook) => {
    router.push(`/books/${book.id}`);
  };

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalElements);

  const getShowingText = () => {
    if (!totalElements) return t("books.empty");

    return t("books.display.showing", {
      start: startIndex,
      end: endIndex,
      total: totalElements,
    });
  };

  return (
    <div className="space-y-8 py-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-right">{getShowingText()}</p>
        <div className="flex items-center justify-end gap-2">
          <PageSizeSelect onSizeChange={handlePageSizeChange} />
          <CompactModeButton onToggle={handleCompactToggle} />
          <UnreadFilterButton showOnlyUnread={showOnlyUnread} onToggle={handleUnreadFilter} />
        </div>
      </div>

      <div className="relative">
        {/* Loading indicator */}
        {isChangingPage && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/70 backdrop-blur-md border shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("books.loading")}</span>
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
          <BookGrid books={books} onBookClick={handleBookClick} isCompact={isCompact} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground order-2 sm:order-1">
          {t("books.display.page", { current: currentPage, total: totalPages })}
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
