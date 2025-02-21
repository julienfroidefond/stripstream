import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { SeriesService } from "@/lib/services/series.service";
import { PreferencesService } from "@/lib/services/preferences.service";

interface PageProps {
  params: { seriesId: string };
  searchParams: { page?: string; unread?: string };
}

const PAGE_SIZE = 24;

async function getSeriesBooks(seriesId: string, page: number = 1, unreadOnly: boolean = false) {
  try {
    const pageIndex = page - 1;

    const books = await SeriesService.getSeriesBooks(seriesId, pageIndex, PAGE_SIZE, unreadOnly);
    const series = await SeriesService.getSeries(seriesId);

    return { data: books, series };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Erreur lors de la récupération des tomes");
  }
}

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;
  const preferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly =
    searchParams.unread !== undefined ? searchParams.unread === "true" : preferences.showOnlyUnread;

  try {
    const { data: books, series } = await getSeriesBooks(params.seriesId, currentPage, unreadOnly);

    return (
      <div className="container py-8 space-y-8">
        <SeriesHeader series={series} />
        <PaginatedBookGrid
          books={books.content || []}
          currentPage={currentPage}
          totalPages={books.totalPages}
          totalElements={books.totalElements}
          pageSize={PAGE_SIZE}
          defaultShowOnlyUnread={preferences.showOnlyUnread}
          showOnlyUnread={unreadOnly}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Série</h1>
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Erreur lors de la récupération de la série"}
          </p>
        </div>
      </div>
    );
  }
}
