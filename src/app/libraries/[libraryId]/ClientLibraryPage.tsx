"use client";

import { PaginatedSeriesGrid } from "@/components/library/PaginatedSeriesGrid";
import { RefreshButton } from "@/components/library/RefreshButton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTranslate } from "@/hooks/useTranslate";
import type { LibraryResponse } from "@/types/library";
import type { KomgaSeries, KomgaLibrary } from "@/types/komga";
import type { UserPreferences } from "@/types/preferences";

interface ClientLibraryPageProps {
  library: KomgaLibrary | null;
  series: LibraryResponse<KomgaSeries> | null;
  currentPage: number;
  libraryId: string;
  refreshLibrary: (libraryId: string) => Promise<{ success: boolean; error?: string }>;
  preferences: UserPreferences;
  unreadOnly: boolean;
  errorCode?: string;
}

export function ClientLibraryPage({
  library,
  series,
  currentPage,
  libraryId,
  refreshLibrary,
  preferences,
  unreadOnly,
  errorCode,
}: ClientLibraryPageProps) {
  const { t } = useTranslate();

  if (errorCode) {
    return (
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {library?.name || t("series.empty")}
          </h1>
          <RefreshButton libraryId={libraryId} refreshLibrary={refreshLibrary} />
        </div>
        <ErrorMessage errorCode={errorCode} />
      </div>
    );
  }

  if (!library || !series) {
    return (
      <div className="container py-8 space-y-8">
        <ErrorMessage errorCode="SERIES_FETCH_ERROR" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{library.name}</h1>
        <div className="flex items-center gap-2">
          {series.totalElements > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("series.display.showing", {
                start: ((currentPage - 1) * (preferences.displayMode?.itemsPerPage || 20)) + 1,
                end: Math.min(currentPage * (preferences.displayMode?.itemsPerPage || 20), series.totalElements),
                total: series.totalElements,
              })}
            </p>
          )}
          <RefreshButton libraryId={libraryId} refreshLibrary={refreshLibrary} />
        </div>
      </div>
      <PaginatedSeriesGrid
        series={series.content || []}
        currentPage={currentPage}
        totalPages={series.totalPages}
        totalElements={series.totalElements}
        defaultShowOnlyUnread={preferences.showOnlyUnread}
        showOnlyUnread={unreadOnly}
      />
    </div>
  );
}
