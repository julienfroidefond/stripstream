import { LibraryClientWrapper } from "./LibraryClientWrapper";
import { LibraryContent } from "./LibraryContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { normalizeGridPageSize } from "@/lib/pageSize";
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

const DEFAULT_PAGE_SIZE = 30;

export default async function LibraryPage({ params, searchParams }: PageProps) {
  const [{ libraryId }, { unread, page, size, search, sort, missing }] = await Promise.all([
    params,
    searchParams,
  ]);

  const currentPage = page ? parseInt(page) : 1;

  const surface = await loadSurface({
    name: "library",
    fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
    load: async ({ provider, providerType, preferences }) => {
      const isCompact = preferences.displayMode?.compact ?? false;

      // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
      const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
      const effectivePageSize = normalizeGridPageSize(
        size ? parseInt(size) : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE,
        isCompact
      );
      const effectiveSort = sort ?? preferences.defaultSortOrder ?? "title";
      const effectiveMissing =
        missing !== undefined
          ? missing === "true"
          : preferences.showMissingBooks === false
            ? false
            : undefined;

      const canSortByRating = providerType === "stripstream";
      // Si l'utilisateur a sauvegardé "community_score" puis basculé sur Komga
      // (qui ne supporte pas ce tri), on retombe sur le tri par titre.
      const safeSort =
        !canSortByRating && effectiveSort === "community_score" ? "title" : effectiveSort;

      const [seriesPage, library] = await Promise.all([
        provider.getSeries(
          libraryId,
          String(currentPage),
          effectivePageSize,
          unreadOnly,
          search,
          safeSort,
          effectiveMissing === true
        ),
        provider.getLibraryById(libraryId),
      ]);

      if (!library) throw new AppError(ERROR_CODES.LIBRARY.NOT_FOUND);

      return {
        library,
        seriesPage,
        preferences,
        unreadOnly,
        effectivePageSize,
        safeSort,
        hasMissing: effectiveMissing === true,
        canSortByRating,
      };
    },
  });

  if (surface.status !== "ready") {
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage
          errorCode={surface.status === "error" ? surface.code : ERROR_CODES.SERIES.FETCH_ERROR}
        />
      </main>
    );
  }

  const data = surface.data;

  return (
    <LibraryClientWrapper libraryId={libraryId}>
      <LibraryContent
        library={data.library}
        series={data.seriesPage}
        currentPage={currentPage}
        preferences={data.preferences}
        unreadOnly={data.unreadOnly}
        pageSize={data.effectivePageSize}
        sort={data.safeSort}
        hasMissing={data.hasMissing}
        canSortByRating={data.canSortByRating}
      />
    </LibraryClientWrapper>
  );
}
