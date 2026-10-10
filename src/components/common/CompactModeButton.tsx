import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CompactModeButtonProps {
  onToggle?: (isCompact: boolean) => void;
  isCompact?: boolean;
  className?: string;
}

function CompactModeButtonBase({
  isCompact,
  onToggle,
  className,
}: {
  isCompact: boolean;
  onToggle: (isCompact: boolean) => Promise<void> | void;
  className?: string;
}) {
  const { t } = useTranslate();

  const handleClick = async () => {
    const newCompactState = !isCompact;
    await onToggle(newCompactState);
  };

  const Icon = isCompact ? LayoutTemplate : LayoutGrid;
  const label = isCompact ? t("series.filters.normal") : t("series.filters.compact");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      title={label}
      className={cn(
        "h-9 rounded-full border border-border/60 bg-background/40 px-3 text-xs font-medium backdrop-blur-xs hover:bg-accent/40 sm:text-sm",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">{label}</span>
    </Button>
  );
}

function CompactModeButtonUncontrolled({
  onToggle,
  className,
}: Pick<CompactModeButtonProps, "onToggle" | "className">) {
  const { isCompact, handleCompactToggle } = useDisplayPreferences();

  const handleToggle = async (nextCompactMode: boolean) => {
    await handleCompactToggle(nextCompactMode);
    onToggle?.(nextCompactMode);
  };

  return (
    <CompactModeButtonBase isCompact={isCompact} onToggle={handleToggle} className={className} />
  );
}

export function CompactModeButton({ onToggle, isCompact, className }: CompactModeButtonProps) {
  const isControlled = typeof isCompact === "boolean" && typeof onToggle === "function";

  if (isControlled) {
    return <CompactModeButtonBase isCompact={isCompact} onToggle={onToggle} className={className} />;
  }

  return <CompactModeButtonUncontrolled onToggle={onToggle} className={className} />;
}
