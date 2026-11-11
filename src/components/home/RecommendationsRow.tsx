"use client";

import { memo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wand2, Sparkles } from "lucide-react";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { SeriesCover } from "@/components/ui/series-cover";
import { SeriesSpotlightSlide } from "@/components/ui/series-spotlight-slide";
import { SeriesMatchReasonBadges } from "@/components/ui/series-match-reasons";
import { useTranslate } from "@/hooks/useTranslate";
import { useCoverInteraction } from "@/hooks/useCoverInteraction";
import { useAnonymous } from "@/contexts/AnonymousContext";
import type { NormalizedSeries } from "@/lib/providers/types";
import { FeedRow } from "@/components/home/FeedRow";
import { GlowLayer, usePointerGlow } from "@/components/motion";

interface RecommendationsRowProps {
  series: NormalizedSeries[];
  /** Renseigné par l'appel serveur : la liste reçue est déjà tronquée. */
  initialHasMore?: boolean;
}

export function RecommendationsRow({ series, initialHasMore = false }: RecommendationsRowProps) {
  const { t } = useTranslate();
  const router = useRouter();

  return (
    <FeedRow
      titleKey="home.sections.recommendations"
      icon={Wand2}
      initialItems={series}
      initialHasMore={initialHasMore}
      feed="recommendations"
      viewModeKey="recommendations-view-mode"
      defaultViewMode="spotlight"
      getKey={(item) => item.id}
      renderCard={(item) => <RecommendationCard series={item} />}
      renderSlide={(item) => ({
        backdropSrc: item.thumbnailUrl,
        content: (
          <SeriesSpotlightSlide
            series={item}
            onOpen={() => router.push(`/series/${item.id}`)}
            ctaLabel={t("home.recommendations.discover")}
            eyebrow={t("navigation.seriesLabel")}
            showMatchReasons
            becauseOf={item.becauseOf}
          />
        ),
      })}
    />
  );
}

/* ── Card (classic rail) ───────────────────────────────────────────────────── */

const RecommendationCard = memo(function RecommendationCard({ series: s }: { series: NormalizedSeries }) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const { active, handlers } = useCoverInteraction<HTMLAnchorElement>();
  const glowRef = useRef<HTMLAnchorElement>(null);
  const handleGlow = usePointerGlow(glowRef);

  return (
    <Link
      href={`/series/${s.id}`}
      ref={glowRef}
      aria-label={t("home.coverLinkSeries", { title: s.name })}
      onMouseMove={handleGlow}
      {...handlers}
      className="group relative flex w-[160px] shrink-0 flex-col gap-1.5 focus-visible:outline-hidden sm:w-[188px]"
    >
      <div className="relative w-full">
        <BookCoverScene
          active={active}
          contained
          className="w-full"
          cover={
            <>
              <SeriesCover
                series={s}
                alt={t("series.coverAlt", { title: s.name })}
                isAnonymous={isAnonymous}
                showProgressUi={false}
              />

              <SeriesMatchReasonBadges reasons={s.matchReasons} className="z-30" />

              <GlowLayer />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-20 rounded-[2px_6px_6px_2px] ring-1 ring-inset ring-border/60"
              />
            </>
          }
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 rounded-[2px_6px_6px_2px] opacity-0 ring-2 ring-ring ring-offset-2 ring-offset-background transition-opacity duration-150 group-focus-visible:opacity-100"
        />
      </div>

      {s.becauseOf && s.becauseOf.length > 0 && (
        <p className="line-clamp-2 flex items-start gap-1 px-0.5 text-left text-[11px] text-muted-foreground">
          <Sparkles className="mt-px h-3 w-3 shrink-0 text-primary/60" />
          <span className="font-medium text-foreground/70">{s.becauseOf.join(", ")}</span>
        </p>
      )}
    </Link>
  );
});
