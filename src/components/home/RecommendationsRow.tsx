"use client";

import { useState, memo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Sparkles } from "lucide-react";
import { SeriesCover } from "@/components/ui/series-cover";
import { LoadMoreLabel } from "@/components/ui/load-more-label";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { CarouselViewToggle } from "@/components/ui/carousel-view-toggle";
import { SpotlightCarousel } from "@/components/ui/spotlight-carousel";
import { SeriesSpotlightSlide } from "@/components/ui/series-spotlight-slide";
import { SeriesMatchReasonBadges } from "@/components/ui/series-match-reasons";
import { useTranslate } from "@/hooks/useTranslate";
import { useCarouselViewMode } from "@/hooks/useCarouselViewMode";
import { useAnonymous } from "@/contexts/AnonymousContext";
import type { NormalizedSeries } from "@/lib/providers/types";
import { loadHomeFeed } from "@/app/actions/home";
import { GlowLayer, StaggerGroup, StaggerItem, usePointerGlow } from "@/components/motion";

const ITEMS_PER_PAGE = 8;

interface RecommendationsRowProps {
  series: NormalizedSeries[];
  /** Renseigné par l'appel serveur : la liste reçue est déjà tronquée. */
  initialHasMore?: boolean;
}

export function RecommendationsRow({ series, initialHasMore = false }: RecommendationsRowProps) {
  const { t } = useTranslate();
  const router = useRouter();
  const { viewMode, toggleViewMode } = useCarouselViewMode("recommendations-view-mode", {
    defaultMode: "spotlight",
  });
  const [loadedSeries, setLoadedSeries] = useState(series.slice(0, ITEMS_PER_PAGE));
  const [hasMore, setHasMore] = useState(initialHasMore || series.length > ITEMS_PER_PAGE);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadHomeFeed("recommendations", loadedSeries.length);
      setLoadedSeries(result.items as NormalizedSeries[]);
      setHasMore(result.hasMore);
    });
  };

  if (!series.length) return null;

  const loadMoreFooter = hasMore ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleLoadMore}
      disabled={isPending}
      aria-busy={isPending}
      className="disabled:opacity-100"
    >
      <LoadMoreLabel
                  pending={isPending}
                  label={t("navigation.loadMore")}
                  loadingLabel={t("navigation.loading")}
                />
    </Button>
  ) : undefined;

  return (
    <Section
      title={t("home.sections.recommendations")}
      icon={Wand2}
      className="space-y-5"
      headerClassName="pb-1"
      actions={<CarouselViewToggle viewMode={viewMode} onToggle={toggleViewMode} />}
    >
      {viewMode === "spotlight" ? (
        <SpotlightCarousel
          ariaLabel={t("home.sections.recommendations")}
          slides={loadedSeries.map((item) => ({
            key: item.id,
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
          }))}
          footer={loadMoreFooter}
        />
      ) : (
        <StaggerGroup stagger={0.05} effect="deal" amount={0.25}>
          <ScrollContainer
            showArrows={true}
            scrollAmount={400}
            arrowLeftLabel={t("navigation.scrollLeft")}
            arrowRightLabel={t("navigation.scrollRight")}
          >
            {loadedSeries.map((s) => (
              <StaggerItem key={s.id} className="shrink-0">
                <RecommendationCard series={s} />
              </StaggerItem>
            ))}
            {hasMore && (
              <StaggerItem className="shrink-0">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isPending}
                  aria-busy={isPending}
                  className="flex min-h-[282px] w-[150px] items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:min-h-[300px]"
                >
                  <LoadMoreLabel
                  pending={isPending}
                  label={t("navigation.loadMore")}
                  loadingLabel={t("navigation.loading")}
                />
                </button>
              </StaggerItem>
            )}
          </ScrollContainer>
        </StaggerGroup>
      )}
    </Section>
  );
}

/* ── Card (classic rail) ───────────────────────────────────────────────────── */

const RecommendationCard = memo(function RecommendationCard({ series: s }: { series: NormalizedSeries }) {
  const router = useRouter();
  const { isAnonymous } = useAnonymous();
  const glowRef = useRef<HTMLButtonElement>(null);
  const handleGlow = usePointerGlow(glowRef);

  return (
    <button
      type="button"
      ref={glowRef}
      onMouseMove={handleGlow}
      onClick={() => router.push(`/series/${s.id}`)}
      className="group relative flex w-[160px] shrink-0 flex-col gap-1.5 sm:w-[188px]"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 transition-[translate,box-shadow] duration-500 ease-projection group-hover:-translate-y-2 group-hover:ring-border motion-reduce:transition-none">
        <div className="absolute inset-0 transition-transform duration-700 ease-projection group-hover:scale-[1.07] motion-reduce:transition-none">
          <SeriesCover
            series={s}
            alt={s.name}
            isAnonymous={isAnonymous}
            showProgressUi={false}
          />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">{/* taste-skill-ignore: scrim neutre au-dessus de la couverture */}
          <p className="line-clamp-2 text-left text-xs font-semibold text-white">{s.name}</p>
        </div>

        <SeriesMatchReasonBadges reasons={s.matchReasons} />

        <GlowLayer />
      </div>

      {s.becauseOf && s.becauseOf.length > 0 && (
        <p className="line-clamp-2 flex items-start gap-1 px-0.5 text-left text-[11px] text-muted-foreground">
          <Sparkles className="mt-px h-3 w-3 shrink-0 text-primary/60" />
          <span className="font-medium text-foreground/70">{s.becauseOf.join(", ")}</span>
        </p>
      )}
    </button>
  );
});
