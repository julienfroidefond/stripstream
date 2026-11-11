"use client";

import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";
import { CollectionShell } from "@/components/common/CollectionShell";
import { useRouter } from "next/navigation";
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

  const specialBooksSection =
    specialBooks.length > 0 ? (
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
    ) : null;

  return (
    <CollectionShell
      className="py-8"
      toolbarAlign="end"
      showingKey="books.display.showing"
      emptyText={t("books.empty")}
      pageKey="books.display.page"
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={effectivePageSize}
      totalElements={totalElements}
      busy={isNavigating}
      gridRef={gridRef}
      onPageChange={handlePageChange}
      footer={specialBooksSection}
      toolbar={
        <>
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
        </>
      }
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
    </CollectionShell>
  );
}
