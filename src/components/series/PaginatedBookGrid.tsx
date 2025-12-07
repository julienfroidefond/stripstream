"use client";

import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import type { KomgaBook } from "@/types/komga";
import { useTranslate } from "@/hooks/useTranslate";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { ViewModeButton } from "@/components/common/ViewModeButton";
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
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const { isCompact, itemsPerPage, viewMode } = useDisplayPreferences();
  const { t } = useTranslate();

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
          <ViewModeButton />
          <CompactModeButton />
          <UnreadFilterButton showOnlyUnread={showOnlyUnread} onToggle={handleUnreadFilter} />
        </div>
      </div>

      {viewMode === "grid" ? (
        <BookGrid books={books} onBookClick={handleBookClick} isCompact={isCompact} />
      ) : (
        <BookList books={books} onBookClick={handleBookClick} isCompact={isCompact} />
      )}

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
