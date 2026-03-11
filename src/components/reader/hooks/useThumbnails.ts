import { useState, useCallback, useEffect } from "react";
import type { NormalizedBook } from "@/lib/providers/types";

interface UseThumbnailsProps {
  book: NormalizedBook;
  currentPage: number;
}

export const useThumbnails = ({ book, currentPage }: UseThumbnailsProps) => {
  const [loadedThumbnails, setLoadedThumbnails] = useState<{ [key: number]: boolean }>({});
  const [visibleThumbnails, setVisibleThumbnails] = useState<number[]>([]);

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

  // Mettre à jour les thumbnails visibles autour de la page courante
  useEffect(() => {
    const windowSize = 0; // DÉSACTIVÉ TEMPORAIREMENT: Thumbnails désactivés pour éviter de surcharger Komga
    const start = Math.max(1, currentPage - windowSize);
    const end = currentPage + windowSize;
    const newVisibleThumbnails = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    setVisibleThumbnails(newVisibleThumbnails);
  }, [currentPage]);

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
