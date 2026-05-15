"use client";

import { SlidersHorizontal, LayoutGrid, List, LayoutTemplate } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";

const PAGE_SIZES = [20, 50, 100] as const;

interface DisplaySettingsProps {
  viewMode?: "grid" | "list";
  isCompact?: boolean;
  pageSize?: number;
  onViewModeChange?: (mode: "grid" | "list") => void;
  onCompactChange?: (compact: boolean) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

function SegmentedOption({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function DisplaySettingsBase({
  viewMode,
  isCompact,
  pageSize,
  onViewModeChange,
  onCompactChange,
  onPageSizeChange,
  className,
}: Required<Omit<DisplaySettingsProps, "className">> & { className?: string }) {
  const { t } = useTranslate();

  const hasNonDefault = viewMode === "list" || isCompact || pageSize !== 20;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 rounded-full border px-3 text-xs font-medium backdrop-blur-sm sm:text-sm",
            hasNonDefault
              ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
              : "border-border/60 bg-background/40 hover:bg-accent/40",
            className
          )}
          title={t("series.filters.displaySettings")}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">
            {t("series.filters.displaySettings")}
          </span>
          {hasNonDefault && (
            <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-52 p-3 space-y-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* View mode */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("series.filters.view")}
          </p>
          <div className="flex gap-1">
            <SegmentedOption
              active={viewMode === "grid"}
              onClick={() => onViewModeChange("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t("books.display.grid")}
            </SegmentedOption>
            <SegmentedOption
              active={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-3.5 w-3.5" />
              {t("books.display.list")}
            </SegmentedOption>
          </div>
        </div>

        {/* Compact mode */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("series.filters.mode")}
          </p>
          <div className="flex gap-1">
            <SegmentedOption active={!isCompact} onClick={() => onCompactChange(false)}>
              <LayoutGrid className="h-3.5 w-3.5" />
              {t("series.filters.normal")}
            </SegmentedOption>
            <SegmentedOption active={isCompact} onClick={() => onCompactChange(true)}>
              <LayoutTemplate className="h-3.5 w-3.5" />
              {t("series.filters.compact")}
            </SegmentedOption>
          </div>
        </div>

        {/* Page size */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("series.filters.perPage")}
          </p>
          <div className="flex gap-1">
            {PAGE_SIZES.map((size) => (
              <SegmentedOption
                key={size}
                active={pageSize === size}
                onClick={() => onPageSizeChange(size)}
              >
                {size}
              </SegmentedOption>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DisplaySettingsUncontrolled({
  onViewModeChange,
  onCompactChange,
  onPageSizeChange,
  className,
}: Pick<DisplaySettingsProps, "onViewModeChange" | "onCompactChange" | "onPageSizeChange" | "className">) {
  const { viewMode, isCompact, itemsPerPage, handleViewModeToggle, handleCompactToggle, handlePageSizeChange } =
    useDisplayPreferences();

  const handleViewMode = async (mode: "grid" | "list") => {
    await handleViewModeToggle(mode);
    onViewModeChange?.(mode);
  };

  const handleCompact = async (compact: boolean) => {
    await handleCompactToggle(compact);
    onCompactChange?.(compact);
  };

  const handlePageSize = async (size: number) => {
    await handlePageSizeChange(size);
    onPageSizeChange?.(size);
  };

  return (
    <DisplaySettingsBase
      viewMode={viewMode}
      isCompact={isCompact}
      pageSize={itemsPerPage}
      onViewModeChange={handleViewMode}
      onCompactChange={handleCompact}
      onPageSizeChange={handlePageSize}
      className={className}
    />
  );
}

export function DisplaySettingsDropdown({
  viewMode,
  isCompact,
  pageSize,
  onViewModeChange,
  onCompactChange,
  onPageSizeChange,
  className,
}: DisplaySettingsProps) {
  const isControlled =
    typeof viewMode === "string" &&
    typeof isCompact === "boolean" &&
    typeof pageSize === "number" &&
    typeof onViewModeChange === "function" &&
    typeof onCompactChange === "function" &&
    typeof onPageSizeChange === "function";

  if (isControlled) {
    return (
      <DisplaySettingsBase
        viewMode={viewMode}
        isCompact={isCompact}
        pageSize={pageSize}
        onViewModeChange={onViewModeChange}
        onCompactChange={onCompactChange}
        onPageSizeChange={onPageSizeChange}
        className={className}
      />
    );
  }

  return (
    <DisplaySettingsUncontrolled
      onViewModeChange={onViewModeChange}
      onCompactChange={onCompactChange}
      onPageSizeChange={onPageSizeChange}
      className={className}
    />
  );
}
