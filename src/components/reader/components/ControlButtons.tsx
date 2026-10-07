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
  Palette,
  RotateCcw,
  Info,
} from "lucide-react";
import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { PageInput } from "./PageInput";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReaderBackground } from "@/types/preferences";

const readerBackgroundOptions: { value: ReaderBackground; className: string }[] = [
  { value: "default", className: "bg-gradient-to-br from-primary/70 via-background to-cyan-400/50" },
  { value: "black", className: "bg-[#09090b]" },
  { value: "white", className: "border border-black/20 bg-white" },
  { value: "cream", className: "bg-[#f4ead8]" },
];

export const ControlButtons = memo(function ControlButtons({
  showControls,
  onToggleControls,
  onToggleInfo,
  onPreviousPage,
  onNextPage,
  onClose,
  onRefresh,
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
  readerBackground,
  onReaderBackgroundChange,
}: ControlButtonsProps) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

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
          data-testid="reader-toggle-double-page"
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
          data-testid="reader-toggle-direction"
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
            data-testid="reader-toggle-fullscreen"
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
          data-testid="reader-info"
          variant="ghost"
          size="icon"
          icon={Info}
          onClick={(e) => {
            e.stopPropagation();
            onToggleInfo();
          }}
          tooltip={t("reader.controls.info")}
          iconClassName="h-5 w-5"
          className="rounded-full h-9 w-9"
        />
        <IconButton
          data-testid="reader-thumbnails"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              data-testid="reader-background"
              variant="ghost"
              size="icon"
              icon={Palette}
              onClick={(e) => e.stopPropagation()}
              tooltip={t("reader.controls.background.title")}
              iconClassName="h-5 w-5"
              className="rounded-full h-9 w-9"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-40" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuRadioGroup value={readerBackground} onValueChange={(value) => onReaderBackgroundChange(value as ReaderBackground)}>
              {readerBackgroundOptions.map(({ value, className }) => (
                <DropdownMenuRadioItem key={value} value={value} className="gap-2">
                  <span className={cn("h-4 w-4 rounded-full", className)} aria-hidden />
                  {t(`reader.controls.background.${value}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {onRefresh && (
          <IconButton
            variant="ghost"
            size="icon"
            icon={RotateCcw}
            onClick={handleRefresh}
            tooltip={t("reader.controls.refresh")}
            iconClassName={cn("h-5 w-5", isRefreshing && "animate-spin")}
            className="rounded-full h-9 w-9"
          />
        )}
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
            data-testid="reader-close"
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
          data-testid="reader-previous-page"
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
          data-testid="reader-next-page"
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
});

ControlButtons.displayName = "ControlButtons";
