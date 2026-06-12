"use client";

import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { Container } from "@/components/ui/container";
import { RelatedSeriesRow } from "@/components/series/RelatedSeriesRow";
import { useRefresh } from "@/contexts/RefreshContext";
import type { NormalizedBooksPage, NormalizedMissingBook, NormalizedSeries } from "@/lib/providers/types";
import type { UserPreferences } from "@/types/preferences";

interface SeriesContentProps {
  series: NormalizedSeries;
  books: NormalizedBooksPage;
  currentPage: number;
  preferences: UserPreferences;
  unreadOnly: boolean;
  pageSize: number;
  initialIsFavorite: boolean;
  missingBooks: NormalizedMissingBook[];
  relatedSeries?: NormalizedSeries[];
}

export function SeriesContent({
  series,
  books,
  currentPage,
  preferences,
  unreadOnly,
  pageSize,
  initialIsFavorite,
  missingBooks,
  relatedSeries = [],
}: SeriesContentProps) {
  const { refreshSeries } = useRefresh();

  return (
    <>
      <SeriesHeader
        series={series}
        refreshSeries={refreshSeries || (async () => ({ success: false }))}
        initialIsFavorite={initialIsFavorite}
      />
      <Container>
        <PaginatedBookGrid
          books={books.items}
          currentPage={currentPage}
          totalPages={books.totalPages ?? 1}
          totalElements={books.totalElements ?? books.items.length}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
          pageSize={pageSize}
          initialCompact={preferences.displayMode.compact}
          initialViewMode={preferences.displayMode.viewMode || "grid"}
          missingBooks={missingBooks}
        />
        {relatedSeries.length > 0 && (
          <div className="mt-10 pb-4">
            <RelatedSeriesRow series={relatedSeries} />
          </div>
        )}
      </Container>
    </>
  );
}
