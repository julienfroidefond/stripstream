import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompactModeButtonProps {
  onToggle?: (isCompact: boolean) => void;
  isCompact?: boolean;
}

function CompactModeButtonBase({
  isCompact,
  onToggle,
}: {
  isCompact: boolean;
  onToggle: (isCompact: boolean) => Promise<void> | void;
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
      className="whitespace-nowrap"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">{label}</span>
    </Button>
  );
}

function CompactModeButtonUncontrolled({ onToggle }: Pick<CompactModeButtonProps, "onToggle">) {
  const { isCompact, handleCompactToggle } = useDisplayPreferences();

  const handleToggle = async (nextCompactMode: boolean) => {
    await handleCompactToggle(nextCompactMode);
    onToggle?.(nextCompactMode);
  };

  return <CompactModeButtonBase isCompact={isCompact} onToggle={handleToggle} />;
}

export function CompactModeButton({ onToggle, isCompact }: CompactModeButtonProps) {
  const isControlled = typeof isCompact === "boolean" && typeof onToggle === "function";

  if (isControlled) {
    return <CompactModeButtonBase isCompact={isCompact} onToggle={onToggle} />;
  }

  return <CompactModeButtonUncontrolled onToggle={onToggle} />;
}
