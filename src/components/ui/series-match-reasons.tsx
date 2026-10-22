"use client";

import { Bookmark, Building2, Tag, UserRound, type LucideIcon } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { NormalizedSeries } from "@/lib/providers/types";

/** Style partagé des raisons de recommandation (accueil et séries similaires). */
export const SERIES_REASON_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  same_reading_list: { icon: Bookmark, className: "bg-amber-600/90 text-white" },
  same_author: { icon: UserRound, className: "bg-teal-600/90 text-white" },
  same_genre: { icon: Tag, className: "bg-cyan-600/90 text-white" },
  same_publisher: { icon: Building2, className: "bg-emerald-600/90 text-white" },
};

function useReasonLabel() {
  const { t } = useTranslate();
  return (reason: string) => t(`series.matchReasons.${reason}`);
}

/** Pastilles texte, utilisées dans les diapositives « une œuvre à la fois ». */
export function SeriesMatchReasonPills({
  reasons,
  className,
}: {
  reasons: NormalizedSeries["matchReasons"];
  className?: string;
}) {
  const label = useReasonLabel();

  if (!reasons || reasons.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2 sm:justify-start", className)}>
      {reasons.map((reason) => {
        const config = SERIES_REASON_CONFIG[reason];
        const Icon = config?.icon;
        return (
          <span
            key={reason}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              config?.className ?? "bg-black/50 text-white"
            )}
          >
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            {label(reason)}
          </span>
        );
      })}
    </div>
  );
}

/** Pastilles icône, posées sur une couverture (rail classique et diapositive). */
export function SeriesMatchReasonBadges({
  reasons,
  className,
}: {
  reasons: NormalizedSeries["matchReasons"];
  className?: string;
}) {
  const label = useReasonLabel();

  if (!reasons || reasons.length === 0) return null;

  return (
    <div className={cn("absolute left-2 top-2 flex flex-col gap-1", className)}>
      {reasons.map((reason) => {
        const config = SERIES_REASON_CONFIG[reason];
        const Icon = config?.icon;
        return (
          <span
            key={reason}
            title={label(reason)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full",
              config?.className ?? "bg-black/50 text-white"
            )}
          >
            {Icon && <Icon className="h-3 w-3" />}
          </span>
        );
      })}
    </div>
  );
}
