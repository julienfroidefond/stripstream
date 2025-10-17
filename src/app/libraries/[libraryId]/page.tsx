import { PreferencesService } from "@/lib/services/preferences.service";
import { ClientLibraryPage } from "./ClientLibraryPage";
import type { UserPreferences } from "@/types/preferences";

interface PageProps {
  params: { libraryId: string };
  searchParams: { page?: string; unread?: string; search?: string; size?: string };
}

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

  return (
    <ClientLibraryPage
      currentPage={currentPage}
      libraryId={libraryId}
      preferences={preferences}
      unreadOnly={unreadOnly}
      search={search}
      pageSize={size ? parseInt(size) : undefined}
    />
  );
}
