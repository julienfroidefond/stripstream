import { LibraryContent } from "./LibraryContent";
import { RefreshSurface } from "@/components/common/RefreshSurface";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { fetchSeriesCollectionPage, parseSeriesCollectionQuery } from "@/lib/collections/query";
import { loadSurface } from "@/lib/surfaces/load-surface";

interface PageProps {
  params: Promise<{ libraryId: string }>;
  searchParams: Promise<{
    page?: string;
    unread?: string;
    search?: string;
    size?: string;
    sort?: string;
    missing?: string;
  }>;
}

export default async function LibraryPage({ params, searchParams }: PageProps) {
  const [{ libraryId }, queryParams] = await Promise.all([params, searchParams]);

  const surface = await loadSurface({
    name: "library",
    fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
    load: async ({ provider, preferences }) => {
      const canSortByRating = provider.capabilities.ratings !== null;

      const requestedQuery = parseSeriesCollectionQuery(queryParams, {
        itemsPerPage: preferences.displayMode.itemsPerPage,
        compact: preferences.displayMode.compact,
        unreadOnly: preferences.showOnlyUnread,
        defaultSortOrder: preferences.defaultSortOrder,
        showMissingBooks: preferences.showMissingBooks,
        canSortByRating,
      });

      const [{ query, seriesPage }, library] = await Promise.all([
        fetchSeriesCollectionPage(provider, libraryId, requestedQuery),
        provider.getLibraryById(libraryId),
      ]);

      if (!library) throw new AppError(ERROR_CODES.LIBRARY.NOT_FOUND);

      return {
        library,
        seriesPage,
        preferences,
        query,
        canSortByRating,
      };
    },
  });

  return (
    <SurfaceBoundary
      surface={surface}
      ready={(data) => (
        <RefreshSurface scope="library" id={libraryId}>
          <LibraryContent
            library={data.library}
            series={data.seriesPage}
            currentPage={data.query.page}
            preferences={data.preferences}
            unreadOnly={data.query.unreadOnly}
            pageSize={data.query.pageSize}
            sort={data.query.sort}
            hasMissing={data.query.missing}
            canSortByRating={data.canSortByRating}
            search={data.query.search}
          />
        </RefreshSurface>
      )}
    />
  );
}
