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
  sort: string;
  hasMissing: boolean;
  canSortByRating?: boolean;
}

export function LibraryContent({
  library,
  series,
  currentPage,
  preferences,
  unreadOnly,
  search,
  pageSize,
  sort,
  hasMissing,
  canSortByRating = false,
}: LibraryContentProps) {
  return (
    <>
      <LibraryHeader
        library={library}
        seriesCount={series.totalElements}
        series={series.items}
      />
      <Container>
        <PaginatedSeriesGrid
          series={series.items}
          currentPage={currentPage}
          totalPages={series.totalPages}
          totalElements={series.totalElements}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
          pageSize={pageSize}
          initialCompact={preferences.displayMode.compact}
          initialViewMode={preferences.displayMode.viewMode || "grid"}
          sort={sort}
          hasMissing={hasMissing}
          canSortByRating={canSortByRating}
          search={search}
        />
      </Container>
    </>
  );
}
