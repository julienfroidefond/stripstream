"use client";

import { KomgaBook } from "@/types/komga";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
  LayoutTemplate,
  SplitSquareVertical,
  ChevronUp,
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
  const [showNavigation, setShowNavigation] = useState(false);
  const pageCache = useRef<PageCache>({});

  // Ajout d'un état pour le chargement des miniatures
  const [loadedThumbnails, setLoadedThumbnails] = useState<{ [key: number]: boolean }>({});

  // Ajout d'un état pour les miniatures visibles
  const [visibleThumbnails, setVisibleThumbnails] = useState<number[]>([]);
  const thumbnailObserver = useRef<IntersectionObserver | null>(null);
  const thumbnailRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

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

  // Fonction pour obtenir l'URL d'une page
  const getPageUrl = useCallback(
    (pageNumber: number) => {
      return `/api/komga/images/books/${book.id}/pages/${pageNumber}`;
    },
    [book.id]
  );

  // Fonction pour obtenir l'URL d'une miniature
  const getThumbnailUrl = useCallback(
    (pageNumber: number) => {
      return `/api/komga/images/books/${book.id}/pages/${pageNumber}/thumbnail`;
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

  // Fonction pour marquer une miniature comme chargée
  const handleThumbnailLoad = (pageNumber: number) => {
    setLoadedThumbnails((prev) => ({ ...prev, [pageNumber]: true }));
  };

  // Fonction pour scroller jusqu'à la miniature active
  const scrollToActiveThumbnail = useCallback(() => {
    const container = document.getElementById("thumbnails-container");
    const activeThumbnail = document.getElementById(`thumbnail-${currentPage}`);
    if (container && activeThumbnail) {
      const containerWidth = container.clientWidth;
      const thumbnailLeft = activeThumbnail.offsetLeft;
      const thumbnailWidth = activeThumbnail.clientWidth;

      // Centrer la miniature dans le conteneur
      container.scrollLeft = thumbnailLeft - containerWidth / 2 + thumbnailWidth / 2;
    }
  }, [currentPage]);

  // Effet pour scroller jusqu'à la miniature active au chargement et au changement de page
  useEffect(() => {
    if (showNavigation) {
      scrollToActiveThumbnail();
    }
  }, [currentPage, showNavigation, scrollToActiveThumbnail]);

  // Effet pour scroller jusqu'à la miniature active quand la navigation devient visible
  useEffect(() => {
    if (showNavigation) {
      // Petit délai pour laisser le temps à la barre de s'afficher
      const timer = setTimeout(() => {
        scrollToActiveThumbnail();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showNavigation, scrollToActiveThumbnail]);

  // Fonction pour calculer les miniatures à afficher autour de la page courante
  const updateVisibleThumbnails = useCallback(() => {
    const windowSize = 20; // Nombre de miniatures à charger de chaque côté
    const start = Math.max(1, currentPage - windowSize);
    const end = Math.min(pages.length, currentPage + windowSize);
    const visibleRange = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    setVisibleThumbnails(visibleRange);
  }, [currentPage, pages.length]);

  // Effet pour mettre à jour les miniatures visibles lors du changement de page
  useEffect(() => {
    updateVisibleThumbnails();
  }, [currentPage, updateVisibleThumbnails]);

  // Fonction pour observer les miniatures
  const observeThumbnail = useCallback(
    (pageNumber: number) => {
      if (!thumbnailRefs.current[pageNumber]) return;

      if (!thumbnailObserver.current) {
        thumbnailObserver.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const pageNumber = parseInt(entry.target.getAttribute("data-page") || "0");
              if (entry.isIntersecting && !loadedThumbnails[pageNumber]) {
                // Charger la miniature uniquement si elle devient visible
                setLoadedThumbnails((prev) => ({ ...prev, [pageNumber]: false }));
              }
            });
          },
          {
            root: document.getElementById("thumbnails-container"),
            rootMargin: "50px",
            threshold: 0.1,
          }
        );
      }

      thumbnailObserver.current.observe(thumbnailRefs.current[pageNumber]);
    },
    [loadedThumbnails]
  );

  // Nettoyer l'observer
  useEffect(() => {
    return () => {
      if (thumbnailObserver.current) {
        thumbnailObserver.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="relative h-full flex flex-col items-center justify-center">
        {/* Contenu principal */}
        <div className="relative h-full w-full flex items-center justify-center">
          {/* Boutons en haut */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-30">
            <button
              onClick={() => setIsDoublePage(!isDoublePage)}
              className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
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
            <button
              onClick={() => setShowNavigation(!showNavigation)}
              className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
              aria-label={showNavigation ? "Masquer la navigation" : "Afficher la navigation"}
            >
              <ChevronUp
                className={`h-6 w-6 transition-transform duration-200 ${
                  showNavigation ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Bouton précédent */}
          {currentPage > 1 && (
            <button
              onClick={handlePreviousPage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors z-20"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Pages */}
          <div className="relative h-full max-h-full w-auto max-w-full p-4 flex gap-2 z-10">
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
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors z-20"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Bouton fermer */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors z-30"
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

        {/* Barre de navigation des pages */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-background/50 backdrop-blur-sm border-t border-border/40 transition-all duration-300 ease-in-out ${
            showNavigation ? "h-32 opacity-100" : "h-0 opacity-0"
          }`}
        >
          {showNavigation && (
            <>
              <div className="absolute inset-y-0 left-4 flex items-center">
                <button
                  onClick={() => {
                    const container = document.getElementById("thumbnails-container");
                    if (container) {
                      container.scrollLeft -= container.clientWidth;
                    }
                  }}
                  className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
                  aria-label="Pages précédentes"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              </div>

              <div
                id="thumbnails-container"
                className="h-full mx-16 overflow-x-auto flex items-center gap-2 px-4 hide-scrollbar scroll-smooth"
              >
                {pages.map((_, index) => {
                  const pageNumber = index + 1;
                  const isVisible = visibleThumbnails.includes(pageNumber);

                  return (
                    <button
                      key={pageNumber}
                      ref={(el) => {
                        thumbnailRefs.current[pageNumber] = el;
                        if (el) observeThumbnail(pageNumber);
                      }}
                      data-page={pageNumber}
                      id={`thumbnail-${pageNumber}`}
                      onClick={() => {
                        setCurrentPage(pageNumber);
                        setIsLoading(true);
                        setImageError(false);
                        syncReadProgress(pageNumber);
                      }}
                      className={`relative h-24 w-16 flex-shrink-0 rounded-md overflow-hidden transition-all cursor-pointer ${
                        currentPage === pageNumber
                          ? "ring-2 ring-primary scale-110 z-10"
                          : "opacity-60 hover:opacity-100 hover:scale-105"
                      }`}
                    >
                      {!loadedThumbnails[pageNumber] && isVisible && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                      {isVisible && (
                        <Image
                          src={getThumbnailUrl(pageNumber)}
                          alt={`Miniature page ${pageNumber}`}
                          className="object-cover"
                          fill
                          sizes="100px"
                          onLoad={() => handleThumbnailLoad(pageNumber)}
                          loading="lazy"
                          quality={50}
                        />
                      )}
                      <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{pageNumber}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="absolute inset-y-0 right-4 flex items-center">
                <button
                  onClick={() => {
                    const container = document.getElementById("thumbnails-container");
                    if (container) {
                      container.scrollLeft += container.clientWidth;
                    }
                  }}
                  className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
                  aria-label="Pages suivantes"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Indicateur de page */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-4 py-2 rounded-full bg-background/50 text-sm">
                Page {currentPage}
                {shouldShowDoublePage(currentPage) ? `-${currentPage + 1}` : ""} / {pages.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
