import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesContent } from "./SeriesContent";
import { RefreshSurface } from "@/components/common/RefreshSurface";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { fetchBookCollectionPage, parseCollectionQuery } from "@/lib/collections/query";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { missingBooksForPage } from "@/lib/series/missing-books-page";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { CollectionQuery } from "@/lib/collections/query";

/**
 * Dernier tome de la page précédente : la borne basse des manquants de cette
 * page. Un seul tome lu, et seulement quand il y a des manquants à placer.
 */
async function previousPageLastVolume(
  provider: IMediaProvider,
  seriesId: string,
  query: CollectionQuery
): Promise<number | null> {
  if (query.page <= 1) return null;
  const boundary = await provider
    .getBooks({ seriesId, page: (query.page - 1) * query.pageSize, limit: 1 })
    .catch(() => null);
  return boundary?.items[0]?.volume ?? null;
}

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
      const requestedQuery = parseCollectionQuery(queryParams, {
        itemsPerPage: preferences.displayMode.itemsPerPage,
        compact: preferences.displayMode.compact,
        unreadOnly: preferences.showOnlyUnread,
      });

      const { ratings, shelf, missingBooks, discovery } = provider.capabilities;
      const canRate = ratings !== null;
      const canShelve = shelf !== null;

      const [{ query, booksPage }, series, isFavorite, missing, relatedSeries, rating] = await Promise.all([
        fetchBookCollectionPage(provider, seriesId, requestedQuery),
        provider.getSeriesById(seriesId),
        FavoriteService.isFavorite({ userId, provider }, seriesId),
        missingBooks ? missingBooks.getMissingBooks(seriesId) : Promise.resolve([]),
        discovery ? discovery.getRelatedSeries(seriesId).catch(() => []) : Promise.resolve([]),
        ratings ? ratings.getSeriesRating(seriesId).catch(() => null) : Promise.resolve(null),
      ]);

      if (!series) throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);

      const pageMissing =
        missing.length > 0 && !query.unreadOnly
          ? missingBooksForPage(missing, booksPage.items, {
              page: query.page,
              totalPages: booksPage.totalPages,
              unreadOnly: query.unreadOnly,
              previousPageLastVolume: await previousPageLastVolume(provider, seriesId, query),
            })
          : [];

      return {
        series,
        booksPage,
        preferences,
        query,
        isFavorite,
        missingBooks: pageMissing,
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
