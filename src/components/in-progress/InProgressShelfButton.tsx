"use client";

import { ArchiveRestore, Loader2, Snowflake } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";

interface InProgressShelfButtonProps {
  seriesId: string;
  seriesName: string;
  isShelved: boolean;
  isShelving: boolean;
  onToggle: () => void;
  /** `overlay` pose le bouton sur une couverture, `surface` sur un fond de page. */
  tone?: "surface" | "overlay";
  className?: string;
}

export function InProgressShelfButton({
  seriesId,
  seriesName,
  isShelved,
  isShelving,
  onToggle,
  tone = "surface",
  className,
}: InProgressShelfButtonProps) {
  const { t } = useTranslate();
  const label = t(
    isShelved ? "inProgress.shelf.resume" : "inProgress.shelf.shelve"
  );

  return (
    <IconButton
      icon={isShelving ? Loader2 : isShelved ? ArchiveRestore : Snowflake}
      variant="ghost"
      size="icon"
      tooltip={label}
      aria-label={`${label}: ${seriesName}`}
      onClick={onToggle}
      disabled={isShelving}
      data-testid={
        isShelved
          ? `in-progress-unshelve-${seriesId}`
          : `in-progress-shelve-${seriesId}`
      }
      className={cn(
        "h-8 w-8 shrink-0 rounded-full",
        tone === "overlay"
          ? "bg-black/60 text-white hover:bg-black/80"
          : "bg-surface-2 text-foreground hover:bg-surface-3",
        className
      )}
      iconClassName={cn("h-4 w-4", isShelving && "animate-spin")}
    />
  );
}
