import { useState, useEffect, useCallback } from "react";
import { useOrientation } from "./useOrientation";
import { updatePreferences } from "@/app/actions/preferences";

export function useDoublePageMode(initial = false) {
  const isLandscape = useOrientation();
  const [isDoublePage, setIsDoublePage] = useState(initial);

  // Auto double page en paysage
  useEffect(() => {
    setIsDoublePage(isLandscape);
  }, [isLandscape]);

  const shouldShowDoublePage = useCallback(
    (pageNumber: number, totalPages: number) => {
      const isMobile = window.innerHeight < 700;
      if (isMobile) return false;
      if (!isDoublePage) return false;
      if (pageNumber === 1) return false;
      return pageNumber < totalPages;
    },
    [isDoublePage]
  );

  const toggleDoublePage = useCallback(() => {
    setIsDoublePage((prev) => {
      const next = !prev;
      updatePreferences({ readerDoublePageMode: next }).catch((_err: unknown) => undefined);
      return next;
    });
  }, []);

  return {
    isDoublePage,
    setIsDoublePage,
    shouldShowDoublePage,
    toggleDoublePage,
  };
}
