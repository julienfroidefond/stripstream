import { useState, useEffect, useCallback } from "react";
import { useOrientation } from "./useOrientation";

export function useDoublePageMode() {
  const isLandscape = useOrientation();
  const [isDoublePage, setIsDoublePage] = useState(false);

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
    setIsDoublePage((prev) => !prev);
  }, []);

  return {
    isDoublePage,
    setIsDoublePage,
    shouldShowDoublePage,
    toggleDoublePage,
  };
}
