import { useState, useCallback } from "react";
import { resolveBookMediaUrl } from "@/lib/providers/book-media";
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
    (pageNumber: number) =>
      resolveBookMediaUrl(book.media.thumbnailUrlTemplate, pageNumber),
    [book.media.thumbnailUrlTemplate]
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
