"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Book, BookMarked, BookOpen, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { SeriesGrid } from "@/components/library/SeriesGrid";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import { StripstreamAdapter } from "@/lib/providers/stripstream/stripstream.adapter";
import type { StripstreamReadingListDetail } from "@/types/stripstream";
import { useBannerScene } from "@/components/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ReadingListContentProps {
  detail: StripstreamReadingListDetail;
}

export function ReadingListContent({ detail }: ReadingListContentProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const reduce = usePrefersReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);
  useBannerScene(headerRef);
  /** Marqueurs d'entrée en scène de `useBannerScene` (états de départ en CSS). */
  const fly = reduce ? {} : { "data-hero-fly": "" };
  const item = reduce ? {} : { "data-hero-item": "" };
  const [failedBannerCover, setFailedBannerCover] = useState<string | null>(null);
  const series = detail.items.map(StripstreamAdapter.toNormalizedReadingListSeries);
  const bannerCovers = series.map((item) => item.thumbnailUrl).filter(Boolean);
  const bannerCover =
    bannerCovers.find((cover) => cover !== failedBannerCover) ?? "";
  const totalBooks = detail.items.reduce((total, item) => total + item.book_count, 0);
  const readBooks = detail.items.reduce((total, item) => total + item.books_read_count, 0);
  const allSeriesRead =
    detail.items.length > 0 &&
    detail.items.every((item) => item.book_count > 0 && item.books_read_count >= item.book_count);
  const readingStatus = isAnonymous || totalBooks === 0
    ? null
    : allSeriesRead
      ? { label: t("series.header.status.read"), status: "success" as const, icon: BookMarked }
      : readBooks > 0
        ? {
            label: t("series.header.status.progress", { read: readBooks, total: totalBooks }),
            status: "reading" as const,
            icon: BookOpen,
          }
        : { label: t("series.header.status.unread"), status: "unread" as const, icon: Book };

  return (
    <>
      {/* Bandeau plein cadre : l'écran se déroule, puis glisse moins vite que la page. */}
      <div
        ref={headerRef}
        className="relative min-h-[200px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden"
      >
        <div className="absolute inset-0" data-banner-backdrop>
          <div className="absolute inset-0" {...(reduce ? {} : { "data-banner-unroll": "" })}>
            {bannerCover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerCover}
                alt=""
                aria-hidden="true"
                onError={() => setFailedBannerCover(bannerCover)}
                className="absolute inset-0 h-full w-full object-cover blur-xs scale-105 brightness-50"
              />
            )}
            {/* Fallback neutre quand aucune couverture */}
            {!bannerCover && (
              <div className="absolute inset-0 bg-surface-2" />
            )}
            <div className="absolute inset-0 bg-background/60" />
          </div>
        </div>

        <div className="relative container mx-auto px-4 pt-10 pb-8" data-banner-content>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("home.reading_lists.back")}
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div
              {...fly}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white"
            >
              <Bookmark className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                <span data-banner-title>{detail.name}</span>
              </h1>
              {detail.description && (
                <p {...item} className="line-clamp-2 text-sm text-white/70">
                  {detail.description}
                </p>
              )}
              <div {...item} className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                <p>{t("home.reading_lists.series_count", { count: detail.items.length })}</p>
                {readingStatus && (
                  <StatusBadge
                    data-testid="reading-list-status"
                    status={readingStatus.status}
                    icon={readingStatus.icon}
                    className="border-white/20 bg-white/10 text-white"
                  >
                    {readingStatus.label}
                  </StatusBadge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Container>
        {detail.items.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{t("home.reading_lists.empty")}</p>
        ) : (
          <div className="py-8">
            <SeriesGrid series={series} />
          </div>
        )}
      </Container>
    </>
  );
}
