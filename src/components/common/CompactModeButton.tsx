import { useTranslate } from "@/hooks/useTranslate";
import { LayoutGrid, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CompactModeButtonProps {
  isCompact: boolean;
  onToggle: (isCompact: boolean) => Promise<void> | void;
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
        "h-9 rounded-full border border-border bg-surface-1 px-3 text-xs font-medium hover:bg-surface-2 sm:text-sm",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">{label}</span>
    </Button>
  );
}

export function CompactModeButton({ onToggle, isCompact, className }: CompactModeButtonProps) {
  return <CompactModeButtonBase isCompact={isCompact} onToggle={onToggle} className={className} />;
}
