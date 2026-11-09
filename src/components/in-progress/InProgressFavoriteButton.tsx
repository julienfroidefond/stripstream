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
  className?: string;
}

export function InProgressFavoriteButton({
  seriesId,
  seriesName,
  isFavorite,
  onToggle,
  className,
}: InProgressFavoriteButtonProps) {
  const { t } = useTranslate();
  const label = isFavorite
    ? t("inProgress.card.favoriteRemove")
    : t("inProgress.card.favoriteAdd");

  return (
    <IconButton
      icon={Heart}
      variant={isFavorite ? "default" : "secondary"}
      size="icon"
      tooltip={label}
      aria-label={`${label}: ${seriesName}`}
      aria-pressed={isFavorite}
      onClick={onToggle}
      data-testid={`in-progress-favorite-${seriesId}`}
      className={cn(
        "h-8 w-8 shrink-0 rounded-full shadow-sm ring-1 ring-border/50",
        isFavorite && "bg-rose-500 text-white hover:bg-rose-500/90",
        className
      )}
      iconClassName={cn("h-4 w-4", isFavorite && "fill-current")}
    />
  );
}
