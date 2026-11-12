import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesContent } from "./SeriesContent";
import { RefreshSurface } from "@/components/common/RefreshSurface";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { normalizeGridPageSize } from "@/lib/pageSize";
import { loadSurface } from "@/lib/surfaces/load-surface";

interface PageProps {
  params: Promise<{ seriesId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; size?: string }>;
}

const DEFAULT_PAGE_SIZE = 30;

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const [{ seriesId }, { page, size, unread }] = await Promise.all([params, searchParams]);
  const currentPage = page ? parseInt(page) : 1;

  const surface = await loadSurface({
    name: "series",
    fallbackCode: ERROR_CODES.BOOK.PAGES_FETCH_ERROR,
    load: async ({ provider, providerType, preferences }) => {
      const isCompact = preferences.displayMode?.compact ?? false;
      const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
      const effectivePageSize = normalizeGridPageSize(
        size ? parseInt(size) : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE,
        isCompact
      );

      const canRate = providerType === "stripstream";
      const canShelve = providerType === "stripstream";

      const [booksPage, series, isFavorite, missingBooks, relatedSeries, rating] = await Promise.all([
        provider.getBooks({
          seriesId,
          cursor: String(currentPage),
          limit: effectivePageSize,
          unreadOnly,
        }),
        provider.getSeriesById(seriesId),
        FavoriteService.isFavorite(seriesId),
        provider.getMissingBooks(seriesId),
        provider.getRelatedSeries(seriesId).catch(() => []),
        canRate ? provider.getSeriesRating(seriesId).catch(() => null) : Promise.resolve(null),
      ]);

      if (!series) throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);

      return {
        series,
        booksPage,
        preferences,
        unreadOnly,
        effectivePageSize,
        isFavorite,
        missingBooks,
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
            currentPage={currentPage}
            preferences={data.preferences}
            unreadOnly={data.unreadOnly}
            pageSize={data.effectivePageSize}
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
