import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { SeriesService } from "@/lib/services/series.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import { revalidatePath } from "next/cache";
import { withPageTiming } from "@/lib/hoc/withPageTiming";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { LibraryResponse } from "@/types/library";
import type { KomgaBook, KomgaSeries } from "@/types/komga";
import type { UserPreferences } from "@/types/preferences";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

interface PageProps {
  params: { seriesId: string };
  searchParams: { page?: string; unread?: string; size?: string };
}

const DEFAULT_PAGE_SIZE = 20;

async function getSeriesBooks(
  seriesId: string,
  page: number = 1,
  unreadOnly: boolean = false,
  size: number = DEFAULT_PAGE_SIZE
) {
  try {
    const pageIndex = page - 1;

    const books: LibraryResponse<KomgaBook> = await SeriesService.getSeriesBooks(
      seriesId,
      pageIndex,
      size,
      unreadOnly
    );
    const series: KomgaSeries = await SeriesService.getSeries(seriesId);

    return { data: books, series };
  } catch (error) {
    throw error instanceof AppError ? error : new AppError(ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
  }
}

async function refreshSeries(seriesId: string) {
  "use server";

  try {
    await SeriesService.invalidateSeriesBooksCache(seriesId);
    await SeriesService.invalidateSeriesCache(seriesId);
    revalidatePath(`/series/${seriesId}`);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors du rafraîchissement:", error);
    return { success: false, error: "Erreur lors du rafraîchissement de la série" };
  }
}

async function SeriesPage({ params, searchParams }: PageProps) {
  const seriesId = (await params).seriesId;
  const page = (await searchParams).page;
  const unread = (await searchParams).unread;
  const size = (await searchParams).size;

  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
  // Utiliser le paramètre de pageSize s'il existe, sinon utiliser la préférence utilisateur
  const pageSize = size
    ? parseInt(size)
    : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE;

  try {
    const { data: books, series }: { data: LibraryResponse<KomgaBook>; series: KomgaSeries } =
      await getSeriesBooks(seriesId, currentPage, unreadOnly, pageSize);

    return (
      <div className="container">
        <SeriesHeader series={series} refreshSeries={refreshSeries} />
        <PaginatedBookGrid
          books={books.content || []}
          currentPage={currentPage}
          totalPages={books.totalPages}
          totalElements={books.totalElements}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError) {
      return (
        <div className="container py-8 space-y-8">
          <ErrorMessage errorCode={error.code} />
        </div>
      );
    }
    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Série</h1>
        <ErrorMessage errorCode={ERROR_CODES.SERIES.FETCH_ERROR} />
      </div>
    );
  }
}

export default withPageTiming("SeriesPage", SeriesPage);
