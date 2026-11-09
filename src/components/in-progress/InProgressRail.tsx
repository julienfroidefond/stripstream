"use client";

import Link from "next/link";
import { Flame, type LucideIcon } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { SeriesCover } from "@/components/ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import type { InProgressItem } from "@/lib/services/in-progress.service";
import { RelativeTime } from "./RelativeTime";

interface InProgressRailProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  items: InProgressItem[];
  now: number;
  testId: string;
}

export function InProgressRail({
  title,
  description,
  icon,
  items,
  now,
  testId,
}: InProgressRailProps) {
  const { t } = useTranslate();

  if (items.length === 0) return null;

  return (
    <Section
      title={title}
      description={description}
      icon={icon}
      className="space-y-5"
      headerClassName="pb-1"
      data-testid={testId}
    >
      <StaggerGroup stagger={0.05} effect="deal" amount={0.2}>
        <ScrollContainer
          showArrows
          scrollAmount={420}
          arrowLeftLabel={t("navigation.scrollLeft")}
          arrowRightLabel={t("navigation.scrollRight")}
        >
          {items.map((item) => {
            const href = item.resumeBook
              ? `/books/${item.resumeBook.id}`
              : `/series/${item.series.id}`;
            const almostDone = item.remainingBooks <= 2;

            return (
              <StaggerItem key={item.series.id} className="shrink-0">
                <Link
                  href={href}
                  className="group/card block w-[160px] sm:w-[176px]"
                  data-testid={`in-progress-rail-card-${item.series.id}`}
                >
                  <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 transition-[translate,box-shadow] duration-500 ease-projection group-hover/card:-translate-y-1.5 group-hover/card:shadow-lg group-hover/card:ring-border motion-reduce:transition-none">
                    <SeriesCover
                      series={item.series}
                      alt={t("series.coverAlt", { title: item.series.name })}
                      showProgressUi
                    />
                    {almostDone && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
                        <Flame className="h-3 w-3" />
                        {t("inProgress.card.almostDone")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5 px-0.5">
                    <p className="line-clamp-2 text-sm font-medium leading-tight transition-colors group-hover/card:text-primary">
                      {item.series.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("inProgress.card.remaining", { count: item.remainingBooks })}
                    </p>
                    <RelativeTime
                      value={item.lastReadAt}
                      now={now}
                      className="block text-[11px] text-muted-foreground"
                    />
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </ScrollContainer>
      </StaggerGroup>
    </Section>
  );
}
