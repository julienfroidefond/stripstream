import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewModeButtonProps {
  onToggle?: (viewMode: "grid" | "list") => void;
}

export function ViewModeButton({ onToggle }: ViewModeButtonProps) {
  const { viewMode, handleViewModeToggle } = useDisplayPreferences();
  const { t } = useTranslate();

  const handleClick = async () => {
    const newViewMode = viewMode === "grid" ? "list" : "grid";
    await handleViewModeToggle(newViewMode);
    onToggle?.(newViewMode);
  };

  const Icon = viewMode === "grid" ? List : LayoutGrid;
  const label = viewMode === "grid" ? t("books.display.list") : t("books.display.grid");

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

