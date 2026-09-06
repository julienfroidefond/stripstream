"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { ArrowDownAZ, ArrowDownWideNarrow, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortButtonProps {
  sort: string;
  onToggle: () => void;
  className?: string;
}

export function SortButton({ sort, onToggle, className }: SortButtonProps) {
  const { t } = useTranslate();
  const isLatest = sort === "latest";
  const isRating = sort === "community_score";

  const label = isLatest
    ? t("series.filters.sortLatest")
    : isRating
      ? t("series.filters.sortRating")
      : t("series.filters.sortTitle");
  const Icon = isLatest ? ArrowDownWideNarrow : isRating ? Star : ArrowDownAZ;
  const isActive = isLatest || isRating;

  return (
    <Button
      data-testid="library-sort"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      title={label}
      className={cn(
        "h-9 rounded-full border px-3 text-xs font-medium backdrop-blur-sm sm:text-sm",
        isActive
          ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
          : "border-border/60 bg-background/40 hover:bg-accent/40",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">{label}</span>
    </Button>
  );
}
