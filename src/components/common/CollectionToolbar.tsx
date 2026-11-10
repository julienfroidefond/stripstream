import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CollectionToolbarProps {
  search: ReactNode;
  filters?: ReactNode;
  sort?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Barre commune des pages de collection : recherche à gauche, filtres, tri et
 * actions à droite. Les contrôles passent à la ligne quand la place manque.
 */
export function CollectionToolbar({
  search,
  filters,
  sort,
  actions,
  className,
}: CollectionToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-surface-1 p-3 sm:flex-row sm:flex-wrap sm:items-center",
        className
      )}
    >
      <div className="w-full min-w-0 sm:w-auto sm:min-w-56 sm:flex-1">{search}</div>
      {(filters || sort || actions) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters}
          {sort}
          {actions}
        </div>
      )}
    </div>
  );
}
