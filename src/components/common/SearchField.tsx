"use client";

import { Search, X } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchFieldProps extends InputProps {
  /** Affiche un bouton d'effacement quand la valeur est contrôlée et non vide. */
  onClear?: () => void;
  clearLabel?: string;
  wrapperClassName?: string;
}

export function SearchField({
  onClear,
  clearLabel,
  wrapperClassName,
  className,
  value,
  ...props
}: SearchFieldProps) {
  const isControlled = value !== undefined;
  const showClear =
    Boolean(onClear && clearLabel) && typeof value === "string" && value.length > 0;

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        {...props}
        {...(isControlled ? { value } : {})}
        className={cn("pl-9", showClear && "pr-9", className)}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={clearLabel}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
