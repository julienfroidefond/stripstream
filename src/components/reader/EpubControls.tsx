"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import type { KomgaBook } from "@/types/komga";

interface EpubControlsProps {
  book: KomgaBook;
  currentPage: number;
  totalPages: number;
  showControls: boolean;
  isFullscreen: boolean;
  fontSize: number;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
}

export function EpubControls({
  book,
  currentPage,
  totalPages,
  showControls,
  isFullscreen,
  fontSize,
  onClose,
  onToggleFullscreen,
  onPreviousPage,
  onNextPage,
  onIncreaseFontSize,
  onDecreaseFontSize,
}: EpubControlsProps) {
  const { t } = useTranslate();

  // Fonction de traduction typée pour éviter les erreurs de linter
  const translate = (key: string): string => {
    return t(key);
  };

  return (
    <>
      {/* Bouton de fermeture (toujours visible) */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute top-2 right-2 z-50 bg-black/50 text-white hover:bg-black/70 rounded-full",
          "transition-opacity duration-300",
          !showControls && "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-label={translate("reader.close")}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Barre de contrôle centrale (visible uniquement si showControls est true) */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-40 flex items-center justify-center p-2 bg-black/50",
          "transition-opacity duration-300",
          !showControls && "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center space-x-2">
          {/* Bouton de plein écran */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-black/70 rounded-full"
            onClick={onToggleFullscreen}
            aria-label={
              isFullscreen ? translate("reader.exit_fullscreen") : translate("reader.fullscreen")
            }
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>

          {/* Bouton pour augmenter la taille de la police */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-black/70 rounded-full"
            onClick={onIncreaseFontSize}
            aria-label={translate("reader.increase_font_size")}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>

          {/* Bouton pour diminuer la taille de la police */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-black/70 rounded-full"
            onClick={onDecreaseFontSize}
            aria-label={translate("reader.decrease_font_size")}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>

          {/* Affichage de la progression */}
          <div className="text-white text-sm font-medium">
            {currentPage} / {totalPages} ({Math.round((currentPage / totalPages) * 100)}%)
          </div>
        </div>
      </div>

      {/* Boutons de navigation latéraux (visibles uniquement si showControls est true) */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 z-30 flex items-center justify-start p-2",
          "transition-opacity duration-300",
          !showControls && "opacity-0 pointer-events-none"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          onClick={onPreviousPage}
          aria-label={translate("reader.previous_page")}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      </div>

      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 z-30 flex items-center justify-end p-2",
          "transition-opacity duration-300",
          !showControls && "opacity-0 pointer-events-none"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          onClick={onNextPage}
          aria-label={translate("reader.next_page")}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>
    </>
  );
}
