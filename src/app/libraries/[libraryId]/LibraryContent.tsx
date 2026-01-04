"use client";

import { LibraryHeader } from "@/components/library/LibraryHeader";
import { PaginatedSeriesGrid } from "@/components/library/PaginatedSeriesGrid";
import { Container } from "@/components/ui/container";
import { useRefresh } from "@/contexts/RefreshContext";
import type { KomgaLibrary } from "@/types/komga";
import type { LibraryResponse } from "@/types/library";
import type { Series } from "@/types/series";
import type { UserPreferences } from "@/types/preferences";

interface LibraryContentProps {
  library: KomgaLibrary;
  series: LibraryResponse<Series>;
  currentPage: number;
  preferences: UserPreferences;
  unreadOnly: boolean;
  search?: string;
  pageSize: number;
}

export function LibraryContent({
  library,
  series,
  currentPage,
  preferences,
  unreadOnly,
  pageSize,
}: LibraryContentProps) {
  const { refreshLibrary } = useRefresh();

  return (
    <>
      <LibraryHeader
        library={library}
        seriesCount={series.totalElements}
        series={series.content || []}
        refreshLibrary={refreshLibrary || (async () => ({ success: false }))}
      />
      <Container>
        <PaginatedSeriesGrid
          series={series.content || []}
          currentPage={currentPage}
          totalPages={series.totalPages}
          totalElements={series.totalElements}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
          pageSize={pageSize}
        />
      </Container>
    </>
  );
}
