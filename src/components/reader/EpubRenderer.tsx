"use client";

import { useState, useEffect, useRef } from "react";
import { ReactReader } from "react-reader";
import type { KomgaBook } from "@/types/komga";

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
  .epub-container svg[viewBox*="0 0 24 24"],
  .epub-container .arrow,
  .epub-container .arrow-left,
  .epub-container .arrow-right,
  .epub-container .prev-button,
  .epub-container .next-button,
  .epub-container [aria-label="Previous"],
  .epub-container [aria-label="Next"],
  .epub-container [aria-label="Previous page"],
  .epub-container [aria-label="Next page"],
  .epub-container .arrow-left-button,
  .epub-container .arrow-right-button,
  .ReactReader__container .arrow-wrapper,
  .ReactReader__container .arrow,
  .ReactReader__container .arrow-left,
  .ReactReader__container .arrow-right {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    position: absolute !important;
    z-index: -9999 !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* Styles pour s'assurer que le livre est visible */
  .ReactReader__container {
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
  }

  .ReactReader__reader {
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
  }

  .epubjs-container {
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
  }
`;

interface EpubRendererProps {
  book: KomgaBook;
  epubUrl: string | null;
  isLoading: boolean;
  error: string | null;
  fontSize: number;
  location: string | number;
  onLocationChange: (location: string | number) => void;
  onReady: (rendition: any) => void;
  onTouchStart: () => void;
}

export function EpubRenderer({
  book,
  epubUrl,
  isLoading,
  error,
  fontSize,
  location,
  onLocationChange,
  onReady,
  onTouchStart,
}: EpubRendererProps) {
  // Référence pour le conteneur du lecteur
  const readerRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black">
        <div className="text-white text-lg">Chargement du livre EPUB...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black">
        <div className="text-red-500 text-lg">Erreur: {error}</div>
      </div>
    );
  }

  if (!epubUrl) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black">
        <div className="text-white text-lg">Aucun fichier EPUB disponible</div>
      </div>
    );
  }

  return (
    <div
      ref={readerRef}
      className="absolute inset-0 w-full h-full bg-white"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      }}
      onTouchStart={onTouchStart}
      onClick={onTouchStart}
    >
      <style>{readerStyles}</style>
      <ReactReader
        url={epubUrl}
        title={book.name}
        location={location}
        locationChanged={onLocationChange}
        getRendition={onReady}
        showToc={false}
        epubOptions={{
          flow: "paginated",
          manager: "continuous",
          allowPopups: true,
          allowScriptedContent: true,
        }}
        swipeable
        epubInitOptions={{
          openAs: "epub",
        }}
      />
    </div>
  );
}
