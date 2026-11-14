import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesContent } from "./SeriesContent";
import { RefreshSurface } from "@/components/common/RefreshSurface";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  bookCollectionFilter,
  fetchBookCollectionPage,
  parseCollectionQuery,
} from "@/lib/collections/query";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { lowerBoundBeforePage, missingBooksForPage } from "@/lib/series/missing-books-page";

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

      const [{ query, booksPage }, series, isFavorite, missing, relatedSeries, rating] =
        await Promise.all([
          fetchBookCollectionPage(provider, seriesId, requestedQuery),
          provider.getSeriesById(seriesId),
          FavoriteService.isFavorite({ userId, provider }, seriesId),
          // Chargés même en vue « non lus » : le bouton « masquer les
          // manquants » dépend de la série, pas du filtre.
          missingBooks ? missingBooks.getMissingBooks(seriesId) : Promise.resolve([]),
          discovery ? discovery.getRelatedSeries(seriesId).catch(() => []) : Promise.resolve([]),
          ratings ? ratings.getSeriesRating(seriesId).catch(() => null) : Promise.resolve(null),
        ]);

      if (!series) throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);

      // Placer les manquants demande la borne de la page précédente : lue
      // seulement s'il y a des manquants à montrer (même requête que la
      // grille, donc le plus souvent déjà en cache).
      const placesMissing = missing.length > 0 && !query.unreadOnly;
      const lowerBound = placesMissing
        ? await lowerBoundBeforePage(query.page, async (page) => {
            const previous = await provider
              .getBooks(bookCollectionFilter(seriesId, { ...query, page }))
              .catch(() => null);
            return previous?.items ?? null;
          })
        : null;

      const pageMissing = placesMissing
        ? missingBooksForPage(missing, booksPage.items, {
            page: query.page,
            totalPages: booksPage.totalPages,
            unreadOnly: query.unreadOnly,
            lowerBound,
          })
        : [];

      return {
        series,
        booksPage,
        preferences,
        query,
        isFavorite,
        missingBooks: pageMissing,
        // Le bouton « masquer les manquants » dépend de la série, pas de la page.
        hasMissingBooks: missing.length > 0,
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
            hasMissingBooks={data.hasMissingBooks}
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
