import type { NormalizedBook } from "@/lib/providers/types";

export interface PageCache {
  [pageNumber: number]: {
    blob: Blob;
    url: string;
    timestamp: number;
    loading?: Promise<void>;
  };
}

export interface BookReaderProps {
  book: NormalizedBook;
  pages: number[];
  onClose?: (currentPage: number) => void;
  nextBook?: NormalizedBook | null;
}

export interface ThumbnailProps {
  pageNumber: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  getThumbnailUrl: (pageNumber: number) => string;
  loadedThumbnails: { [key: number]: boolean };
  onThumbnailLoad: (pageNumber: number) => void;
  isVisible: boolean;
}

export interface NavigationBarProps {
  currentPage: number;
  pages: number[];
  onPageChange: (page: number) => void;
  showControls: boolean;
  showThumbnails: boolean;
  book: NormalizedBook;
}

export interface ControlButtonsProps {
  showControls: boolean;
  onToggleControls: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageChange: (page: number) => void;
  onClose?: (currentPage: number) => void;
  currentPage: number;
  totalPages: number;
  isDoublePage: boolean;
  onToggleDoublePage: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  direction: "ltr" | "rtl";
  onToggleDirection: () => void;
  showThumbnails: boolean;
  onToggleThumbnails: () => void;
  onZoom: () => void;
  onForceReload: () => void;
}

export interface UsePageNavigationProps {
  book: NormalizedBook;
  pages: number[];
  isDoublePage: boolean;
  onClose?: () => void;
  direction: "ltr" | "rtl";
}
