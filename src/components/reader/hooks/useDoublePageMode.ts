import { useState, useCallback } from "react";
import { useOrientation } from "./useOrientation";
import { usePreferences } from "@/contexts/PreferencesContext";

export function useDoublePageMode(initial = false) {
  const isLandscape = useOrientation();
  const { updatePreferences } = usePreferences();
  const [isDoublePage, setIsDoublePage] = useState(initial);
  const [seenOrientation, setSeenOrientation] = useState<boolean | null>(isLandscape);

  // The saved preference wins when the reader opens. Only a real rotation
  // after the first measurement switches the mode (double page in landscape),
  // without persisting it. Adjusted during render, not in an effect.
  if (isLandscape !== seenOrientation) {
    setSeenOrientation(isLandscape);
    if (seenOrientation !== null && isLandscape !== null) {
      setIsDoublePage(isLandscape);
    }
  }

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
