import type { KomgaBook } from "@/types/komga";

export interface PageCache {
  [pageNumber: number]: {
    blob: Blob;
    url: string;
    timestamp: number;
    loading?: Promise<void>;
  };
}

export interface BookReaderProps {
  book: KomgaBook;
  pages: number[];
  onClose?: (currentPage: number) => void;
  nextBook?: KomgaBook | null;
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
  book: KomgaBook;
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
}

export interface UsePageNavigationProps {
  book: KomgaBook;
  pages: number[];
  isDoublePage: boolean;
  onClose?: () => void;
  direction: "ltr" | "rtl";
}
