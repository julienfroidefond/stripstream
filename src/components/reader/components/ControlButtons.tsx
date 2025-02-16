import { ControlButtonsProps } from "../types";
import {
  ChevronLeft,
  ChevronRight,
  X,
  SplitSquareVertical,
  LayoutTemplate,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ControlButtons = ({
  showControls,
  onToggleControls,
  onPreviousPage,
  onNextPage,
  onClose,
  currentPage,
  totalPages,
  isDoublePage,
  onToggleDoublePage,
  isFullscreen,
  onToggleFullscreen,
}: ControlButtonsProps) => {
  return (
    <>
      {/* Boutons de contrôle */}
      <div
        className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 transition-all duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDoublePage();
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
            onToggleFullscreen();
          }}
          className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
        </button>
      </div>

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
          <X className="h-6 w-6" />
        </button>
      )}

      {/* Bouton précédent */}
      {currentPage > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreviousPage();
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

      {/* Bouton suivant */}
      {currentPage < totalPages && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNextPage();
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
    </>
  );
};
