"use client";

import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { Container } from "@/components/ui/container";
import { useRefresh } from "@/contexts/RefreshContext";
import type { NormalizedBooksPage, NormalizedSeries } from "@/lib/providers/types";
import type { UserPreferences } from "@/types/preferences";

interface SeriesContentProps {
  series: NormalizedSeries;
  books: NormalizedBooksPage;
  currentPage: number;
  preferences: UserPreferences;
  unreadOnly: boolean;
  pageSize: number;
  initialIsFavorite: boolean;
}

export function SeriesContent({
  series,
  books,
  currentPage,
  preferences,
  unreadOnly,
  initialIsFavorite,
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
        />
      </Container>
    </>
  );
}
