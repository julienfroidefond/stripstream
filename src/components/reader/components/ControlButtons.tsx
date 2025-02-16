import { ControlButtonsProps } from "../types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, LayoutTemplate, SplitSquareVertical } from "lucide-react";

export const ControlButtons = ({
  showControls,
  onPrevious,
  onNext,
  onClose,
  currentPage,
  totalPages,
  isDoublePage,
  onToggleDoublePage,
}: ControlButtonsProps) => {
  return (
    <>
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
      </div>

      {/* Bouton précédent */}
      {currentPage > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
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
            onNext();
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
    </>
  );
};
