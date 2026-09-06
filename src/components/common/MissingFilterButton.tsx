"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { BookX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MissingFilterButtonProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function MissingFilterButton({ active, onToggle, className }: MissingFilterButtonProps) {
  const { t } = useTranslate();

  const label = active ? t("series.filters.showMissing") : t("series.filters.hideMissing");

  return (
    <Button
      data-testid="library-filter-missing"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      title={label}
      className={cn(
        "h-9 rounded-full border px-3 text-xs font-medium backdrop-blur-sm sm:text-sm",
        active
          ? "border-orange-500/40 bg-orange-500/15 text-orange-500 hover:bg-orange-500/20"
          : "border-border/60 bg-background/40 hover:bg-accent/40",
        className
      )}
    >
      <BookX className="h-4 w-4" />
      <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">{label}</span>
    </Button>
  );
}
