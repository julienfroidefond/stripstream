"use client";
import React from "react";

import { useRouter } from "next/navigation";
import { Sparkles, UserRound, Tag, Building2, Bookmark } from "lucide-react";
import { SeriesCover } from "@/components/ui/series-cover";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { NormalizedSeries } from "@/lib/providers/types";

const REASON_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  same_reading_list: { icon: Bookmark,  className: "bg-cyan-600/90 text-white" },
  same_author:       { icon: UserRound, className: "bg-blue-600/90 text-white" },
  same_genre:        { icon: Tag,       className: "bg-violet-600/90 text-white" },
  same_publisher:    { icon: Building2, className: "bg-emerald-600/90 text-white" },
};

interface RelatedSeriesRowProps {
  series: NormalizedSeries[];
}

export function RelatedSeriesRow({ series }: RelatedSeriesRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  if (!series.length) return null;

  return (
    <Section
      title={t("series.related")}
      icon={Sparkles}
      className="space-y-5"
      headerClassName="border-b border-border/50 pb-2"
    >
      <ScrollContainer
        showArrows={true}
        scrollAmount={400}
        arrowLeftLabel={t("navigation.scrollLeft")}
        arrowRightLabel={t("navigation.scrollRight")}
      >
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => router.push(`/series/${s.id}`)}
            className="group relative aspect-[2/3] w-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-[188px]"
          >
            <SeriesCover series={s} alt={s.name} isAnonymous={isAnonymous} showProgressUi={false} />

            {/* hover overlay with title */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <p className="line-clamp-2 text-left text-sm font-medium text-white">{s.name}</p>
            </div>

            {/* match reason badges — icon only */}
            {s.matchReasons && s.matchReasons.length > 0 && (
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                {s.matchReasons.map((reason) => {
                  const config = REASON_CONFIG[reason];
                  const Icon = config?.icon;
                  return (
                    <span
                      key={reason}
                      title={t(`series.matchReasons.${reason}` as Parameters<typeof t>[0]) ?? reason}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full shadow backdrop-blur-sm",
                        config?.className ?? "bg-black/50 text-white"
                      )}
                    >
                      {Icon && <Icon className="h-3 w-3" />}
                    </span>
                  );
                })}
              </div>
            )}
          </button>
        ))}
      </ScrollContainer>
    </Section>
  );
}
