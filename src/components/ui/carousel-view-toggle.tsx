"use client";

import { GalleryHorizontal, LayoutGrid } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { CarouselViewMode } from "@/hooks/useCarouselViewMode";

interface CarouselViewToggleProps {
  viewMode: CarouselViewMode;
  onToggle: () => void;
  className?: string;
}

/**
 * Petite icône d'en-tête pour basculer une rangée entre le rail classique et
 * l'affichage une œuvre à la fois (le même geste que « Pour vous »).
 */
export function CarouselViewToggle({ viewMode, onToggle, className }: CarouselViewToggleProps) {
  const { t } = useTranslate();
  const isSpotlight = viewMode === "spotlight";
  const label = isSpotlight
    ? t("navigation.carousel.rail")
    : t("navigation.carousel.oneByOne");

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isSpotlight}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {isSpotlight ? (
        <LayoutGrid className="h-4 w-4" />
      ) : (
        <GalleryHorizontal className="h-4 w-4" />
      )}
    </button>
  );
}
