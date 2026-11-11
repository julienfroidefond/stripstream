"use client";

import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";
import { Pagination } from "@/components/ui/Pagination";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useCallback, useMemo } from "react";
import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";
import { useTranslate } from "@/hooks/useTranslate";
import { usePaginatedGrid } from "@/hooks/usePaginatedGrid";
import { usePreferences } from "@/contexts/PreferencesContext";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { ViewModeButton } from "@/components/common/ViewModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";
import { MissingFilterButton } from "@/components/common/MissingFilterButton";
import { splitBooksByVolumeType } from "./bookGrouping";

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
  const { preferences } = usePreferences();
  const { t } = useTranslate();
  const [hideMissing, setHideMissing] = useState(preferences.hideMissingBooks);

  const { regularBooks, specialBooks } = useMemo(() => splitBooksByVolumeType(books), [books]);

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
      seriesName: null,
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

  /** Identifie le contenu affiché : sa variation déclenche le glissement. */
  const contentKey = useMemo(() => displayBooks.map((book) => book.id).join(","), [displayBooks]);

  const {
    effectivePageSize,
    isCompact,
    viewMode,
    showOnlyUnread,
    isNavigating,
    gridRef,
    captureLayout,
    persistPreferences,
    handlePageChange,
    handlePageSizeChange,
    handleCompactModeToggle,
    handleViewModeToggle,
    handleUnreadFilter,
  } = usePaginatedGrid({
    contentKey,
    showOnlyUnread: initialShowOnlyUnread,
    defaultShowOnlyUnread,
    pageSize,
    initialCompact,
    initialViewMode,
    viewModePreference: "booksViewMode",
  });

  const handleBookClick = useCallback(
    (book: NormalizedBook) => {
      router.push(`/books/${book.id}`);
    },
    [router]
  );

  const toggleHideMissing = useCallback(() => {
    captureLayout();
    const next = !hideMissing;
    setHideMissing(next);
    // Hors de l'updater de `setHideMissing` : React l'exécute pendant le rendu,
    // et la server action met à jour le routeur (« Cannot update a component
    // while rendering a different component »).
    void persistPreferences({ hideMissingBooks: next });
  }, [captureLayout, hideMissing, persistPreferences]);

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
      </div>

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
