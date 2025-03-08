"use client";

import { useState, useEffect, useRef } from "react";
import type { KomgaBook } from "@/types/komga";
import { useTranslate } from "@/hooks/useTranslate";
import { Button } from "@/components/ui/button";
import { useFullscreen } from "./hooks/useFullscreen";
import { ReactReader } from "react-reader";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

// Styles pour masquer les contrôles par défaut de ReactReader
const readerStyles = `
  /* Masquer tous les boutons et éléments cliquables */
  .epub-container button,
  .epub-container [role="button"],
  .epub-container a,
  .epub-container [onclick],
  .epub-container [class*="button"],
  .epub-container [id*="button"],
  .epub-container [aria-label*="button"],
  .epub-container [aria-label*="close"],
  .epub-container [aria-label*="fermer"],
  .epub-container [aria-label*="navigation"],
  .epub-container [aria-label*="menu"],
  .epub-container [tabindex]:not([tabindex="-1"]) {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    position: absolute !important;
    z-index: -9999 !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
  }
  
  /* Masquer spécifiquement les flèches de navigation */
  .epub-container .arrow-wrapper,
  .epub-container [class*="arrow"],
  .epub-container [id*="arrow"],
  .epub-container svg[viewBox*="0 0 24 24"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  
  /* Masquer la barre de navigation */
  .epub-container .epub-nav,
  .epub-container [class*="nav"],
  .epub-container [id*="nav"],
  .epub-container header,
  .epub-container nav {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  
  /* Masquer le titre */
  .epub-container .epub-title,
  .epub-container [class*="title"],
  .epub-container [id*="title"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  
  /* Supprimer le padding pour utiliser tout l'espace disponible */
  .epub-container .epub-view-container {
    padding: 0 !important;
  }
  
  /* Masquer tous les éléments positionnés en haut à gauche ou en haut à droite */
  .epub-container > div > div > *:first-child:not(.epub-view) {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }
`;

interface EpubReaderProps {
  book: KomgaBook;
  onClose?: (currentPage: number) => void;
  nextBook?: KomgaBook | null;
}

export function EpubReader({ book, onClose, nextBook }: EpubReaderProps) {
  const [location, setLocation] = useState<string | number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [epubUrl, setEpubUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);
  const [fontSize, setFontSize] = useState(100); // Taille de police en pourcentage

  const readerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { t } = useTranslate();

  // Télécharger le fichier EPUB
  useEffect(() => {
    const fetchEpub = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Utiliser directement l'URL de l'API avec un timestamp pour éviter le cache
        const directUrl = `/api/komga/books/${book.id}/file?t=${Date.now()}`;

        // Télécharger le fichier EPUB
        const response = await fetch(directUrl);

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }

        // Lire le contenu du fichier
        const blob = await response.blob();

        // Créer un URL pour le blob
        const url = URL.createObjectURL(blob);

        // Définir l'URL du fichier EPUB
        setEpubUrl(url);
        setIsLoading(false);
      } catch (err) {
        setError(
          `Erreur lors du téléchargement: ${err instanceof Error ? err.message : String(err)}`
        );
        setIsLoading(false);
      }
    };

    fetchEpub();

    // Nettoyer l'URL du blob lorsque le composant est démonté
    return () => {
      if (epubUrl) {
        URL.revokeObjectURL(epubUrl);
      }

      // Nettoyer le timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [book.id]);

  // Supprimer les boutons de navigation après le montage du composant
  useEffect(() => {
    const removeNavigationButtons = () => {
      // Attendre que le DOM soit complètement chargé
      const checkAndRemoveElements = () => {
        if (readerRef.current) {
          // Fonction pour masquer un élément
          const hideElement = (element: Element) => {
            const htmlElement = element as HTMLElement;
            htmlElement.style.display = "none";
            htmlElement.style.opacity = "0";
            htmlElement.style.visibility = "hidden";
            htmlElement.style.pointerEvents = "none";
            htmlElement.style.position = "absolute";
            htmlElement.style.zIndex = "-9999";
            htmlElement.style.width = "0";
            htmlElement.style.height = "0";
            htmlElement.style.overflow = "hidden";
          };

          // Sélectionner tous les éléments qui pourraient être des boutons
          const buttons = readerRef.current.querySelectorAll(
            '.epub-container button, .epub-container [role="button"], .epub-container a, .epub-container [onclick]'
          );
          buttons.forEach(hideElement);

          // Sélectionner les éléments par position (en haut à gauche/droite)
          const container = readerRef.current.querySelector(".epub-container");
          if (container) {
            // Parcourir tous les éléments enfants directs du conteneur
            const children = container.children;
            for (let i = 0; i < children.length; i++) {
              const child = children[i] as HTMLElement;
              // Vérifier si l'élément est positionné en haut
              const rect = child.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();

              // Si l'élément est dans le premier quart supérieur de la page
              if (rect.top < containerRect.top + containerRect.height / 4) {
                // Et s'il n'est pas notre contenu principal
                if (
                  !child.classList.contains("epub-view") &&
                  !child.classList.contains("epub-view-container")
                ) {
                  hideElement(child);
                }
              }
            }

            // Rechercher tous les éléments SVG qui pourraient être des boutons de fermeture
            const svgs = container.querySelectorAll("svg");
            svgs.forEach((svg) => {
              // Vérifier si c'est un SVG positionné en haut à gauche ou à droite
              const rect = svg.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();

              // Si l'élément est dans le premier quart supérieur de la page
              if (rect.top < containerRect.top + containerRect.height / 4) {
                hideElement(svg);

                // Masquer également le parent du SVG s'il s'agit d'un bouton
                let parent = svg.parentElement;
                while (parent && parent !== container) {
                  hideElement(parent);
                  parent = parent.parentElement;
                }
              }
            });

            // Rechercher tous les éléments qui sont positionnés de manière absolue
            const allElements = container.querySelectorAll("*");
            allElements.forEach((el) => {
              const element = el as HTMLElement;
              const style = window.getComputedStyle(element);

              // Si l'élément est positionné de manière absolue et est en haut de la page
              if (style.position === "absolute" || style.position === "fixed") {
                const rect = element.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Si l'élément est dans le premier quart supérieur de la page
                if (rect.top < containerRect.top + containerRect.height / 4) {
                  // Et s'il n'est pas notre contenu principal
                  if (
                    !element.classList.contains("epub-view") &&
                    !element.classList.contains("epub-view-container") &&
                    !element.closest(".epub-view") // Ne pas masquer les éléments à l'intérieur du contenu
                  ) {
                    hideElement(element);
                  }
                }
              }
            });
          }

          // Masquer également les premiers éléments enfants qui pourraient être des barres de navigation
          const firstChildren = readerRef.current.querySelectorAll(
            ".epub-container > div > div > *:first-child:not(.epub-view)"
          );
          firstChildren.forEach(hideElement);
        }
      };

      // Exécuter plusieurs fois pour s'assurer que tous les éléments sont masqués
      // même s'ils sont ajoutés dynamiquement
      const interval = setInterval(checkAndRemoveElements, 500);

      // Arrêter après 5 secondes pour éviter de consommer des ressources inutilement
      setTimeout(() => {
        clearInterval(interval);
      }, 5000);

      // Exécuter immédiatement une première fois
      checkAndRemoveElements();
    };

    if (!isLoading && epubUrl) {
      removeNavigationButtons();
    }
  }, [isLoading, epubUrl]);

  // Mettre à jour la progression de lecture
  useEffect(() => {
    if (typeof location === "string" && location) {
      const updateProgress = async () => {
        try {
          // Pour les EPUB, nous utilisons une valeur entre 0 et 100 pour représenter la progression
          // Nous pouvons extraire une valeur approximative à partir du CFI (location)
          const locationPercentage = Math.round(getPercentage(location) * 100);
          const isCompleted = locationPercentage >= 95; // Considérer comme terminé à 95%

          // Mettre à jour la page courante pour l'affichage
          setCurrentPage(locationPercentage);

          // Utiliser l'API pour mettre à jour la progression
          await fetch(`/api/komga/books/${book.id}/read-progress`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              page: locationPercentage,
              completed: isCompleted,
            }),
          });
        } catch (error) {
          // Ignorer les erreurs de mise à jour de la progression
        }
      };

      updateProgress();
    }
  }, [book.id, location]);

  // Fonction pour extraire un pourcentage approximatif à partir d'un CFI EPUB
  const getPercentage = (cfi: string): number => {
    try {
      // Exemple de CFI: epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)
      // Nous allons extraire une valeur approximative basée sur la position dans le document
      const matches = cfi.match(/[0-9]+/g);
      if (!matches || matches.length < 2) return 0;

      // Utiliser les deux premiers nombres comme approximation
      const firstNum = parseInt(matches[0], 10);
      const secondNum = parseInt(matches[1], 10);

      // Normaliser à une valeur entre 0 et 1
      return Math.min(Math.max((firstNum + secondNum / 100) / 12, 0), 1);
    } catch (error) {
      return 0;
    }
  };

  const handleClose = () => {
    // Convertir la position en pourcentage pour la passer au callback
    const locationPercentage =
      typeof location === "string"
        ? Math.round(getPercentage(location) * 100)
        : Math.round(Number(location) * 100);

    onClose?.(locationPercentage);
  };

  // Fonction de traduction typée pour éviter les erreurs de linter
  const translate = (key: string): string => {
    return t(key);
  };

  // Fonction appelée lorsque le livre est chargé
  const handleBookReady = (rendition: any) => {
    // Configurer le rendition
    rendition.themes.fontSize(`${fontSize}%`);

    // Ajouter des gestionnaires d'événements pour afficher/masquer les contrôles
    rendition.on("mouseup", toggleControls);
    rendition.on("touchend", toggleControls);
  };

  // Fonction pour afficher/masquer les contrôles
  const toggleControls = () => {
    setShowControls(!showControls);

    // Masquer automatiquement les contrôles après un délai
    if (!showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Fonctions de navigation
  const handlePreviousPage = () => {
    if (window.rendition) {
      window.rendition.prev();
    }
  };

  const handleNextPage = () => {
    if (window.rendition) {
      window.rendition.next();
    }
  };

  // Fonctions de zoom
  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 10, 200); // Limite à 200%
    setFontSize(newSize);
    if (window.rendition) {
      window.rendition.themes.fontSize(`${newSize}%`);
    }
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 10, 50); // Limite à 50%
    setFontSize(newSize);
    if (window.rendition) {
      window.rendition.themes.fontSize(`${newSize}%`);
    }
  };

  return (
    <div
      ref={readerRef}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-hidden touch-none"
    >
      {/* Styles injectés pour masquer les contrôles par défaut */}
      <style jsx global>
        {readerStyles}
      </style>

      <div className="relative h-full flex flex-col items-center justify-center">
        <div className="relative h-full w-full flex items-center justify-center">
          {/* Couche transparente pour capturer les clics */}
          <div className="absolute inset-0 z-10" onClick={toggleControls} />

          {/* Boutons de contrôle */}
          <div
            className={cn(
              "absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 transition-all duration-300",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                decreaseFontSize();
              }}
              className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
              aria-label={t("reader.controls.zoomOut")}
            >
              <ZoomOut className="h-6 w-6" />
            </button>
            <div className="p-2 rounded-full bg-background/50 text-center min-w-[80px]">
              <span className="text-sm font-medium">{fontSize}%</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                increaseFontSize();
              }}
              className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
              aria-label={t("reader.controls.zoomIn")}
            >
              <ZoomIn className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen(readerRef.current);
              }}
              className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
              aria-label={t(
                isFullscreen
                  ? "reader.controls.fullscreen.exit"
                  : "reader.controls.fullscreen.enter"
              )}
            >
              {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
            </button>
            <div className="p-2 rounded-full bg-background/50 text-center min-w-[80px]">
              <span className="text-sm font-medium">{currentPage}%</span>
            </div>
          </div>

          {/* Bouton fermer */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className={cn(
                "absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-30",
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label={t("reader.controls.close")}
            >
              <X className="h-6 w-6" />
            </button>
          )}

          {/* Bouton précédent */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePreviousPage();
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-20",
              "left-4",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label={t("reader.controls.previousPage")}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          {/* Bouton suivant */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextPage();
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-20",
              "right-4",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label={t("reader.controls.nextPage")}
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          {/* Contenu principal */}
          <div className="w-full h-full z-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Chargement du livre EPUB...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-lg text-red-500 mb-2">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              </div>
            ) : epubUrl ? (
              <ReactReader
                url={epubUrl}
                location={location}
                locationChanged={(loc: string) => {
                  setLocation(loc);
                }}
                title={book.metadata.title}
                showToc={false}
                getRendition={(rendition) => {
                  // Stocker le rendition dans window pour y accéder depuis les boutons de navigation
                  window.rendition = rendition;
                  handleBookReady(rendition);
                }}
                epubInitOptions={{
                  openAs: "epub",
                }}
                epubOptions={{
                  allowPopups: true,
                  allowScriptedContent: true,
                  flow: "paginated",
                  manager: "default",
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-lg text-red-500">Impossible de charger le livre EPUB</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ajouter la propriété rendition à l'objet window pour y accéder depuis les boutons de navigation
declare global {
  interface Window {
    rendition: any;
  }
}
