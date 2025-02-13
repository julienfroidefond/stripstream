import { cookies } from "next/headers";
import { PaginatedSeriesGrid } from "@/components/library/PaginatedSeriesGrid";
import { komgaConfigService } from "@/lib/services/komga-config.service";

interface PageProps {
  params: { libraryId: string };
  searchParams: { page?: string; unread?: string };
}

const PAGE_SIZE = 20;

async function getLibrarySeries(libraryId: string, page: number = 1, unreadOnly: boolean = false) {
  try {
    const cookiesStore = cookies();
    const config = komgaConfigService.validateAndGetConfig(cookiesStore);

    // Paramètres de pagination
    const pageIndex = page - 1; // L'API Komga utilise un index base 0

    // Construire l'URL avec les paramètres
    let path = `series?library_id=${libraryId}&page=${pageIndex}&size=${PAGE_SIZE}`;
    if (unreadOnly) {
      path += "&read_status=UNREAD&read_status=IN_PROGRESS";
    }

    const url = komgaConfigService.buildApiUrl(path, cookiesStore);
    const headers = komgaConfigService.getAuthHeaders(cookiesStore);

    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 }, // Cache de 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { data, serverUrl: config.serverUrl };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Erreur lors de la récupération des séries");
  }
}

export default async function LibraryPage({ params, searchParams }: PageProps) {
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;
  const unreadOnly = searchParams.unread === "true";

  try {
    const { data: series, serverUrl } = await getLibrarySeries(
      params.libraryId,
      currentPage,
      unreadOnly
    );

    return (
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Séries</h1>
          {series.totalElements > 0 && (
            <p className="text-sm text-muted-foreground">
              {series.totalElements} série{series.totalElements > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <PaginatedSeriesGrid
          series={series.content || []}
          serverUrl={serverUrl}
          currentPage={currentPage}
          totalPages={series.totalPages}
          totalElements={series.totalElements}
          pageSize={PAGE_SIZE}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Séries</h1>
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Erreur lors de la récupération des séries"}
          </p>
        </div>
      </div>
    );
  }
}
