"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UnreadFilterButtonProps {
  showOnlyUnread: boolean;
  onToggle: () => void;
  className?: string;
}

export function UnreadFilterButton({
  showOnlyUnread,
  onToggle,
  className,
}: UnreadFilterButtonProps) {
  const { t } = useTranslate();

  const label = showOnlyUnread ? t("series.filters.showAll") : t("series.filters.unread");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      title={label}
      className={cn(
        "h-9 rounded-full border px-3 text-xs font-medium backdrop-blur-sm sm:text-sm",
        showOnlyUnread
          ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
          : "border-border/60 bg-background/40 hover:bg-accent/40",
        className
      )}
    >
      <Filter className="h-4 w-4" />
      <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">{label}</span>
    </Button>
  );
}
