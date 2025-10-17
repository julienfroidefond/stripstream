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
  ZoomIn,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageInput } from "./PageInput";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";

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
  onZoom,
  onForceReload,
}: ControlButtonsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Boutons de contrôle */}
      <div
        className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 transition-all duration-300 p-2 rounded-full bg-background/70 backdrop-blur-md",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleControls();
        }}
      >
        <IconButton
          variant="ghost"
          size="icon"
          icon={isDoublePage ? LayoutTemplate : SplitSquareVertical}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDoublePage();
          }}
          tooltip={t(
            isDoublePage
              ? "reader.controls.doublePage.disable"
              : "reader.controls.doublePage.enable"
          )}
          iconClassName="h-6 w-6"
          className="rounded-full"
        />
        <IconButton
          variant="ghost"
          size="icon"
          icon={direction === "rtl" ? MoveLeft : MoveRight}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDirection();
          }}
          tooltip={t("reader.controls.direction.current", {
            direction: t(
              direction === "ltr"
                ? "reader.controls.direction.ltr"
                : "reader.controls.direction.rtl"
            ),
          })}
          iconClassName="h-6 w-6"
          className="rounded-full"
        />
        <IconButton
          variant="ghost"
          size="icon"
          icon={isFullscreen ? Minimize2 : Maximize2}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreen();
          }}
          tooltip={t(
            isFullscreen ? "reader.controls.fullscreen.exit" : "reader.controls.fullscreen.enter"
          )}
          iconClassName="h-6 w-6"
          className="rounded-full"
        />
        <IconButton
          variant="ghost"
          size="icon"
          icon={Images}
          onClick={(e) => {
            e.stopPropagation();
            onToggleThumbnails();
          }}
          tooltip={t(
            showThumbnails ? "reader.controls.thumbnails.hide" : "reader.controls.thumbnails.show"
          )}
          iconClassName="h-6 w-6"
          className={cn("rounded-full", showThumbnails && "ring-2 ring-primary")}
        />
        <IconButton
          variant="ghost"
          size="icon"
          icon={ZoomIn}
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          tooltip={t("reader.controls.zoom")}
          iconClassName="h-6 w-6"
          className="rounded-full"
        />
        <IconButton
          variant="ghost"
          size="icon"
          icon={RotateCw}
          onClick={(e) => {
            e.stopPropagation();
            onForceReload();
          }}
          tooltip={t("reader.controls.reload")}
          iconClassName="h-6 w-6"
          className="rounded-full"
        />
        <div className="p-2 rounded-full" onClick={(e) => e.stopPropagation()}>
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
        <IconButton
          variant="ghost"
          size="icon"
          icon={X}
          onClick={(e) => {
            e.stopPropagation();
            onClose(currentPage);
          }}
          tooltip={t("reader.controls.close")}
          iconClassName="h-6 w-6"
          className={cn(
            "absolute top-4 right-4 rounded-full bg-background/70 backdrop-blur-md hover:bg-background/80 transition-all duration-300 z-30",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />
      )}

      {/* Bouton précédent */}
      {currentPage > 1 && (
        <IconButton
          variant="ghost"
          size="icon"
          icon={ChevronLeft}
          onClick={(e) => {
            e.stopPropagation();
            onPreviousPage();
          }}
          tooltip={t("reader.controls.previousPage")}
          iconClassName="h-8 w-8"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur-md hover:bg-background/80 transition-all duration-300 z-20",
            direction === "rtl" ? "right-4" : "left-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />
      )}

      {/* Bouton suivant */}
      {currentPage < totalPages && (
        <IconButton
          variant="ghost"
          size="icon"
          icon={ChevronRight}
          onClick={(e) => {
            e.stopPropagation();
            onNextPage();
          }}
          tooltip={t("reader.controls.nextPage")}
          iconClassName="h-8 w-8"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur-md hover:bg-background/80 transition-all duration-300 z-20",
            direction === "rtl" ? "left-4" : "right-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />
      )}
    </>
  );
};
