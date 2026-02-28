import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewModeButtonProps {
  onToggle?: (viewMode: "grid" | "list") => void;
  viewMode?: "grid" | "list";
  className?: string;
}

function ViewModeButtonBase({
  viewMode,
  onToggle,
  className,
}: {
  viewMode: "grid" | "list";
  onToggle: (viewMode: "grid" | "list") => Promise<void> | void;
  className?: string;
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
      className={cn(
        "h-9 rounded-full border border-border/60 bg-background/40 px-3 text-xs font-medium backdrop-blur-sm hover:bg-accent/40 sm:text-sm",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">{label}</span>
    </Button>
  );
}

function ViewModeButtonUncontrolled({
  onToggle,
  className,
}: Pick<ViewModeButtonProps, "onToggle" | "className">) {
  const { viewMode, handleViewModeToggle } = useDisplayPreferences();

  const handleToggle = async (nextViewMode: "grid" | "list") => {
    await handleViewModeToggle(nextViewMode);
    onToggle?.(nextViewMode);
  };

  return <ViewModeButtonBase viewMode={viewMode} onToggle={handleToggle} className={className} />;
}

export function ViewModeButton({ onToggle, viewMode, className }: ViewModeButtonProps) {
  const isControlled = typeof viewMode === "string" && typeof onToggle === "function";

  if (isControlled) {
    return <ViewModeButtonBase viewMode={viewMode} onToggle={onToggle} className={className} />;
  }

  return <ViewModeButtonUncontrolled onToggle={onToggle} className={className} />;
}
