"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (term: string) => void;
  isPending?: boolean;
  placeholder?: string;
  testId?: string;
}

/**
 * Champ de recherche contrôlé. Le debounce, la navigation et l'état d'attente
 * appartiennent au contrôleur de collection (`usePaginatedGrid`).
 */
export const SearchInput = ({
  value,
  onChange,
  isPending = false,
  placeholder,
  testId,
}: SearchInputProps) => {
  return (
    <div className="relative w-full rounded-xl border border-border bg-surface-1 px-1 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-2xl">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        data-testid={testId}
        type={isPending ? "text" : "search"}
        placeholder={placeholder}
        className="h-12 rounded-xl border-0 bg-transparent pl-10 pr-10 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
};
