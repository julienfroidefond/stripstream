import { useEffect } from "react";

interface UsePreloadPagesProps {
  currentPage: number;
  totalPages: number;
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  preloadPage: (page: number) => Promise<void>;
  cleanCache: (currentPage: number) => void;
}

export const usePreloadPages = ({
  currentPage,
  totalPages,
  isDoublePage,
  shouldShowDoublePage,
  preloadPage,
  cleanCache,
}: UsePreloadPagesProps) => {
  useEffect(() => {
    let isMounted = true;

    const preloadCurrentPages = async () => {
      if (!isMounted) return;

      await preloadPage(currentPage);

      if (!isMounted) return;

      if (isDoublePage && shouldShowDoublePage(currentPage)) {
        await preloadPage(currentPage + 1);
      }

      if (!isMounted) return;

      const pagesToPreload = [];

      // Précharger les 2 pages précédentes en priorité
      for (let i = 1; i <= 2 && currentPage - i >= 1; i++) {
        pagesToPreload.push(currentPage - i);
      }

      // Précharger les 4 pages suivantes
      for (let i = 1; i <= 4 && currentPage + i <= totalPages; i++) {
        pagesToPreload.push(currentPage + i);
      }

      for (const page of pagesToPreload) {
        if (!isMounted) break;
        await preloadPage(page);
      }
    };

    preloadCurrentPages();
    cleanCache(currentPage);

    return () => {
      isMounted = false;
    };
  }, [currentPage, isDoublePage, shouldShowDoublePage, preloadPage, cleanCache, totalPages]);
};
