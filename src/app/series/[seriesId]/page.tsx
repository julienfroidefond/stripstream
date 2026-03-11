import { PreferencesService } from "@/lib/services/preferences.service";
import { getProvider } from "@/lib/providers/provider.factory";

import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesClientWrapper } from "./SeriesClientWrapper";
import { SeriesContent } from "./SeriesContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { UserPreferences } from "@/types/preferences";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ seriesId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; size?: string }>;
}

const DEFAULT_PAGE_SIZE = 20;

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const seriesId = (await params).seriesId;
  const page = (await searchParams).page;
  const size = (await searchParams).size;
  const unread = (await searchParams).unread;
  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();

  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
  const effectivePageSize = size
    ? parseInt(size)
    : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE;

  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const [booksPage, series, isFavorite] = await Promise.all([
      provider.getBooks({
        seriesName: seriesId,
        cursor: String(currentPage),
        limit: effectivePageSize,
        unreadOnly,
      }),
      provider.getSeriesById(seriesId),
      FavoriteService.isFavorite(seriesId),
    ]);

    if (!series) throw new AppError(ERROR_CODES.SERIES.FETCH_ERROR);

    return (
      <SeriesClientWrapper seriesId={seriesId}>
        <SeriesContent
          series={series}
          books={booksPage}
          currentPage={currentPage}
          preferences={preferences}
          unreadOnly={unreadOnly}
          pageSize={effectivePageSize}
          initialIsFavorite={isFavorite}
        />
      </SeriesClientWrapper>
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
        error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG)
    ) {
      redirect("/settings");
    }

    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.BOOK.PAGES_FETCH_ERROR;

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
