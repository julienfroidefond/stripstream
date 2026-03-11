import { LibraryHeader } from "@/components/library/LibraryHeader";
import { PaginatedSeriesGrid } from "@/components/library/PaginatedSeriesGrid";
import { Container } from "@/components/ui/container";
import type { NormalizedLibrary, NormalizedSeriesPage } from "@/lib/providers/types";
import type { UserPreferences } from "@/types/preferences";

interface LibraryContentProps {
  library: NormalizedLibrary;
  series: NormalizedSeriesPage;
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
  return (
    <>
      <LibraryHeader
        library={library}
        seriesCount={series.totalElements ?? series.items.length}
        series={series.items}
      />
      <Container>
        <PaginatedSeriesGrid
          series={series.items}
          currentPage={currentPage}
          totalPages={series.totalPages ?? 1}
          totalElements={series.totalElements ?? series.items.length}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
          pageSize={pageSize}
          initialCompact={preferences.displayMode.compact}
          initialViewMode={preferences.displayMode.viewMode || "grid"}
        />
      </Container>
    </>
  );
}
