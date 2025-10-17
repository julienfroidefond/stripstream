import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const Icon = isCompact ? LayoutTemplate : LayoutGrid;
  const label = isCompact ? t("series.filters.normal") : t("series.filters.compact");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      title={label}
      className="whitespace-nowrap"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">{label}</span>
    </Button>
  );
}
