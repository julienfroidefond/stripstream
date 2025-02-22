import { PaginatedSeriesGrid } from "@/components/library/PaginatedSeriesGrid";
import { LibraryService } from "@/lib/services/library.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { revalidatePath } from "next/cache";
import { RefreshButton } from "@/components/library/RefreshButton";

interface PageProps {
  params: { libraryId: string };
  searchParams: { page?: string; unread?: string };
}

const PAGE_SIZE = 20;

async function refreshLibrary(libraryId: string) {
  "use server";

  try {
    await LibraryService.clearLibrarySeriesCache(libraryId);

    revalidatePath(`/libraries/${libraryId}`);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors du rafraîchissement:", error);
    return { success: false, error: "Erreur lors du rafraîchissement de la bibliothèque" };
  }
}

async function getLibrarySeries(libraryId: string, page: number = 1, unreadOnly: boolean = false) {
  try {
    const pageIndex = page - 1;

    const series = await LibraryService.getLibrarySeries(
      libraryId,
      pageIndex,
      PAGE_SIZE,
      unreadOnly
    );
    const library = await LibraryService.getLibrary(libraryId);

    return { data: series, library };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Erreur lors de la récupération des séries");
  }
}

export default async function LibraryPage({ params, searchParams }: PageProps) {
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;
  const preferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly =
    searchParams.unread !== undefined ? searchParams.unread === "true" : preferences.showOnlyUnread;

  try {
    const { data: series, library } = await getLibrarySeries(
      params.libraryId,
      currentPage,
      unreadOnly
    );

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
    return (
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Séries</h1>
          <RefreshButton libraryId={params.libraryId} refreshLibrary={refreshLibrary} />
        </div>
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Erreur lors de la récupération des séries"}
          </p>
        </div>
      </div>
    );
  }
}
