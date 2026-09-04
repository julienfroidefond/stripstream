import { PreferencesService } from "@/lib/services/preferences.service";
import { getProvider } from "@/lib/providers/provider.factory";
import { LibraryClientWrapper } from "./LibraryClientWrapper";
import { LibraryContent } from "./LibraryContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { UserPreferences } from "@/types/preferences";
import { redirect } from "next/navigation";
import { normalizeGridPageSize } from "@/lib/pageSize";

interface PageProps {
  params: Promise<{ libraryId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; search?: string; size?: string; sort?: string; missing?: string }>;
}

const DEFAULT_PAGE_SIZE = 30;

export default async function LibraryPage({ params, searchParams }: PageProps) {
  const [{ libraryId }, { unread, page, size, search, sort, missing }] = await Promise.all([
    params,
    searchParams,
  ]);

  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();
  const isCompact = preferences.displayMode?.compact ?? false;

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
  const effectivePageSize = normalizeGridPageSize(
    size ? parseInt(size) : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE,
    isCompact
  );
  const effectiveSort = sort ?? preferences.defaultSortOrder ?? "title";
  const effectiveMissing = missing !== undefined ? missing === "true" : preferences.showMissingBooks === false ? false : undefined;

  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const [seriesPage, library] = await Promise.all([
      provider.getSeries(libraryId, String(currentPage), effectivePageSize, unreadOnly, search, effectiveSort, effectiveMissing === true),
      provider.getLibraryById(libraryId),
    ]);

    if (!library) throw new AppError(ERROR_CODES.LIBRARY.NOT_FOUND);

    return (
      <LibraryClientWrapper libraryId={libraryId}>
        <LibraryContent
          library={library}
          series={seriesPage}
          currentPage={currentPage}
          preferences={preferences}
          unreadOnly={unreadOnly}
          pageSize={effectivePageSize}
          sort={effectiveSort}
          hasMissing={effectiveMissing === true}
        />
      </LibraryClientWrapper>
    );
  } catch (error) {
    if (error instanceof AppError && (
      error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
      error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG
    )) {
      redirect("/settings");
    }

    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.SERIES.FETCH_ERROR;

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
