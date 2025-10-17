import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, LayoutTemplate } from "lucide-react";

interface CompactModeButtonProps {
  onToggle?: (isCompact: boolean) => void;
}

export function CompactModeButton({ onToggle }: CompactModeButtonProps) {
  const { isCompact, handleCompactToggle } = useDisplayPreferences();
  const { t } = useTranslate();

  const handleClick = async () => {
    const newCompactState = !isCompact;
    await handleCompactToggle(newCompactState);
    onToggle?.(newCompactState);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg hover:bg-accent/80 hover:backdrop-blur-md hover:text-accent-foreground whitespace-nowrap"
      title={isCompact ? t("series.filters.normal") : t("series.filters.compact")}
    >
      {isCompact ? <LayoutTemplate className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
      <span className="hidden sm:inline">
        {isCompact ? t("series.filters.normal") : t("series.filters.compact")}
      </span>
    </button>
  );
}
