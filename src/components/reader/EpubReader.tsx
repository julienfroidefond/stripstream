"use client";

import { useState, useEffect, useRef } from "react";
import type { KomgaBook } from "@/types/komga";
import { useFullscreen } from "./hooks/useFullscreen";
import { EpubControls } from "./EpubControls";
import { EpubRenderer } from "./EpubRenderer";
import { useEpubPositions } from "./EpubPositionManager";

interface EpubReaderProps {
  book: KomgaBook;
  onClose?: (currentPage: number) => void;
  nextBook?: KomgaBook | null;
}

export function EpubReader({ book, onClose, nextBook }: EpubReaderProps) {
  // États pour le lecteur EPUB
  const [location, setLocation] = useState<string | number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [epubUrl, setEpubUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(book.media.pagesCount || 100);
  const [fontSize, setFontSize] = useState(100); // Taille de police en pourcentage

  // Références
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks personnalisés
  const { isFullscreen, toggleFullscreen, setFullscreenElement } = useFullscreen();

  // Définir l'élément pour le mode plein écran
  useEffect(() => {
    if (readerContainerRef.current) {
      setFullscreenElement(readerContainerRef.current);
    }
  }, [setFullscreenElement]);

  // Utiliser le hook pour gérer les positions et la progression
  const { positions, isLoadingPositions, updateReadProgress, handleRelocated } = useEpubPositions({
    book,
    isLoading,
    currentPage,
    totalPages,
  });

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

        // Créer un blob URL pour le fichier EPUB
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        setEpubUrl(url);
        setIsLoading(false);
      } catch (err) {
        console.error("Erreur lors du téléchargement du fichier EPUB:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Erreur inconnue lors du téléchargement du fichier EPUB"
        );
        setIsLoading(false);
      }
    };

    fetchEpub();

    // Nettoyer l'URL du blob lors du démontage du composant
    return () => {
      if (epubUrl) {
        URL.revokeObjectURL(epubUrl);
      }
    };
  }, [book.id]);

  // Fonction pour gérer la fermeture du lecteur
  const handleClose = () => {
    // Utiliser la valeur actuelle de currentPage pour la passer au callback
    onClose?.(currentPage);
  };

  // Fonction appelée lorsque le livre est chargé
  const handleBookReady = (rendition: any) => {
    console.log("Livre EPUB chargé et prêt");

    // Stocker le rendition dans la fenêtre pour pouvoir y accéder après un rechargement à chaud
    if (typeof window !== "undefined") {
      (window as any).rendition = rendition;
    }

    // Configurer le rendition
    rendition.themes.fontSize(`${fontSize}%`);

    // Ajouter du CSS personnalisé pour masquer les boutons de navigation
    rendition.themes.register("custom", {
      body: {
        padding: "0 !important",
      },
      ".epub-container button, .epub-container .arrow-wrapper, .epub-container .arrow, .epub-container .arrow-left, .epub-container .arrow-right":
        {
          display: "none !important",
          opacity: "0 !important",
          visibility: "hidden !important",
          "pointer-events": "none !important",
        },
    });
    rendition.themes.select("custom");

    // Mettre à jour la progression lorsque la page change
    // rendition.on("relocated", (locationInfo: any) => {
    //   if (locationInfo && locationInfo.start) {
    //     // Utiliser start.index comme page courante
    //     const currentPageIndex = locationInfo.start.index + 1; // +1 car l'index commence à 0

    //     // Mettre à jour l'état
    //     setCurrentPage(currentPageIndex);

    //     // Appeler la fonction de gestion des positions
    //     handleRelocated(locationInfo);
    //   }
    // });
  };

  // Fonction pour afficher/masquer les contrôles
  const toggleControls = () => {
    setShowControls(!showControls);

    // Masquer automatiquement les contrôles après un délai
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (!showControls) {
      // Si on vient d'afficher les contrôles, programmer leur masquage
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Fonctions de navigation
  const handlePreviousPage = () => {
    if (window.rendition) {
      window.rendition.prev();

      // Attendre que la navigation soit terminée pour récupérer la nouvelle position
      setTimeout(() => {
        if (window.rendition && window.rendition.location && window.rendition.location.start) {
          const locationInfo = window.rendition.location.start;
          console.log("Position après prev():", locationInfo);

          // Mettre à jour la page courante pour l'interface
          const newPage = locationInfo.index + 1; // +1 car l'index commence à 0
          setCurrentPage(newPage);

          // Envoyer la position directement
          updateReadProgress(locationInfo);
        }
      }, 100); // Un petit délai pour s'assurer que la navigation est terminée
    }
  };

  const handleNextPage = () => {
    if (window.rendition) {
      window.rendition.next();

      // Attendre que la navigation soit terminée pour récupérer la nouvelle position
      setTimeout(() => {
        if (window.rendition && window.rendition.location && window.rendition.location.start) {
          const locationInfo = window.rendition.location.start;
          console.log("Position après next():", locationInfo);

          // Mettre à jour la page courante pour l'interface
          const newPage = locationInfo.index + 1; // +1 car l'index commence à 0
          setCurrentPage(newPage);

          // Envoyer la position directement
          updateReadProgress(locationInfo);
        }
      }, 100); // Un petit délai pour s'assurer que la navigation est terminée
    }
  };

  // Fonctions pour ajuster la taille de la police
  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 10, 200); // Maximum 200%
    setFontSize(newSize);
    if (window.rendition) {
      window.rendition.themes.fontSize(`${newSize}%`);
    }
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 10, 50); // Minimum 50%
    setFontSize(newSize);
    if (window.rendition) {
      window.rendition.themes.fontSize(`${newSize}%`);
    }
  };

  // Gérer les raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePreviousPage();
      } else if (e.key === "ArrowRight") {
        handleNextPage();
      } else if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "+") {
        increaseFontSize();
      } else if (e.key === "-") {
        decreaseFontSize();
      } else if (e.key === " ") {
        toggleControls();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fontSize, showControls, currentPage, totalPages]);

  return (
    <div
      ref={readerContainerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col"
    >
      {/* Composant de rendu du livre EPUB */}
      <div className="flex-grow relative w-full h-full">
        <EpubRenderer
          book={book}
          epubUrl={epubUrl}
          isLoading={isLoading}
          error={error}
          fontSize={fontSize}
          location={location}
          onLocationChange={setLocation}
          onReady={handleBookReady}
          onTouchStart={toggleControls}
        />
      </div>

      {/* Composant de contrôles */}
      <EpubControls
        book={book}
        currentPage={currentPage}
        totalPages={totalPages}
        showControls={showControls}
        isFullscreen={isFullscreen}
        fontSize={fontSize}
        onClose={handleClose}
        onToggleFullscreen={toggleFullscreen}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
      />
    </div>
  );
}

// Déclaration pour TypeScript
declare global {
  interface Window {
    rendition: any;
  }
}
