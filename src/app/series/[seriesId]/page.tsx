import { PreferencesService } from "@/lib/services/preferences.service";
import { getProvider, getActiveProviderType } from "@/lib/providers/provider.factory";

import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesClientWrapper } from "./SeriesClientWrapper";
import { SeriesContent } from "./SeriesContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { UserPreferences } from "@/types/preferences";
import { redirect } from "next/navigation";
import { normalizeGridPageSize } from "@/lib/pageSize";

interface PageProps {
  params: Promise<{ seriesId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; size?: string }>;
}

const DEFAULT_PAGE_SIZE = 30;

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const [{ seriesId }, { page, size, unread }] = await Promise.all([params, searchParams]);
  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();
  const isCompact = preferences.displayMode?.compact ?? false;

  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
  const effectivePageSize = normalizeGridPageSize(
    size ? parseInt(size) : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE,
    isCompact
  );

  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const providerType = await getActiveProviderType();
    const canRate = providerType === "stripstream";

    const [booksPage, series, isFavorite, missingBooks, relatedSeries, rating] = await Promise.all([
      provider.getBooks({
        seriesName: seriesId,
        cursor: String(currentPage),
        limit: effectivePageSize,
        unreadOnly,
      }),
      provider.getSeriesById(seriesId),
      FavoriteService.isFavorite(seriesId),
      provider.getMissingBooks(seriesId),
      provider.getRelatedSeries(seriesId).catch(() => []),
      canRate ? provider.getSeriesRating(seriesId).catch(() => null) : Promise.resolve(null),
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
          missingBooks={missingBooks}
          relatedSeries={relatedSeries}
          canRate={canRate}
          initialRating={rating?.userRating ?? null}
          providerRatings={rating?.providerRatings ?? []}
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
