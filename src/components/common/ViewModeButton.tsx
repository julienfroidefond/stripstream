import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewModeButtonProps {
  onToggle?: (viewMode: "grid" | "list") => void;
  viewMode?: "grid" | "list";
}

function ViewModeButtonBase({
  viewMode,
  onToggle,
}: {
  viewMode: "grid" | "list";
  onToggle: (viewMode: "grid" | "list") => Promise<void> | void;
}) {
  const { t } = useTranslate();

  const handleClick = async () => {
    const newViewMode = viewMode === "grid" ? "list" : "grid";
    await onToggle(newViewMode);
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

function ViewModeButtonUncontrolled({ onToggle }: Pick<ViewModeButtonProps, "onToggle">) {
  const { viewMode, handleViewModeToggle } = useDisplayPreferences();

  const handleToggle = async (nextViewMode: "grid" | "list") => {
    await handleViewModeToggle(nextViewMode);
    onToggle?.(nextViewMode);
  };

  return <ViewModeButtonBase viewMode={viewMode} onToggle={handleToggle} />;
}

export function ViewModeButton({ onToggle, viewMode }: ViewModeButtonProps) {
  const isControlled = typeof viewMode === "string" && typeof onToggle === "function";

  if (isControlled) {
    return <ViewModeButtonBase viewMode={viewMode} onToggle={onToggle} />;
  }

  return <ViewModeButtonUncontrolled onToggle={onToggle} />;
}
