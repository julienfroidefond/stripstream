import { PreferencesService } from "@/lib/services/preferences.service";
import { ClientSeriesPage } from "./ClientSeriesPage";
import type { UserPreferences } from "@/types/preferences";

interface PageProps {
  params: Promise<{ seriesId: string }>;
  searchParams: Promise<{ page?: string; unread?: string; size?: string }>;
}

export default async function SeriesPage({ params, searchParams }: PageProps) {
  const seriesId = (await params).seriesId;
  const page = (await searchParams).page;
  const unread = (await searchParams).unread;
  const size = (await searchParams).size;

  const currentPage = page ? parseInt(page) : 1;
  const preferences: UserPreferences = await PreferencesService.getPreferences();

  // Utiliser le paramètre d'URL s'il existe, sinon utiliser la préférence utilisateur
  const unreadOnly = unread !== undefined ? unread === "true" : preferences.showOnlyUnread;

  return (
    <ClientSeriesPage
      seriesId={seriesId}
      currentPage={currentPage}
      preferences={preferences}
      unreadOnly={unreadOnly}
      pageSize={size ? parseInt(size) : undefined}
    />
  );
}
