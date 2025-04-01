import { useTranslate } from "@/hooks/useTranslate";
import { Filter } from "lucide-react";

interface UnreadFilterButtonProps {
  showOnlyUnread: boolean;
  onToggle: () => void;
}

export function UnreadFilterButton({ showOnlyUnread, onToggle }: UnreadFilterButtonProps) {
  const { t } = useTranslate();

  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
    >
      <Filter className="h-4 w-4" />
      {showOnlyUnread ? t("series.filters.showAll") : t("series.filters.unread")}
    </button>
  );
}
