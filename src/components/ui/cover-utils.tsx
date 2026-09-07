import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";

export interface BaseCoverProps {
  alt?: string;
  className?: string;
  quality?: number;
  sizes?: string;
  showProgressUi?: boolean;
}

export interface BookCoverProps extends BaseCoverProps {
  book: NormalizedBook;
  onSuccess?: (book: NormalizedBook, action: "read" | "unread") => void;
  showControls?: boolean;
  showOverlay?: boolean;
  overlayVariant?: "default" | "home";
  /** Allows a parent that already checks offline availability to reuse its result. */
  offlineStatus?: { isAccessible: boolean };
}

export interface SeriesCoverProps extends BaseCoverProps {
  series: NormalizedSeries;
  isAnonymous?: boolean;
}
