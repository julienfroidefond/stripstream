import { PreferencesService } from "@/lib/services/preferences.service";
import { SeriesService } from "@/lib/services/series.service";
import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesClientWrapper } from "./SeriesClientWrapper";
import { SeriesContent } from "./SeriesContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { UserPreferences } from "@/types/preferences";

interface PageProps {
  params: Promise<{ seriesId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; size?: string }>;
}

const DEFAULT_PAGE_SIZE = 20;

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const seriesId = (await params).seriesId;
  const page = (await searchParams).page;
  const unread = (await searchParams).unread;
  const size = (await searchParams).size;

  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;
  const effectivePageSize = size ? parseInt(size) : preferences.displayMode?.itemsPerPage || DEFAULT_PAGE_SIZE;

  try {
    const [books, series, isFavorite] = await Promise.all([
      SeriesService.getSeriesBooks(seriesId, currentPage - 1, effectivePageSize, unreadOnly),
      SeriesService.getSeries(seriesId),
      FavoriteService.isFavorite(seriesId),
    ]);

    return (
      <SeriesClientWrapper>
        <SeriesContent
          series={series}
          books={books}
          currentPage={currentPage}
          preferences={preferences}
          unreadOnly={unreadOnly}
          pageSize={effectivePageSize}
          initialIsFavorite={isFavorite}
        />
      </SeriesClientWrapper>
    );
  } catch (error) {
    const errorCode = error instanceof AppError 
      ? error.code 
      : ERROR_CODES.BOOK.PAGES_FETCH_ERROR;
    
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
