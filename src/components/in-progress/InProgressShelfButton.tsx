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
  className?: string;
}

export function InProgressShelfButton({
  seriesId,
  seriesName,
  isShelved,
  isShelving,
  onToggle,
  className,
}: InProgressShelfButtonProps) {
  const { t } = useTranslate();
  const label = t(
    isShelved ? "inProgress.shelf.resume" : "inProgress.shelf.shelve"
  );

  return (
    <IconButton
      icon={isShelving ? Loader2 : isShelved ? ArchiveRestore : Snowflake}
      variant="secondary"
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
        "h-8 w-8 shrink-0 rounded-full shadow-sm ring-1 ring-border/50",
        className
      )}
      iconClassName={cn(
        "h-4 w-4",
        isShelving ? "animate-spin" : "text-cyan-500"
      )}
    />
  );
}
