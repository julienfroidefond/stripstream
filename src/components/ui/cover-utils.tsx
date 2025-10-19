import type { KomgaBook, KomgaSeries } from "@/types/komga";

export interface BaseCoverProps {
  alt?: string;
  className?: string;
  quality?: number;
  sizes?: string;
  showProgressUi?: boolean;
}

export interface BookCoverProps extends BaseCoverProps {
  book: KomgaBook;
  onSuccess?: (book: KomgaBook, action: "read" | "unread") => void;
  showControls?: boolean;
  showOverlay?: boolean;
  overlayVariant?: "default" | "home";
}

export interface SeriesCoverProps extends BaseCoverProps {
  series: KomgaSeries;
}

/**
 * Génère l'URL de base pour une image (sans cache version)
 * Utilisez useImageUrl() dans les composants pour obtenir l'URL avec cache busting
 */
export function getImageUrl(type: "series" | "book", id: string) {
  if (type === "series") {
    return `/api/komga/images/series/${id}/thumbnail`;
  }
  return `/api/komga/images/books/${id}/thumbnail`;
}
