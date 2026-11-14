import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { Container } from "@/components/ui/container";
import { RelatedSeriesRow } from "@/components/series/RelatedSeriesRow";
import type { NormalizedBooksPage, NormalizedMissingBook, NormalizedSeries, NormalizedProviderRating } from "@/lib/providers/types";
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
  /** La série a des tomes manquants, même si cette page n'en montre aucun. */
  hasMissingBooks: boolean;
  relatedSeries?: NormalizedSeries[];
  canRate?: boolean;
  initialRating?: number | null;
  providerRatings?: NormalizedProviderRating[];
  canShelve?: boolean;
  initialIsShelved?: boolean;
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
  hasMissingBooks,
  relatedSeries = [],
  canRate = false,
  initialRating = null,
  providerRatings = [],
  canShelve = false,
  initialIsShelved = false,
}: SeriesContentProps) {
  return (
    <>
      <SeriesHeader
        series={series}
        initialIsFavorite={initialIsFavorite}
        canRate={canRate}
        initialRating={initialRating}
        providerRatings={providerRatings}
        canShelve={canShelve}
        initialIsShelved={initialIsShelved}
      />
      <Container>
        <PaginatedBookGrid
          books={books.items}
          currentPage={currentPage}
          totalPages={books.totalPages}
          totalElements={books.totalElements}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
          pageSize={pageSize}
          initialCompact={preferences.displayMode.compact}
          initialViewMode={preferences.displayMode.booksViewMode || "grid"}
          missingBooks={missingBooks}
          hasMissingBooks={hasMissingBooks}
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
