import { PaginatedSeriesGrid } from "@/components/library/PaginatedSeriesGrid";
import { LibraryService } from "@/lib/services/library.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { revalidatePath } from "next/cache";
import { RefreshButton } from "@/components/library/RefreshButton";
import { withPageTiming } from "@/lib/hoc/withPageTiming";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LibraryResponse } from "@/types/library";
import { KomgaSeries, KomgaLibrary } from "@/types/komga";
import { UserPreferences } from "@/types/preferences";
import { ERROR_CODES } from "@/constants/errorCodes";

interface PageProps {
  params: { libraryId: string };
  searchParams: { page?: string; unread?: string; search?: string };
}

const PAGE_SIZE = 20;

async function refreshLibrary(libraryId: string) {
  "use server";

  try {
    await LibraryService.invalidateLibrarySeriesCache(libraryId);

    revalidatePath(`/libraries/${libraryId}`);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors du rafraîchissement:", error);
    return { success: false, error: "Erreur lors du rafraîchissement de la bibliothèque" };
  }
}

async function getLibrarySeries(
  libraryId: string,
  page: number = 1,
  unreadOnly: boolean = false,
  search?: string
) {
  try {
    const pageIndex = page - 1;

    const series: LibraryResponse<KomgaSeries> = await LibraryService.getLibrarySeries(
      libraryId,
      pageIndex,
      PAGE_SIZE,
      unreadOnly,
      search
    );
    const library: KomgaLibrary = await LibraryService.getLibrary(libraryId);

    return { data: series, library };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Erreur lors de la récupération des séries");
  }
}

async function LibraryPage({ params, searchParams }: PageProps) {
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly =
    searchParams.unread !== undefined ? searchParams.unread === "true" : preferences.showOnlyUnread;

  try {
    const { data: series, library }: { data: LibraryResponse<KomgaSeries>; library: KomgaLibrary } =
      await getLibrarySeries(params.libraryId, currentPage, unreadOnly, searchParams.search);

    return (
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{library.name}</h1>
          <div className="flex items-center gap-2">
            {series.totalElements > 0 && (
              <p className="text-sm text-muted-foreground">
                {series.totalElements} série{series.totalElements > 1 ? "s" : ""}
              </p>
            )}
            <RefreshButton libraryId={params.libraryId} refreshLibrary={refreshLibrary} />
          </div>
        </div>
        <PaginatedSeriesGrid
          series={series.content || []}
          currentPage={currentPage}
          totalPages={series.totalPages}
          totalElements={series.totalElements}
          pageSize={PAGE_SIZE}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof Error) {
      return (
        <div className="container py-8 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Séries</h1>
            <RefreshButton libraryId={params.libraryId} refreshLibrary={refreshLibrary} />
          </div>
          <ErrorMessage errorCode={ERROR_CODES.SERIES.FETCH_ERROR} />
        </div>
      );
    }
    return (
      <div className="container py-8 space-y-8">
        <ErrorMessage errorCode={ERROR_CODES.SERIES.FETCH_ERROR} />
      </div>
    );
  }
}

export default withPageTiming("LibraryPage", LibraryPage);
