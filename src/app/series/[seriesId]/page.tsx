import { cookies } from "next/headers";
import { PaginatedBookGrid } from "@/components/series/PaginatedBookGrid";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { KomgaSeries, KomgaBook } from "@/types/komga";
import { komgaConfigService } from "@/lib/services/komga-config.service";

interface PageProps {
  params: { seriesId: string };
  searchParams: { page?: string; unread?: string };
}

const PAGE_SIZE = 24;

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;
  const unreadOnly = searchParams.unread === "true";

  try {
    const cookiesStore = cookies();
    const config = komgaConfigService.validateAndGetConfig(cookiesStore);

    // Paramètres de pagination
    const pageIndex = currentPage - 1; // L'API Komga utilise un index base 0

    // Appels API parallèles pour les détails de la série et les tomes
    const [seriesResponse, booksResponse] = await Promise.all([
      // Détails de la série
      fetch(komgaConfigService.buildApiUrl(`series/${params.seriesId}`, cookiesStore), {
        headers: komgaConfigService.getAuthHeaders(cookiesStore),
        next: { revalidate: 300 },
      }),
      // Liste des tomes avec pagination et filtre
      fetch(
        komgaConfigService.buildApiUrl(
          `series/${
            params.seriesId
          }/books?page=${pageIndex}&size=${PAGE_SIZE}&sort=metadata.numberSort,asc${
            unreadOnly ? "&read_status=UNREAD&read_status=IN_PROGRESS" : ""
          }`,
          cookiesStore
        ),
        {
          headers: komgaConfigService.getAuthHeaders(cookiesStore),
          next: { revalidate: 300 },
        }
      ),
    ]);

    if (!seriesResponse.ok || !booksResponse.ok) {
      throw new Error("Erreur lors de la récupération des données");
    }

    const [series, books] = await Promise.all([seriesResponse.json(), booksResponse.json()]);

    return (
      <div className="container py-8 space-y-8">
        <SeriesHeader series={series} serverUrl={config.serverUrl} />
        <PaginatedBookGrid
          books={books.content || []}
          serverUrl={config.serverUrl}
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
