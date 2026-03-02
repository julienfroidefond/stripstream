import { PreferencesService } from "@/lib/services/preferences.service";
import { LibraryService } from "@/lib/services/library.service";
import { LibraryClientWrapper } from "./LibraryClientWrapper";
import { LibraryContent } from "./LibraryContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { UserPreferences } from "@/types/preferences";

interface PageProps {
  params: Promise<{ libraryId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; search?: string; size?: string }>;
}

const DEFAULT_PAGE_SIZE = 20;

export default async function LibraryPage({ params, searchParams }: PageProps) {
  const libraryId = (await params).libraryId;
  const unread = (await searchParams).unread;
  const search = (await searchParams).search;
  const page = (await searchParams).page;
  const size = (await searchParams).size;

  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
  const effectivePageSize = size
    ? parseInt(size)
    : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE;

  try {
    const [series, library] = await Promise.all([
      LibraryService.getLibrarySeries(
        libraryId,
        currentPage - 1,
        effectivePageSize,
        unreadOnly,
        search
      ),
      LibraryService.getLibrary(libraryId),
    ]);

    return (
      <LibraryClientWrapper libraryId={libraryId}>
        <LibraryContent
          library={library}
          series={series}
          currentPage={currentPage}
          preferences={preferences}
          unreadOnly={unreadOnly}
          search={search}
          pageSize={effectivePageSize}
        />
      </LibraryClientWrapper>
    );
  } catch (error) {
    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.SERIES.FETCH_ERROR;

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
