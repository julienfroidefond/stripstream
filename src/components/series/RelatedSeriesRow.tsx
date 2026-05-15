"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SeriesCover } from "@/components/ui/series-cover";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { useTranslate } from "@/hooks/useTranslate";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { cn } from "@/lib/utils";
import type { NormalizedSeries } from "@/lib/providers/types";

const REASON_STYLES: Record<string, string> = {
  same_author: "bg-blue-600/90 text-white",
  same_genre: "bg-violet-600/90 text-white",
  same_publisher: "bg-emerald-600/90 text-white",
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

            {/* match reason badges — always visible, top-left */}
            {s.matchReasons && s.matchReasons.length > 0 && (
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                {s.matchReasons.map((reason) => (
                  <span
                    key={reason}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none shadow backdrop-blur-sm",
                      REASON_STYLES[reason] ?? "bg-black/50 text-white"
                    )}
                  >
                    {t(`series.matchReasons.${reason}` as Parameters<typeof t>[0]) ?? reason}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </ScrollContainer>
    </Section>
  );
}
