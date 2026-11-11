import { useState, useEffect, useCallback } from "react";
import { useOrientation } from "./useOrientation";
import { usePreferences } from "@/contexts/PreferencesContext";

export function useDoublePageMode(initial = false) {
  const isLandscape = useOrientation();
  const { updatePreferences } = usePreferences();
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
    const next = !isDoublePage;
    setIsDoublePage(next);
    void updatePreferences({ readerDoublePageMode: next });
  }, [isDoublePage, updatePreferences]);

  return {
    isDoublePage,
    setIsDoublePage,
    shouldShowDoublePage,
    toggleDoublePage,
  };
}
