"use client";

import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";
import { useTranslate } from "@/hooks/useTranslate";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { usePreferences } from "@/contexts/PreferencesContext";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { ViewModeButton } from "@/components/common/ViewModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";
import { MissingFilterButton } from "@/components/common/MissingFilterButton";
import { normalizeGridPageSize } from "@/lib/pageSize";

interface PaginatedBookGridProps {
  books: NormalizedBook[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  defaultShowOnlyUnread: boolean;
  showOnlyUnread: boolean;
  pageSize: number;
  initialCompact: boolean;
  initialViewMode: "grid" | "list";
  onRefresh?: () => void;
  missingBooks?: NormalizedMissingBook[];
}

export function PaginatedBookGrid({
  books,
  currentPage,
  totalPages,
  totalElements,
  defaultShowOnlyUnread,
  showOnlyUnread: initialShowOnlyUnread,
  pageSize,
  initialCompact,
  initialViewMode,
  onRefresh,
  missingBooks = [],
}: PaginatedBookGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showOnlyUnread, setShowOnlyUnread] = useState(initialShowOnlyUnread);
  const {
    itemsPerPage: preferenceItemsPerPage,
    handlePageSizeChange: persistPageSizeChange,
    handleViewModeToggle: persistViewModeToggle,
  } = useDisplayPreferences();
  const { preferences, updatePreferences } = usePreferences();
  const { t } = useTranslate();
  const [isCompact, setIsCompact] = useState(initialCompact);
  const [viewMode, setViewMode] = useState<"grid" | "list">(initialViewMode);
  const [hideMissing, setHideMissing] = useState(preferences.hideMissingBooks);
  const effectivePageSize = normalizeGridPageSize(pageSize || preferenceItemsPerPage, isCompact);

  const toggleHideMissing = useCallback(() => {
    setHideMissing((prev) => {
      const next = !prev;
      updatePreferences({ hideMissingBooks: next }).catch((_err: unknown) => undefined);
      return next;
    });
  }, [updatePreferences]);

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
        await router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      } else {
        await router.push(`${pathname}?${params.toString()}`, { scroll: false });
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
    const newUnreadState = !showOnlyUnread;
    setShowOnlyUnread(newUnreadState);
    await updateUrlParams({
      page: "1",
      unread: newUnreadState ? "true" : "false",
    });
    // Sauvegarder la préférence dans la base de données
    try {
      await updatePreferences({ showOnlyUnread: newUnreadState });
    } catch (error) {
      // Log l'erreur mais ne bloque pas l'utilisateur
      console.error("Erreur lors de la sauvegarde de la préférence:", error);
    }
  }, [showOnlyUnread, updateUrlParams, updatePreferences]);

  const handlePageSizeChange = useCallback(
    async (size: number) => {
      const nextSize = normalizeGridPageSize(size, isCompact);
      await persistPageSizeChange(nextSize);
      await updateUrlParams({ page: "1", size: nextSize.toString() });
    },
    [isCompact, persistPageSizeChange, updateUrlParams]
  );

  const handleCompactModeToggle = useCallback(
    async (nextCompactMode: boolean) => {
      setIsCompact(nextCompactMode);

      const nextSize = normalizeGridPageSize(effectivePageSize, nextCompactMode);
      await updatePreferences({
        displayMode: {
          ...preferences.displayMode,
          compact: nextCompactMode,
          itemsPerPage: nextSize,
          viewMode,
        },
      });

      if (nextSize !== effectivePageSize) {
        await updateUrlParams({ page: "1", size: nextSize.toString() });
      }
    },
    [effectivePageSize, preferences.displayMode, viewMode, updateUrlParams, updatePreferences]
  );

  const handleViewModeToggle = useCallback(
    async (nextViewMode: "grid" | "list") => {
      setViewMode(nextViewMode);
      await persistViewModeToggle(nextViewMode);
    },
    [persistViewModeToggle]
  );

  const handleBookClick = useCallback(
    (book: NormalizedBook) => {
      router.push(`/books/${book.id}`);
    },
    [router]
  );

  const { regularBooks, specialBooks } = useMemo(() => {
    const regular: NormalizedBook[] = [];
    const special: NormalizedBook[] = [];
    for (const book of books) {
      if (book.volumeType && book.volumeType !== "regular") {
        special.push(book);
      } else {
        regular.push(book);
      }
    }
    return { regularBooks: regular, specialBooks: special };
  }, [books]);

  // Merge missing books into regular books as placeholders, sorted by volume number
  const displayBooks = useMemo(() => {
    if (hideMissing || missingBooks.length === 0) return regularBooks;

    // Convert missing books to placeholder NormalizedBook entries
    const missingAsBooks: NormalizedBook[] = missingBooks.map((mb) => ({
      id: `missing-${mb.volumeNumber}`,
      libraryId: "",
      title: mb.title,
      number: String(mb.volumeNumber),
      seriesId: null,
      volume: mb.volumeNumber,
      pageCount: 0,
      thumbnailUrl: mb.coverUrl ?? "",
      readProgress: null,
      volumeType: "_missing",
    }));

    // Merge and sort by volume number
    const merged = [...regularBooks, ...missingAsBooks];
    merged.sort((a, b) => {
      const va = a.volume ?? Infinity;
      const vb = b.volume ?? Infinity;
      return va - vb;
    });
    return merged;
  }, [regularBooks, missingBooks, hideMissing]);

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * effectivePageSize + 1;
  const endIndex = Math.min(currentPage * effectivePageSize, totalElements);

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
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <PageSizeSelect
            pageSize={effectivePageSize}
            isCompact={isCompact}
            onSizeChange={handlePageSizeChange}
          />
          <ViewModeButton viewMode={viewMode} onToggle={handleViewModeToggle} />
          <CompactModeButton isCompact={isCompact} onToggle={handleCompactModeToggle} />
          <UnreadFilterButton showOnlyUnread={showOnlyUnread} onToggle={handleUnreadFilter} />
          {missingBooks.length > 0 && (
            <MissingFilterButton active={hideMissing} onToggle={toggleHideMissing} />
          )}
        </div>
      </div>

      {viewMode === "grid" ? (
        <BookGrid
          books={displayBooks}
          onBookClick={handleBookClick}
          isCompact={isCompact}
          onRefresh={onRefresh}
        />
      ) : (
        <BookList
          books={displayBooks}
          onBookClick={handleBookClick}
          isCompact={isCompact}
          onRefresh={onRefresh}
        />
      )}

      {specialBooks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">{t("books.special")}</h3>
          {viewMode === "grid" ? (
            <BookGrid
              books={specialBooks}
              onBookClick={handleBookClick}
              isCompact={isCompact}
              onRefresh={onRefresh}
            />
          ) : (
            <BookList
              books={specialBooks}
              onBookClick={handleBookClick}
              isCompact={isCompact}
              onRefresh={onRefresh}
            />
          )}
        </div>
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
