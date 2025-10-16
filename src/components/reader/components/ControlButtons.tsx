import type { ControlButtonsProps } from "../types";
import {
  ChevronLeft,
  ChevronRight,
  X,
  SplitSquareVertical,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  MoveRight,
  MoveLeft,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageInput } from "./PageInput";
import { useTranslation } from "react-i18next";

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
  direction,
  onToggleDirection,
  onPageChange,
  showThumbnails,
  onToggleThumbnails,
}: ControlButtonsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Boutons de contrôle */}
      <div
        className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 transition-all duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleControls();
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDoublePage();
          }}
          className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          aria-label={t(
            isDoublePage
              ? "reader.controls.doublePage.disable"
              : "reader.controls.doublePage.enable"
          )}
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
            onToggleDirection();
          }}
          className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          aria-label={t("reader.controls.direction.current", {
            direction: t(
              direction === "ltr"
                ? "reader.controls.direction.ltr"
                : "reader.controls.direction.rtl"
            ),
          })}
        >
          {direction === "rtl" ? (
            <MoveLeft className="h-6 w-6" />
          ) : (
            <MoveRight className="h-6 w-6" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreen();
          }}
          className="p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          aria-label={t(
            isFullscreen ? "reader.controls.fullscreen.exit" : "reader.controls.fullscreen.enter"
          )}
        >
          {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleThumbnails();
          }}
          className={cn(
            "p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors",
            showThumbnails && "ring-2 ring-primary"
          )}
          aria-label={t(
            showThumbnails ? "reader.controls.thumbnails.hide" : "reader.controls.thumbnails.show"
          )}
        >
          <Images className="h-6 w-6" />
        </button>
        <div className="p-2 rounded-full bg-background/50" onClick={(e) => e.stopPropagation()}>
          <PageInput
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              onToggleControls();
              onPageChange(page);
            }}
          />
        </div>
      </div>

      {/* Bouton fermer */}
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(currentPage);
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
      {currentPage > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreviousPage();
          }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-20",
            direction === "rtl" ? "right-4" : "left-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label={t("reader.controls.previousPage")}
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
            "absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-all duration-300 z-20",
            direction === "rtl" ? "left-4" : "right-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label={t("reader.controls.nextPage")}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}
    </>
  );
};
