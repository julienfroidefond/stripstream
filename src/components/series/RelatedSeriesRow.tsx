"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SeriesCover } from "@/components/ui/series-cover";
import { CoverCard, CoverEdge } from "@/components/ui/cover-card";
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
            <RelatedSeriesCard key={s.id} series={s} />
          ))}
        </ScrollContainer>
      )}
    </Section>
  );
}

function RelatedSeriesCard({ series }: { series: NormalizedSeries }) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  return (
    <CoverCard
      href={`/series/${series.id}`}
      ariaLabel={t("series.coverLink", { title: series.name })}
      className="w-[160px] shrink-0 sm:w-[188px]"
      cover={
        <>
          <SeriesCover
            series={series}
            alt={t("series.coverAlt", { title: series.name })}
            isAnonymous={isAnonymous}
            showProgressUi={false}
          />
          <CoverEdge />
        </>
      }
      badge={<SeriesMatchReasonBadges reasons={series.matchReasons} className="z-30" />}
    >
      <p className="line-clamp-2 text-sm font-medium leading-tight transition-colors group-hover:text-primary">
        {series.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("series.books", { count: series.bookCount })}
      </p>
    </CoverCard>
  );
}
