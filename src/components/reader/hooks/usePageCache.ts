import { useCallback, useRef } from "react";
import type { PageCache } from "../types";
import type { KomgaBook } from "@/types/komga";
import { usePreferences } from "@/contexts/PreferencesContext";

interface UsePageCacheProps {
  book: KomgaBook;
  pages: number[];
}

export const usePageCache = ({ book, pages }: UsePageCacheProps) => {
  const pageCache = useRef<PageCache>({});
  const { preferences } = usePreferences();

  const preloadPage = useCallback(
    async (pageNumber: number) => {
      if (pageNumber > pages.length || pageNumber < 1) return;

      if (pageCache.current[pageNumber]?.url) return;

      if (pageCache.current[pageNumber]?.loading) {
        await pageCache.current[pageNumber].loading;
        return;
      }

      let resolveLoading: () => void;
      const loadingPromise = new Promise<void>((resolve) => {
        resolveLoading = resolve;
      });

      pageCache.current[pageNumber] = {
        ...pageCache.current[pageNumber],
        loading: loadingPromise,
      };

      try {
        const startTime = performance.now();
        const response = await fetch(`/api/komga/books/${book.id}/pages/${pageNumber}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const endTime = performance.now();

        // Logger la requête côté client seulement si le mode debug est activé et ce n'est pas une requête de debug
        if (!url.includes('/api/debug') && preferences.debug) {
          try {
            await fetch("/api/debug", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: `/api/komga/books/${book.id}/pages/${pageNumber}`,
                startTime,
                endTime,
                fromCache: false,
              }),
            });
          } catch {
            // Ignorer les erreurs de logging
          }
        }

        pageCache.current[pageNumber] = {
          blob,
          url,
          timestamp: Date.now(),
        };

        resolveLoading!();
      } catch (error) {
        console.error(`Erreur lors du préchargement de la page ${pageNumber}:`, error);
        delete pageCache.current[pageNumber];
        resolveLoading!();
      }
    },
    [book.id, pages.length, preferences.debug]
  );

  const getPageUrl = useCallback(
    async (pageNumber: number) => {
      if (pageCache.current[pageNumber]?.url) {
        // Logger l'utilisation du cache côté client seulement si le mode debug est activé et ce n'est pas une requête de debug
        const cacheUrl = `[CLIENT-CACHE] /api/komga/books/${book.id}/pages/${pageNumber}`;
        if (!cacheUrl.includes('/api/debug') && preferences.debug) {
          try {
            await fetch("/api/debug", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: cacheUrl,
                startTime: performance.now(),
                endTime: performance.now(),
                fromCache: true,
              }),
            });
          } catch {
            // Ignorer les erreurs de logging
          }
        }
        return pageCache.current[pageNumber].url;
      }

      if (pageCache.current[pageNumber]?.loading) {
        await pageCache.current[pageNumber].loading;
        return pageCache.current[pageNumber].url;
      }

      await preloadPage(pageNumber);
      return (
        pageCache.current[pageNumber]?.url ||
        `/api/komga/images/books/${book.id}/pages/${pageNumber}`
      );
    },
    [book.id, preloadPage, preferences.debug]
  );

  const cleanCache = useCallback(
    (currentPageNumber: number) => {
      const maxDistance = 8;
      const minPage = Math.max(1, currentPageNumber - maxDistance);
      const maxPage = Math.min(pages.length, currentPageNumber + maxDistance);

      Object.entries(pageCache.current).forEach(([pageNum, cache]) => {
        const page = parseInt(pageNum);
        if (page < minPage || page > maxPage) {
          URL.revokeObjectURL(cache.url);
          delete pageCache.current[page];
        }
      });
    },
    [pages.length]
  );

  return {
    preloadPage,
    getPageUrl,
    cleanCache,
  };
};
