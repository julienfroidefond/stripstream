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
import { missingBooksForPage } from "@/lib/series/missing-books-page";
import type { CollectionQuery } from "@/lib/collections/query";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { NormalizedBook } from "@/lib/providers/types";

/**
 * Tomes de la page précédente, avec la même requête que la grille : la borne
 * basse des manquants de cette page, et le plus souvent un hit de cache (la
 * page que l'utilisateur vient de quitter). `null` sur la première page.
 */
async function previousPageBooks(
  provider: IMediaProvider,
  seriesId: string,
  query: CollectionQuery
): Promise<NormalizedBook[] | null> {
  if (query.page <= 1) return null;
  const previous = await provider
    .getBooks(bookCollectionFilter(seriesId, { ...query, page: query.page - 1 }))
    .catch(() => null);
  return previous?.items ?? null;
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

      // Les manquants ne s'affichent pas dans la vue « non lus » : on ne les
      // charge pas, ni la page précédente qui sert à les placer.
      const wantsMissing = missingBooks !== null && !requestedQuery.unreadOnly;

      const [
        { query, booksPage },
        series,
        isFavorite,
        missing,
        requestedPreviousBooks,
        relatedSeries,
        rating,
      ] = await Promise.all([
        fetchBookCollectionPage(provider, seriesId, requestedQuery),
        provider.getSeriesById(seriesId),
        FavoriteService.isFavorite({ userId, provider }, seriesId),
        wantsMissing ? missingBooks.getMissingBooks(seriesId) : Promise.resolve([]),
        wantsMissing ? previousPageBooks(provider, seriesId, requestedQuery) : Promise.resolve(null),
        discovery ? discovery.getRelatedSeries(seriesId).catch(() => []) : Promise.resolve([]),
        ratings ? ratings.getSeriesRating(seriesId).catch(() => null) : Promise.resolve(null),
      ]);

      if (!series) throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);

      // Page demandée hors bornes : la grille a été recalée, la page précédente
      // chargée en parallèle n'est plus la bonne (cas rare, une requête de plus).
      const previousBooks =
        missing.length > 0 && query.page !== requestedQuery.page
          ? await previousPageBooks(provider, seriesId, query)
          : requestedPreviousBooks;

      const pageMissing = missingBooksForPage(missing, booksPage.items, {
        page: query.page,
        totalPages: booksPage.totalPages,
        unreadOnly: query.unreadOnly,
        previousPageBooks: previousBooks,
      });

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
