"use client";

import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { Container } from "@/components/ui/container";
import { useRefresh } from "@/contexts/RefreshContext";
import type { LibraryResponse } from "@/types/library";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import type { UserPreferences } from "@/types/preferences";

interface SeriesContentProps {
  series: KomgaSeries;
  books: LibraryResponse<KomgaBook>;
  currentPage: number;
  preferences: UserPreferences;
  unreadOnly: boolean;
  pageSize: number;
}

export function SeriesContent({
  series,
  books,
  currentPage,
  preferences,
  unreadOnly,
}: SeriesContentProps) {
  const { refreshSeries } = useRefresh();

  return (
    <>
      <SeriesHeader
        series={series}
        refreshSeries={refreshSeries || (async () => ({ success: false }))}
      />
      <Container>
        <PaginatedBookGrid
          books={books.content || []}
          currentPage={currentPage}
          totalPages={books.totalPages}
          totalElements={books.totalElements}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
        />
      </Container>
    </>
  );
}

