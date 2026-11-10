"use client";

import { Heart } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";

interface InProgressFavoriteButtonProps {
  seriesId: string;
  seriesName: string;
  isFavorite: boolean;
  onToggle: () => void;
  /** `overlay` pose le bouton sur une couverture, `surface` sur un fond de page. */
  tone?: "surface" | "overlay";
  className?: string;
}

export function InProgressFavoriteButton({
  seriesId,
  seriesName,
  isFavorite,
  onToggle,
  tone = "surface",
  className,
}: InProgressFavoriteButtonProps) {
  const { t } = useTranslate();
  const label = isFavorite
    ? t("inProgress.card.favoriteRemove")
    : t("inProgress.card.favoriteAdd");

  return (
    <IconButton
      icon={Heart}
      variant="ghost"
      size="icon"
      tooltip={label}
      aria-label={`${label}: ${seriesName}`}
      aria-pressed={isFavorite}
      onClick={onToggle}
      data-testid={`in-progress-favorite-${seriesId}`}
      className={cn(
        "h-8 w-8 shrink-0 rounded-full",
        tone === "overlay"
          ? "bg-black/60 text-white hover:bg-black/80"
          : "bg-surface-2 text-foreground hover:bg-surface-3",
        isFavorite && "bg-rose-500 text-white hover:bg-rose-500/90",
        className
      )}
      iconClassName={cn("h-4 w-4", isFavorite && "fill-current")}
    />
  );
}
