"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnreadFilterButtonProps {
  showOnlyUnread: boolean;
  onToggle: () => void;
}

export function UnreadFilterButton({ showOnlyUnread, onToggle }: UnreadFilterButtonProps) {
  const { t } = useTranslate();

  const label = showOnlyUnread ? t("series.filters.showAll") : t("series.filters.unread");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      title={label}
      className="whitespace-nowrap"
    >
      <Filter className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">{label}</span>
    </Button>
  );
}
