import { useState, useCallback, useEffect } from "react";
import { KomgaBook } from "@/types/komga";

interface UseThumbnailsProps {
  book: KomgaBook;
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
      return `/api/komga/images/books/${book.id}/pages/${pageNumber}/thumbnail?zero_based=true`;
    },
    [book.id]
  );

  // Mettre à jour les thumbnails visibles autour de la page courante
  useEffect(() => {
    const windowSize = 10; // Nombre de pages à charger de chaque côté
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
