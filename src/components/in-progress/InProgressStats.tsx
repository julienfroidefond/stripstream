"use client";

import {
  BookOpenCheck,
  Clock,
  Flame,
  Heart,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { CountUp } from "@/components/motion";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type {
  InProgressFilter,
  InProgressSort,
  InProgressStats as InProgressStatsData,
} from "@/lib/services/in-progress.service";

interface InProgressStatsProps {
  stats: InProgressStatsData;
  filter: InProgressFilter;
  sort: InProgressSort;
  onFilterChange: (filter: InProgressFilter) => void;
  onSortChange: (sort: InProgressSort) => void;
}

interface StatCard {
  key: string;
  icon: LucideIcon;
  value: number;
  label: string;
  active: boolean;
  onClick?: () => void;
  hint?: string;
}

export function InProgressStats({
  stats,
  filter,
  sort,
  onFilterChange,
  onSortChange,
}: InProgressStatsProps) {
  const { t } = useTranslate();

  const cards: StatCard[] = [
    {
      key: "total",
      icon: BookOpenCheck,
      value: stats.total,
      label: t("inProgress.stats.total"),
      active: filter === "all",
      onClick: () => onFilterChange("all"),
      hint: t("inProgress.stats.filterHint"),
    },
    {
      key: "remaining",
      icon: Layers,
      value: stats.remaining,
      label: t("inProgress.stats.remaining"),
      active: sort === "remaining",
      onClick: () => onSortChange("remaining"),
      hint: t("inProgress.stats.sortHint"),
    },
    {
      key: "almost-done",
      icon: Flame,
      value: stats.almostDone,
      label: t("inProgress.stats.almostDone"),
      active: filter === "almost-done",
      onClick: () => onFilterChange("almost-done"),
      hint: t("inProgress.stats.filterHint"),
    },
    {
      key: "paused",
      icon: Clock,
      value: stats.paused,
      label: t("inProgress.stats.paused"),
      active: filter === "paused",
      onClick: () => onFilterChange("paused"),
      hint: t("inProgress.stats.filterHint"),
    },
    {
      key: "favorites",
      icon: Heart,
      value: stats.favorites,
      label: t("inProgress.stats.favorites"),
      active: filter === "favorites",
      onClick: () => onFilterChange("favorites"),
      hint: t("inProgress.stats.filterHint"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map(({ key, icon: Icon, value, label, active, onClick, hint }) => {
        const content = (
          <>
            <span
              className={cn(
                "rounded-xl bg-primary/10 p-2 text-primary transition-colors",
                active && "bg-primary text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-semibold tabular-nums">
                <CountUp value={value} duration={0.9} />
              </span>
              <span className="block truncate text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px]">
                {label}
              </span>
            </span>
          </>
        );

        const className = cn(
          "flex items-center gap-3 rounded-2xl bg-surface-1 px-3 py-2.5 text-left ring-1 ring-border/60 transition-[background-color,box-shadow,translate] duration-300",
          onClick &&
            "hover:-translate-y-0.5 hover:bg-surface-2 hover:ring-border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          active && "bg-primary/5 ring-primary/50"
        );

        return onClick ? (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={className}
            aria-label={`${label}: ${value}`}
            aria-pressed={active}
            title={hint}
            data-testid={`in-progress-stat-${key}`}
          >
            {content}
          </button>
        ) : (
          <div key={key} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
