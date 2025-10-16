import { LibraryService } from "@/lib/services/library.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { revalidatePath } from "next/cache";
import { withPageTiming } from "@/lib/hoc/withPageTiming";
import type { LibraryResponse } from "@/types/library";
import type { KomgaSeries, KomgaLibrary } from "@/types/komga";
import type { UserPreferences } from "@/types/preferences";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { ClientLibraryPage } from "./ClientLibraryPage";

interface PageProps {
  params: { libraryId: string };
  searchParams: { page?: string; unread?: string; search?: string; size?: string };
}

const DEFAULT_PAGE_SIZE = 20;

async function refreshLibrary(libraryId: string) {
  "use server";

  try {
    await LibraryService.invalidateLibrarySeriesCache(libraryId);

    revalidatePath(`/libraries/${libraryId}`);
    return { success: true };
  } catch (error) {
    console.error("Error during refresh:", error);
    return { success: false, error: "Error refreshing library" };
  }
}

async function getLibrarySeries(
  libraryId: string,
  page: number = 1,
  unreadOnly: boolean = false,
  search?: string,
  size: number = DEFAULT_PAGE_SIZE
) {
  try {
    const pageIndex = page - 1;

    const [series, library] = await Promise.all([
      LibraryService.getLibrarySeries(libraryId, pageIndex, size, unreadOnly, search),
      LibraryService.getLibrary(libraryId)
    ]);

    return { data: series, library };
  } catch (error) {
    throw error instanceof Error ? error : new AppError(ERROR_CODES.SERIES.FETCH_ERROR, {}, error);
  }
}

async function LibraryPage({ params, searchParams }: PageProps) {
  const libraryId = (await params).libraryId;
  const unread = (await searchParams).unread;
  const search = (await searchParams).search;
  const page = (await searchParams).page;
  const size = (await searchParams).size;

  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
  // Utiliser le paramètre de pageSize s'il existe, sinon utiliser la valeur par défaut
  const pageSize = size
    ? parseInt(size)
    : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE;

  try {
    const { data: series, library }: { data: LibraryResponse<KomgaSeries>; library: KomgaLibrary } =
      await getLibrarySeries(libraryId, currentPage, unreadOnly, search, pageSize);

    return (
      <ClientLibraryPage
        library={library}
        series={series}
        currentPage={currentPage}
        libraryId={libraryId}
        refreshLibrary={refreshLibrary}
        preferences={preferences}
        unreadOnly={unreadOnly}
      />
    );
  } catch (error) {
    if (error instanceof AppError) {
      return (
        <ClientLibraryPage
          library={null}
          series={null}
          currentPage={currentPage}
          libraryId={libraryId}
          refreshLibrary={refreshLibrary}
          preferences={preferences}
          unreadOnly={unreadOnly}
          errorCode={error.code}
        />
      );
    }
    return (
      <ClientLibraryPage
        library={null}
        series={null}
        currentPage={currentPage}
        libraryId={libraryId}
        refreshLibrary={refreshLibrary}
        preferences={preferences}
        unreadOnly={unreadOnly}
        errorCode={ERROR_CODES.SERIES.FETCH_ERROR}
      />
    );
  }
}

export default withPageTiming("LibraryPage", LibraryPage);
