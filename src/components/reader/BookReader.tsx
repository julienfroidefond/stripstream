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
import { cn } from "@/lib/utils";
import { ImageLoader } from "@/components/ui/image-loader";

interface PageCache {
  [pageNumber: number]: {
    blob: Blob;
    url: string;
    timestamp: number;
    loading?: Promise<void>;
  };
}

interface BookReaderProps {
  book: KomgaBook;
  pages: number[];
  onClose?: () => void;
}

// Ajout du hook pour détecter l'orientation
const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Vérifier si la fenêtre est plus large que haute
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    // Vérification initiale
    checkOrientation();

    // Écouter les changements de taille de fenêtre
    window.addEventListener("resize", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);

  return isLandscape;
};

export function BookReader({ book, pages, onClose }: BookReaderProps) {
  const [currentPage, setCurrentPage] = useState(book.readProgress?.page || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [secondPageLoading, setSecondPageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDoublePage, setIsDoublePage] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const pageCache = useRef<PageCache>({});
  const isLandscape = useOrientation();

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
      const newPage = isDoublePage && currentPage > 2 ? currentPage - 2 : currentPage - 1;
      setCurrentPage(newPage);
      setIsLoading(true);
      setSecondPageLoading(true);
      setImageError(false);

      // Synchroniser la progression après un court délai
      const timer = setTimeout(() => {
        syncReadProgress(newPage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage, isDoublePage, syncReadProgress]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      const newPage = isDoublePage ? Math.min(currentPage + 2, pages.length) : currentPage + 1;
      setCurrentPage(newPage);
      setIsLoading(true);
      setSecondPageLoading(true);
      setImageError(false);

      // Synchroniser la progression après un court délai
      const timer = setTimeout(() => {
        syncReadProgress(newPage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage, pages.length, isDoublePage, syncReadProgress]);

  // Réinitialiser l'état de chargement lors du changement de mode double page
  useEffect(() => {
    setIsLoading(true);
    setSecondPageLoading(true);
  }, [isDoublePage]);

  // Fonction pour précharger une page
  const preloadPage = useCallback(
    async (pageNumber: number) => {
      if (pageNumber > pages.length || pageNumber < 1) return;

      // Si la page est déjà en cache, on ne fait rien
      if (pageCache.current[pageNumber]?.url) return;

      // Si la page est en cours de chargement, on attend
      if (pageCache.current[pageNumber]?.loading) {
        await pageCache.current[pageNumber].loading;
        return;
      }

      // On crée une promesse pour le chargement
      let resolveLoading: () => void;
      const loadingPromise = new Promise<void>((resolve) => {
        resolveLoading = resolve;
      });

      // On initialise l'entrée dans le cache avec la promesse de chargement
      pageCache.current[pageNumber] = {
        ...pageCache.current[pageNumber],
        loading: loadingPromise,
      };

      try {
        const response = await fetch(`/api/komga/books/${book.id}/pages/${pageNumber}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        pageCache.current[pageNumber] = {
          blob,
          url,
          timestamp: Date.now(),
        };

        resolveLoading!();
      } catch (error) {
        console.error(`Erreur lors du préchargement de la page ${pageNumber}:`, error);
        delete pageCache.current[pageNumber];
        resolveLoading!();
      }
    },
    [book.id, pages.length]
  );

  // Fonction pour obtenir l'URL d'une page
  const getPageUrl = useCallback(
    async (pageNumber: number) => {
      // Si la page est dans le cache, utiliser l'URL du cache
      if (pageCache.current[pageNumber]?.url) {
        return pageCache.current[pageNumber].url;
      }

      // Si la page est en cours de chargement, attendre
      if (pageCache.current[pageNumber]?.loading) {
        await pageCache.current[pageNumber].loading;
        return pageCache.current[pageNumber].url;
      }

      // Sinon, lancer le préchargement et attendre
      await preloadPage(pageNumber);
      return (
        pageCache.current[pageNumber]?.url ||
        `/api/komga/images/books/${book.id}/pages/${pageNumber}`
      );
    },
    [book.id, preloadPage]
  );

  // État pour stocker les URLs des images
  const [currentPageUrl, setCurrentPageUrl] = useState<string>("");
  const [nextPageUrl, setNextPageUrl] = useState<string>("");

  // Effet pour charger les URLs des images
  useEffect(() => {
    let isMounted = true;

    const loadPageUrls = async () => {
      try {
        const url = await getPageUrl(currentPage);
        if (isMounted) {
          setCurrentPageUrl(url);
          setIsLoading(false);
        }

        if (isDoublePage && shouldShowDoublePage(currentPage)) {
          const nextUrl = await getPageUrl(currentPage + 1);
          if (isMounted) {
            setNextPageUrl(nextUrl);
            setSecondPageLoading(false);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des URLs:", error);
        setImageError(true);
      }
    };

    setIsLoading(true);
    setSecondPageLoading(true);
    loadPageUrls();

    return () => {
      isMounted = false;
    };
  }, [currentPage, isDoublePage, shouldShowDoublePage, getPageUrl]);

  // Fonction pour obtenir l'URL d'une miniature
  const getThumbnailUrl = useCallback(
    (pageNumber: number) => {
      return `/api/komga/images/books/${book.id}/pages/${pageNumber}/thumbnail`;
    },
    [book.id]
  );

  // Nettoyer le cache des pages trop anciennes
  const cleanCache = useCallback(
    (currentPageNumber: number) => {
      const maxDistance = 8; // On garde plus de pages en cache
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

  // Effet pour précharger la page courante et les pages adjacentes
  useEffect(() => {
    let isMounted = true;

    const preloadCurrentPages = async () => {
      if (!isMounted) return;

      // Précharger la page courante
      await preloadPage(currentPage);

      if (!isMounted) return;

      // En mode double page, précharger la page suivante si nécessaire
      if (isDoublePage && shouldShowDoublePage(currentPage)) {
        await preloadPage(currentPage + 1);
      }

      if (!isMounted) return;

      // Précharger les pages suivantes et précédentes
      const pagesToPreload = [];

      // Pages suivantes (max 4)
      for (let i = 1; i <= 4 && currentPage + i <= pages.length; i++) {
        pagesToPreload.push(currentPage + i);
      }

      // Pages précédentes (max 2)
      for (let i = 1; i <= 2 && currentPage - i >= 1; i++) {
        pagesToPreload.push(currentPage - i);
      }

      // Précharger en séquence pour éviter de surcharger
      for (const page of pagesToPreload) {
        if (!isMounted) break;
        await preloadPage(page);
      }
    };

    preloadCurrentPages();
    cleanCache(currentPage);

    return () => {
      isMounted = false;
    };
  }, [currentPage, isDoublePage, shouldShowDoublePage, preloadPage, cleanCache, pages.length]);

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

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Seuil minimum de déplacement pour déclencher un swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPage < pages.length) {
      handleNextPage();
    }
    if (isRightSwipe && currentPage > 1) {
      handlePreviousPage();
    }
  };

  // Effet pour gérer le mode double page automatiquement en paysage
  useEffect(() => {
    setIsDoublePage(isLandscape);
  }, [isLandscape]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
      <div
        className="relative h-full flex flex-col items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => setShowControls(!showControls)}
      >
        {/* Contenu principal */}
        <div className="relative h-full w-full flex items-center justify-center">
          {/* Boutons en haut */}
          <div
            className={cn(
              "absolute top-4 left-4 flex items-center gap-2 z-30 transition-all duration-300",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDoublePage(!isDoublePage);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                setShowNavigation(!showNavigation);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                handlePreviousPage();
              }}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-20",
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {/* Pages */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden p-1">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Page courante */}
              <div className="relative max-h-[calc(100vh-2rem)] flex items-center justify-center">
                <ImageLoader isLoading={isLoading} />
                {currentPageUrl && (
                  <img
                    src={currentPageUrl}
                    alt={`Page ${currentPage}`}
                    className={cn(
                      "max-h-[calc(100vh-2rem)] w-auto object-contain transition-opacity duration-300",
                      isLoading ? "opacity-0" : "opacity-100"
                    )}
                    onLoad={() => {
                      setIsLoading(false);
                      handleThumbnailLoad(currentPage);
                    }}
                  />
                )}
              </div>

              {/* Deuxième page en mode double page */}
              {isDoublePage && shouldShowDoublePage(currentPage) && (
                <div className="relative max-h-[calc(100vh-2rem)] flex items-center justify-center">
                  <ImageLoader isLoading={secondPageLoading} />
                  {nextPageUrl && (
                    <img
                      src={nextPageUrl}
                      alt={`Page ${currentPage + 1}`}
                      className={cn(
                        "max-h-[calc(100vh-2rem)] w-auto object-contain transition-opacity duration-300",
                        secondPageLoading ? "opacity-0" : "opacity-100"
                      )}
                      onLoad={() => {
                        setSecondPageLoading(false);
                        handleThumbnailLoad(currentPage + 1);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Bouton suivant */}
          {currentPage < pages.length && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextPage();
              }}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-20",
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="Page suivante"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          {/* Bouton fermer */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={cn(
                "absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-30",
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
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
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-background/50 backdrop-blur-sm border-t border-border/40 transition-all duration-300 ease-in-out z-30",
            showNavigation ? "h-48 opacity-100" : "h-0 opacity-0",
            showControls ? "" : "pointer-events-none"
          )}
        >
          {showNavigation && (
            <>
              <div className="absolute inset-y-0 left-4 flex items-center z-40">
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
                className="h-full mx-16 overflow-x-auto flex items-center gap-2 px-4 scroll-smooth"
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
                      className={`relative h-40 w-28 flex-shrink-0 rounded-md overflow-hidden transition-all cursor-pointer ${
                        currentPage === pageNumber
                          ? "ring-2 ring-primary scale-110 z-10"
                          : "opacity-60 hover:opacity-100 hover:scale-105"
                      }`}
                    >
                      {isVisible && (
                        <>
                          <ImageLoader isLoading={!loadedThumbnails[pageNumber]} />
                          <Image
                            src={getThumbnailUrl(pageNumber)}
                            alt={`Miniature page ${pageNumber}`}
                            className={cn(
                              "object-cover transition-opacity duration-300",
                              !loadedThumbnails[pageNumber] ? "opacity-0" : "opacity-100"
                            )}
                            fill
                            sizes="100px"
                            onLoad={() => handleThumbnailLoad(pageNumber)}
                            loading="lazy"
                            quality={50}
                          />
                        </>
                      )}
                      <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                        <span className="text-sm text-white font-medium">{pageNumber}</span>
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
