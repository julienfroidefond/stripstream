import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  meta?: ReactNode;
  className?: string;
}

/**
 * En-tête commun des pages de collection : icône, titre, description et
 * éventuelle ligne de synthèse. Il reprend la mise en page historique de ces
 * pages pour que les titres restent identiques d'une collection à l'autre.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {meta && <div className="flex flex-wrap items-center gap-2 text-xs">{meta}</div>}
    </header>
  );
}
