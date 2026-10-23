"use client";

import {
  ArrowRight,
  BookOpen,
  Calendar,
  CircleCheck,
  CircleDot,
  CirclePause,
  CircleX,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

import { SeriesCover } from "@/components/ui/series-cover";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { SeriesMatchReasonPills } from "@/components/ui/series-match-reasons";
import { useSpotlightStaging } from "@/components/ui/spotlight-carousel";
import { CountUp, Magnetic, ProgressFill } from "@/components/motion";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import type { NormalizedSeries } from "@/lib/providers/types";

const SERIES_STATUS: Record<
  string,
  { status: "info" | "success" | "warning" | "error"; icon: LucideIcon }
> = {
  ongoing: { status: "info", icon: CircleDot },
  ended: { status: "success", icon: CircleCheck },
  hiatus: { status: "warning", icon: CirclePause },
  cancelled: { status: "error", icon: CircleX },
};

interface SeriesSpotlightSlideProps {
  series: NormalizedSeries;
  onOpen: () => void;
  ctaLabel: string;
  /** Petit libellé au-dessus du titre, comme « Reprendre la lecture ». */
  eyebrow: string;
  /** Affiche les raisons de recommandation en pastilles texte. */
  showMatchReasons?: boolean;
  /** Mention « Parce que vous aimez… » (recommandations). */
  becauseOf?: string[] | null;
}

/**
 * Diapositive « une série à la fois » au même format que « Reprendre la
 * lecture » : couverture à gauche, description, progression et bouton.
 */
export function SeriesSpotlightSlide({
  series,
  onOpen,
  ctaLabel,
  eyebrow,
  showMatchReasons = false,
  becauseOf,
}: SeriesSpotlightSlideProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  const staging = useSpotlightStaging();

  const authorsText = series.authors?.length
    ? series.authors.map((author) => author.name).join(", ")
    : null;
  const genres = series.genres?.filter(Boolean) ?? [];
  const summary =
    series.summary?.trim() ||
    (genres.length > 0 ? genres.slice(0, 3).join(" • ") : null) ||
    authorsText;
  const seriesStatus = series.seriesStatus ? SERIES_STATUS[series.seriesStatus] : undefined;
  const hasProgress =
    !isAnonymous && series.bookCount > 0 && series.booksReadCount > 0;
  const percent = hasProgress
    ? Math.min(100, Math.round((series.booksReadCount / series.bookCount) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
      {/* Couverture à gauche, comme « Reprendre la lecture ». */}
      {/* L'enveloppe fixe capte le survol, le bouton seul se soulève. */}
      <div className="group/cover mx-auto shrink-0 sm:mx-0">
        <button
          type="button"
          onClick={onOpen}
          {...staging.cover}
          className="relative block aspect-2/3 w-[168px] overflow-hidden rounded-xl sm:w-[196px] transition-transform duration-350 ease-out group-hover/cover:-translate-y-2.5 group-hover/cover:-rotate-2 group-hover/cover:scale-104 motion-reduce:transition-none motion-reduce:group-hover/cover:translate-none motion-reduce:group-hover/cover:rotate-none motion-reduce:group-hover/cover:scale-none"
          aria-label={ctaLabel}
        >
          <SeriesCover
            series={series}
            alt={series.name}
            isAnonymous={isAnonymous}
            showProgressUi={false}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 text-center text-foreground sm:text-left">
        <div
          className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start"
          {...staging.item}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {eyebrow}
          {seriesStatus && (
            <StatusBadge status={seriesStatus.status} icon={seriesStatus.icon} className="normal-case tracking-normal">
              {t(`series.header.seriesStatus.${series.seriesStatus}`)}
            </StatusBadge>
          )}
        </div>

        {becauseOf && becauseOf.length > 0 && (
          <p
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start"
            {...staging.item}
          >
            <Sparkles className="h-3 w-3 shrink-0 text-primary" />
            <span>
              {t("home.recommendations.because")}{" "}
              <span className="font-medium text-foreground/75">{becauseOf.join(", ")}</span>
            </span>
          </p>
        )}

        <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          <span {...staging.title}>{series.name}</span>
        </h2>

        {(authorsText || series.startYear != null) && (
          <div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start"
            {...staging.item}
          >
            {authorsText && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0" />
                {authorsText}
              </span>
            )}
            {series.startYear != null && (
              <span className="flex items-center gap-1.5 tabular-nums">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {series.startYear}
              </span>
            )}
          </div>
        )}

        {genres.length > 0 && (
          <div
            className="flex flex-wrap justify-center gap-1.5 sm:justify-start"
            {...staging.item}
          >
            {genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {summary && (
          <p
            className="line-clamp-2 text-sm text-muted-foreground sm:text-base"
            {...staging.item}
          >
            {summary}
          </p>
        )}

        {showMatchReasons && (
          <div {...staging.item}>
            <SeriesMatchReasonPills reasons={series.matchReasons} />
          </div>
        )}

        {hasProgress && (
          <div className="mx-auto w-full max-w-md space-y-2 sm:mx-0" {...staging.item}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
              <ProgressFill percent={percent} />
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              <span className="font-semibold text-foreground tabular-nums">
                <CountUp value={percent} suffix="%" />
              </span>
              <span className="tabular-nums">
                {t("series.header.status.progress", {
                  read: series.booksReadCount,
                  total: series.bookCount,
                })}
              </span>
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-center sm:justify-start" {...staging.item}>
          <Magnetic>
            <Button onClick={onOpen} size="lg" className="group/cta gap-2 font-semibold">
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
            </Button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
}
