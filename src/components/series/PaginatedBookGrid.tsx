"use client";

import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";
import { CollectionShell } from "@/components/common/CollectionShell";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { NormalizedBook, NormalizedMissingBook } from "@/lib/providers/types";
import { useTranslate } from "@/hooks/useTranslate";
import { usePaginatedGrid } from "@/hooks/usePaginatedGrid";
import { usePreferences } from "@/contexts/PreferencesContext";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { CompactModeButton } from "@/components/common/CompactModeButton";
import { ViewModeButton } from "@/components/common/ViewModeButton";
import { UnreadFilterButton } from "@/components/common/UnreadFilterButton";
import { MissingFilterButton } from "@/components/common/MissingFilterButton";
import { mergeMissingBooks, splitBooksByVolumeType, toDisplayBooks } from "./bookGrouping";

const NO_MISSING_BOOKS: NormalizedMissingBook[] = [];

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
  missingBooks?: NormalizedMissingBook[];
  /** Montre le bouton « masquer les manquants » : vrai pour toute la série. */
  hasMissingBooks?: boolean;
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
  missingBooks = NO_MISSING_BOOKS,
  hasMissingBooks = missingBooks.length > 0,
}: PaginatedBookGridProps) {
  const router = useRouter();
  const { preferences } = usePreferences();
  const { t } = useTranslate();

  const { regularBooks, specialBooks } = useMemo(() => splitBooksByVolumeType(books), [books]);
  const specialItems = useMemo(() => toDisplayBooks(specialBooks), [specialBooks]);

  /**
   * Identifie le contenu serveur : sa variation déclenche le glissement. Le
   * masquage local des manquants est ajouté à la clé par le contrôleur.
   */
  const contentKey = useMemo(
    () =>
      [
        ...books.map((book) => book.id),
        ...missingBooks.map((missing) => `missing-${missing.volumeNumber}`),
      ].join(","),
    [books, missingBooks]
  );

  const {
    effectivePageSize,
    isCompact,
    viewMode,
    showOnlyUnread,
    hideMissingBooks,
    isNavigating,
    gridRef,
    handlePageChange,
    handlePageSizeChange,
    handleCompactModeToggle,
    handleViewModeToggle,
    handleUnreadFilter,
    handleHideMissingToggle,
  } = usePaginatedGrid({
    contentKey,
    showOnlyUnread: initialShowOnlyUnread,
    defaultShowOnlyUnread,
    pageSize,
    initialCompact,
    initialViewMode,
    viewModePreference: "booksViewMode",
    initialHideMissingBooks: preferences.hideMissingBooks,
  });

  const displayBooks = useMemo(
    () => mergeMissingBooks(regularBooks, hideMissingBooks ? [] : missingBooks),
    [regularBooks, missingBooks, hideMissingBooks]
  );

  const handleBookClick = useCallback(
    (book: NormalizedBook) => {
      router.push(`/books/${book.id}`);
    },
    [router]
  );

  const specialBooksSection =
    specialBooks.length > 0 ? (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-muted-foreground">{t("books.special")}</h3>
        {viewMode === "grid" ? (
          <BookGrid
            books={specialItems}
            onBookClick={handleBookClick}
            isCompact={isCompact}
          />
        ) : (
          <BookList
            books={specialItems}
            onBookClick={handleBookClick}
            isCompact={isCompact}
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
          {hasMissingBooks && (
            <MissingFilterButton active={hideMissingBooks} onToggle={handleHideMissingToggle} />
          )}
        </>
      }
    >
      {viewMode === "grid" ? (
        <BookGrid
          books={displayBooks}
          onBookClick={handleBookClick}
          isCompact={isCompact}
        />
      ) : (
        <BookList
          books={displayBooks}
          onBookClick={handleBookClick}
          isCompact={isCompact}
        />
      )}
    </CollectionShell>
  );
}
