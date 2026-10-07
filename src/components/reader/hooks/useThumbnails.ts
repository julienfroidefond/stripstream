import { useState, useCallback } from "react";
import type { NormalizedBook } from "@/lib/providers/types";

interface UseThumbnailsProps {
  book: NormalizedBook;
  currentPage: number;
}

export const useThumbnails = ({ book, currentPage }: UseThumbnailsProps) => {
  const [loadedThumbnails, setLoadedThumbnails] = useState<{ [key: number]: boolean }>({});

  const handleThumbnailLoad = useCallback((pageNumber: number) => {
    setLoadedThumbnails((prev) => ({ ...prev, [pageNumber]: true }));
  }, []);

  const getThumbnailUrl = useCallback(
    (pageNumber: number) => {
      // Derive page URL from the book's thumbnailUrl provider pattern
      if (book.thumbnailUrl.startsWith("/api/stripstream/")) {
        return `/api/stripstream/images/books/${book.id}/pages/${pageNumber}`;
      }
      return `/api/komga/images/books/${book.id}/pages/${pageNumber}/thumbnail?zero_based=true`;
    },
    [book.id, book.thumbnailUrl]
  );

  // Dérivé directement pendant le rendu (fenêtre désactivée : seule la page courante est visible).
  const visibleThumbnails = [currentPage];

  const scrollToActiveThumbnail = useCallback(() => {
    const thumbnail = document.getElementById(`thumbnail-${currentPage}`);
    if (thumbnail) {
      thumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentPage]);

  return {
    loadedThumbnails,
    handleThumbnailLoad,
    getThumbnailUrl,
    visibleThumbnails,
    scrollToActiveThumbnail,
  };
};
