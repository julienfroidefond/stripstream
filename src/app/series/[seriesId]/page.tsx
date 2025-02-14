import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { SeriesService } from "@/lib/services/series.service";

interface PageProps {
  params: { seriesId: string };
  searchParams: { page?: string; unread?: string };
}

const PAGE_SIZE = 24;

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;
  const unreadOnly = searchParams.unread === "true";

  try {
    const pageIndex = currentPage - 1;

    // Appels API parallèles pour les détails de la série et les tomes
    const [series, books] = await Promise.all([
      SeriesService.getSeries(params.seriesId),
      SeriesService.getSeriesBooks(params.seriesId, pageIndex, PAGE_SIZE, unreadOnly),
    ]);

    return (
      <div className="container py-8 space-y-8">
        <SeriesHeader series={series} />
        <PaginatedBookGrid
          books={books.content || []}
          currentPage={currentPage}
          totalPages={books.totalPages}
          totalElements={books.totalElements}
          pageSize={PAGE_SIZE}
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
