import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesContent } from "./SeriesContent";
import { RefreshSurface } from "@/components/common/RefreshSurface";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { bookCollectionFilter, parseCollectionQuery } from "@/lib/collections/query";
import { loadSurface } from "@/lib/surfaces/load-surface";

interface PageProps {
  params: Promise<{ seriesId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; size?: string }>;
}

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const [{ seriesId }, queryParams] = await Promise.all([params, searchParams]);

  const surface = await loadSurface({
    name: "series",
    fallbackCode: ERROR_CODES.BOOK.PAGES_FETCH_ERROR,
    load: async ({ userId, provider, preferences }) => {
      const query = parseCollectionQuery(queryParams, {
        itemsPerPage: preferences.displayMode.itemsPerPage,
        compact: preferences.displayMode.compact,
        unreadOnly: preferences.showOnlyUnread,
      });

      const { ratings, shelf, missingBooks, discovery } = provider.capabilities;
      const canRate = ratings !== null;
      const canShelve = shelf !== null;

      const [booksPage, series, isFavorite, missing, relatedSeries, rating] = await Promise.all([
        provider.getBooks(bookCollectionFilter(seriesId, query)),
        provider.getSeriesById(seriesId),
        FavoriteService.isFavorite({ userId, provider }, seriesId),
        missingBooks ? missingBooks.getMissingBooks(seriesId) : Promise.resolve([]),
        discovery ? discovery.getRelatedSeries(seriesId).catch(() => []) : Promise.resolve([]),
        ratings ? ratings.getSeriesRating(seriesId).catch(() => null) : Promise.resolve(null),
      ]);

      if (!series) throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);

      return {
        series,
        booksPage,
        preferences,
        query,
        isFavorite,
        missingBooks: missing,
        relatedSeries,
        canRate,
        rating,
        canShelve,
      };
    },
  });

  return (
    <SurfaceBoundary
      surface={surface}
      ready={(data) => (
        <RefreshSurface scope="series" id={seriesId}>
          <SeriesContent
            series={data.series}
            books={data.booksPage}
            currentPage={data.query.page}
            preferences={data.preferences}
            unreadOnly={data.query.unreadOnly}
            pageSize={data.query.pageSize}
            initialIsFavorite={data.isFavorite}
            missingBooks={data.missingBooks}
            relatedSeries={data.relatedSeries}
            canRate={data.canRate}
            initialRating={data.rating?.userRating ?? null}
            providerRatings={data.rating?.providerRatings ?? []}
            canShelve={data.canShelve}
            initialIsShelved={data.series.shelvedAt != null}
          />
        </RefreshSurface>
      )}
    />
  );
}
