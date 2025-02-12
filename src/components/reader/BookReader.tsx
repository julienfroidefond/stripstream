"use client";

import { KomgaBook } from "@/types/komga";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
  LayoutTemplate,
  SplitSquareVertical,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";

interface PageCache {
  [pageNumber: number]: {
    blob: Blob;
    url: string;
    timestamp: number;
  };
}

interface BookReaderProps {
  book: KomgaBook;
  pages: number[];
  onClose?: () => void;
}

export function BookReader({ book, pages, onClose }: BookReaderProps) {
  const [currentPage, setCurrentPage] = useState(book.readProgress?.page || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDoublePage, setIsDoublePage] = useState(false);
  const pageCache = useRef<PageCache>({});

  // Effet pour synchroniser la progression initiale
  useEffect(() => {
    if (book.readProgress?.page) {
      syncReadProgress(book.readProgress.page);
    }
  }, []);

  // Fonction pour synchroniser la progression
  const syncReadProgress = useCallback(
    async (page: number) => {
      try {
        const completed = page === pages.length;
        await fetch(`/api/komga/books/${book.id}/read-progress`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page, completed }),
        });
      } catch (error) {
        console.error("Erreur lors de la synchronisation de la progression:", error);
      }
    },
    [book.id, pages.length]
  );

  // Fonction pour déterminer si on doit afficher une ou deux pages
  const shouldShowDoublePage = useCallback(
    (pageNumber: number) => {
      if (!isDoublePage) return false;
      // Toujours afficher la première page seule (couverture)
      if (pageNumber === 1) return false;
      // Vérifier si on a une page suivante disponible
      return pageNumber < pages.length;
    },
    [isDoublePage, pages.length]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      // En mode double page, reculer de 2 pages sauf si on est sur la page 2
      const newPage = isDoublePage && currentPage > 2 ? currentPage - 2 : currentPage - 1;
      setCurrentPage(newPage);
      setIsLoading(true);
      setImageError(false);
      syncReadProgress(newPage);
    }
  }, [currentPage, isDoublePage, syncReadProgress]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      // En mode double page, avancer de 2 pages sauf si c'est la dernière paire
      const newPage = isDoublePage ? Math.min(currentPage + 2, pages.length) : currentPage + 1;
      setCurrentPage(newPage);
      setIsLoading(true);
      setImageError(false);
      syncReadProgress(newPage);
    }
  }, [currentPage, pages.length, isDoublePage, syncReadProgress]);

  // Fonction pour précharger une page
  const preloadPage = useCallback(
    async (pageNumber: number) => {
      if (pageNumber > pages.length || pageNumber < 1 || pageCache.current[pageNumber]) return;

      try {
        const response = await fetch(`/api/komga/books/${book.id}/pages/${pageNumber}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        pageCache.current[pageNumber] = {
          blob,
          url,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error(`Erreur lors du préchargement de la page ${pageNumber}:`, error);
      }
    },
    [book.id, pages.length]
  );

  // Fonction pour précharger les prochaines pages
  const preloadNextPages = useCallback(
    async (currentPageNumber: number, count: number = 2) => {
      const pagesToPreload = Array.from(
        { length: count },
        (_, i) => currentPageNumber + i + 1
      ).filter((page) => page <= pages.length);

      await Promise.all(pagesToPreload.map(preloadPage));
    },
    [pages.length, preloadPage]
  );

  // Nettoyer le cache des pages trop anciennes
  const cleanCache = useCallback(
    (currentPageNumber: number, maxDistance: number = 5) => {
      const minPage = Math.max(1, currentPageNumber - maxDistance);
      const maxPage = Math.min(pages.length, currentPageNumber + maxDistance);

      Object.entries(pageCache.current).forEach(([pageNum, cache]) => {
        const page = parseInt(pageNum);
        if (page < minPage || page > maxPage) {
          URL.revokeObjectURL(cache.url);
          delete pageCache.current[page];
        }
      });
    },
    [pages.length]
  );

  // Fonction pour obtenir l'URL d'une page (depuis le cache ou générée)
  const getPageUrl = useCallback(
    (pageNumber: number) => {
      const cached = pageCache.current[pageNumber];
      if (cached) return cached.url;
      return `/api/komga/books/${book.id}/pages/${pageNumber}`;
    },
    [book.id]
  );

  // Effet pour précharger les pages au changement de page
  useEffect(() => {
    preloadNextPages(currentPage);
    cleanCache(currentPage);
  }, [currentPage, preloadNextPages, cleanCache]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        handlePreviousPage();
      } else if (event.key === "ArrowRight") {
        handleNextPage();
      } else if (event.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePreviousPage, handleNextPage, onClose]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="relative h-full flex items-center justify-center">
        {/* Bouton mode double page */}
        <button
          onClick={() => setIsDoublePage(!isDoublePage)}
          className="absolute top-4 left-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          aria-label={
            isDoublePage ? "Désactiver le mode double page" : "Activer le mode double page"
          }
        >
          {isDoublePage ? (
            <LayoutTemplate className="h-6 w-6" />
          ) : (
            <SplitSquareVertical className="h-6 w-6" />
          )}
        </button>

        {/* Bouton précédent */}
        {currentPage > 1 && (
          <button
            onClick={handlePreviousPage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* Pages */}
        <div className="relative h-full max-h-full w-auto max-w-full p-4 flex gap-2">
          {/* Page courante */}
          <div className="relative h-full w-auto">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {!imageError ? (
              <Image
                src={getPageUrl(currentPage)}
                alt={`Page ${currentPage}`}
                className="h-full w-auto object-contain"
                width={800}
                height={1200}
                priority
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setImageError(true);
                }}
              />
            ) : (
              <div className="h-full w-96 flex items-center justify-center bg-muted rounded-lg">
                <ImageOff className="h-12 w-12" />
              </div>
            )}
          </div>

          {/* Deuxième page en mode double page */}
          {shouldShowDoublePage(currentPage) && (
            <div className="relative h-full w-auto">
              <Image
                src={getPageUrl(currentPage + 1)}
                alt={`Page ${currentPage + 1}`}
                className="h-full w-auto object-contain"
                width={800}
                height={1200}
                priority
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>

        {/* Bouton suivant */}
        {currentPage < pages.length && (
          <button
            onClick={handleNextPage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            aria-label="Page suivante"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* Indicateur de page */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/50 text-sm">
          Page {currentPage}
          {shouldShowDoublePage(currentPage) ? `-${currentPage + 1}` : ""} / {pages.length}
        </div>

        {/* Bouton fermer */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
            aria-label="Fermer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
