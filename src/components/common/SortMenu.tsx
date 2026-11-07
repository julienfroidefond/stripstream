"use client";

import { ArrowUpDown, ChevronDown, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SortMenuOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface SortMenuProps {
  value: string;
  options: SortMenuOption[];
  onChange: (value: string) => void;
  /** Libellé accessible du bouton, par exemple « Trier les séries ». */
  label: string;
  testId?: string;
  className?: string;
}

export function SortMenu({
  value,
  options,
  onChange,
  label,
  testId,
  className,
}: SortMenuProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  const Icon = selected?.icon ?? ArrowUpDown;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={label}
          aria-label={`${label}: ${selected?.label ?? ""}`}
          data-testid={testId}
          className={cn(
            "h-9 rounded-full border px-3 text-xs font-medium sm:text-sm",
            "border-border bg-surface-1 hover:bg-surface-2",
            className
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="ml-2 hidden whitespace-nowrap min-[420px]:inline">
            {selected?.label}
          </span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuRadioItem key={option.value} value={option.value} className="gap-2">
                {OptionIcon && <OptionIcon className="h-4 w-4 text-muted-foreground" />}
                {option.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
