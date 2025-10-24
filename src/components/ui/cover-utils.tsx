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
