"use client";

import { useRouter } from "next/navigation";
import { Wand2, UserRound, Tag, Building2, Sparkles, Bookmark } from "lucide-react";
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

interface RecommendationsRowProps {
  series: NormalizedSeries[];
}

export function RecommendationsRow({ series }: RecommendationsRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  if (!series.length) return null;

  return (
    <Section
      title={t("home.sections.recommendations")}
      icon={Wand2}
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
            className="group relative flex w-[160px] flex-shrink-0 flex-col gap-1.5 sm:w-[188px]"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <SeriesCover series={s} alt={s.name} isAnonymous={isAnonymous} showProgressUi={false} />

              {/* hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <p className="line-clamp-2 text-left text-xs font-semibold text-white">{s.name}</p>
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
                          config?.className ?? "bg-black/70 text-white"
                        )}
                      >
                        {Icon && <Icon className="h-3 w-3" />}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* because_of — icône + noms sur 2 lignes */}
            {s.becauseOf && s.becauseOf.length > 0 && (
              <p className="line-clamp-2 flex items-start gap-1 px-0.5 text-left text-[11px] text-muted-foreground">
                <Sparkles className="mt-px h-3 w-3 shrink-0 text-primary/60" />
                <span className="font-medium text-foreground/70">{s.becauseOf.join(", ")}</span>
              </p>
            )}
          </button>
        ))}
      </ScrollContainer>
    </Section>
  );
}
