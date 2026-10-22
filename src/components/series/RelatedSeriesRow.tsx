"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SeriesCover } from "@/components/ui/series-cover";
import { ScrollContainer } from "@/components/ui/scroll-container";
import { Section } from "@/components/ui/section";
import { CarouselViewToggle } from "@/components/ui/carousel-view-toggle";
import { SpotlightCarousel } from "@/components/ui/spotlight-carousel";
import { SeriesSpotlightSlide } from "@/components/ui/series-spotlight-slide";
import { SeriesMatchReasonBadges } from "@/components/ui/series-match-reasons";
import { useTranslate } from "@/hooks/useTranslate";
import { useCarouselViewMode } from "@/hooks/useCarouselViewMode";
import { useAnonymous } from "@/contexts/AnonymousContext";
import type { NormalizedSeries } from "@/lib/providers/types";

interface RelatedSeriesRowProps {
  series: NormalizedSeries[];
}

export function RelatedSeriesRow({ series }: RelatedSeriesRowProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { viewMode, toggleViewMode } = useCarouselViewMode("series-related-view-mode");

  if (!series.length) return null;

  const openSeries = (id: string) => router.push(`/series/${id}`);

  return (
    <Section
      title={t("series.related")}
      icon={Sparkles}
      className="space-y-5"
      headerClassName="pb-2"
      actions={<CarouselViewToggle viewMode={viewMode} onToggle={toggleViewMode} />}
    >
      {viewMode === "spotlight" ? (
        <SpotlightCarousel
          ariaLabel={t("series.related")}
          slides={series.map((s) => ({
            key: s.id,
            backdropSrc: s.thumbnailUrl,
            content: (
              <SeriesSpotlightSlide
                series={s}
                onOpen={() => openSeries(s.id)}
                ctaLabel={t("navigation.viewSeries")}
                eyebrow={t("navigation.seriesLabel")}
                showMatchReasons
              />
            ),
          }))}
        />
      ) : (
        <ScrollContainer
          showArrows={true}
          scrollAmount={400}
          arrowLeftLabel={t("navigation.scrollLeft")}
          arrowRightLabel={t("navigation.scrollRight")}
        >
          {series.map((s) => (
            <RelatedSeriesCard key={s.id} series={s} onOpen={openSeries} />
          ))}
        </ScrollContainer>
      )}
    </Section>
  );
}

function RelatedSeriesCard({
  series: s,
  onOpen,
}: {
  series: NormalizedSeries;
  onOpen: (id: string) => void;
}) {
  const { isAnonymous } = useAnonymous();

  return (
    <button
      type="button"
      onClick={() => onOpen(s.id)}
      className="group relative aspect-2/3 w-[160px] shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-[188px]"
    >
      <SeriesCover series={s} alt={s.name} isAnonymous={isAnonymous} showProgressUi={false} />

      {/* hover overlay with title */}
      <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">{/* taste-skill-ignore: scrim neutre au-dessus de la couverture */}
        <p className="line-clamp-2 text-left text-sm font-medium text-white">{s.name}</p>
      </div>

      <SeriesMatchReasonBadges reasons={s.matchReasons} />
    </button>
  );
}
