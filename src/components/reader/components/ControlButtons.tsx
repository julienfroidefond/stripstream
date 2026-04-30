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
  Frame,
  StretchHorizontal,
  StretchVertical,
  ScanSearch,
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
  isFullscreenAvailable,
  onToggleFullscreen,
  direction,
  onToggleDirection,
  onPageChange,
  showThumbnails,
  onToggleThumbnails,
  fitMode,
  onCycleFitMode,
}: ControlButtonsProps) => {
  const { t } = useTranslation();

  const fitIcon =
    fitMode === "fit"
      ? Frame
      : fitMode === "width"
        ? StretchHorizontal
        : fitMode === "height"
          ? StretchVertical
          : ScanSearch;

  return (
    <>
      {/* Boutons de contrôle */}
      <div
        className={cn(
          "absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/60 bg-background/55 p-1.5 shadow-[0_8px_28px_-18px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-all duration-300",
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
          iconClassName="h-5 w-5"
          className="rounded-full h-9 w-9"
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
          iconClassName="h-5 w-5"
          className="rounded-full h-9 w-9"
        />
        {isFullscreenAvailable && (
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
            iconClassName="h-5 w-5"
            className="rounded-full h-9 w-9"
          />
        )}
        <IconButton
          variant="ghost"
          size="icon"
          icon={fitIcon}
          onClick={(e) => {
            e.stopPropagation();
            onCycleFitMode();
          }}
          tooltip={t("reader.controls.fitMode.current", {
            mode: t(`reader.controls.fitMode.${fitMode}`),
          })}
          iconClassName="h-5 w-5"
          className="rounded-full h-9 w-9"
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
          iconClassName="h-5 w-5"
          className={cn("rounded-full h-9 w-9", showThumbnails && "ring-2 ring-primary")}
        />
        <div className="px-1.5 rounded-full" onClick={(e) => e.stopPropagation()}>
          <PageInput
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              onToggleControls();
              onPageChange(page);
            }}
          />
        </div>
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
            iconClassName="h-5 w-5"
            className="rounded-full h-9 w-9"
          />
        )}
      </div>

      {/* Bouton précédent */}
      {currentPage > 1 && (
        <IconButton
          variant="ghost"
          size="icon"
          icon={ChevronLeft}
          onClick={(e) => {
            e.stopPropagation();
            if (direction === "rtl") onNextPage();
            else onPreviousPage();
          }}
          tooltip={t("reader.controls.previousPage")}
          iconClassName="h-8 w-8"
          className={cn(
            "absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/60 bg-background/55 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-all duration-300 hover:bg-background/70",
            "left-4",
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
            if (direction === "rtl") onPreviousPage();
            else onNextPage();
          }}
          tooltip={t("reader.controls.nextPage")}
          iconClassName="h-8 w-8"
          className={cn(
            "absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/60 bg-background/55 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-all duration-300 hover:bg-background/70",
            "right-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />
      )}
    </>
  );
};
