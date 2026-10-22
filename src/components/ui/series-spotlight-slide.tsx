"use client";

import { motion, useReducedMotion } from "framer-motion";
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
import { useSpotlightReveal } from "@/components/ui/spotlight-carousel";
import { CountUp, Magnetic, SplitWords } from "@/components/motion";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import { EASE_OUT, EASE_PROJECTION, fadeUp, staggerContainer } from "@/lib/motion";
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
  const reduce = useReducedMotion();
  const revealed = useSpotlightReveal();

  const stagedContent = reduce
    ? {}
    : {
        variants: staggerContainer(0.07, 0.08),
        initial: "hidden" as const,
        animate: revealed ? ("visible" as const) : ("hidden" as const),
      };
  const stagedItem = reduce ? {} : { variants: fadeUp };

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
    <motion.div
      className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9"
      {...stagedContent}
    >
      {/* Couverture à gauche, comme « Reprendre la lecture ». */}
      <motion.button
        type="button"
        variants={reduce ? undefined : fadeUp}
        onClick={onOpen}
        whileHover={reduce ? undefined : { y: -10, rotateZ: -2, scale: 1.04 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="group/cover relative mx-auto block aspect-2/3 w-[168px] shrink-0 overflow-hidden rounded-xl sm:mx-0 sm:w-[196px]"
        aria-label={ctaLabel}
      >
        <SeriesCover
          series={series}
          alt={series.name}
          isAnonymous={isAnonymous}
          showProgressUi={false}
        />
      </motion.button>

      <div className="flex flex-1 flex-col justify-center gap-4 text-center text-foreground sm:text-left">
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary sm:justify-start"
          {...stagedItem}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {eyebrow}
          {seriesStatus && (
            <StatusBadge status={seriesStatus.status} icon={seriesStatus.icon} className="normal-case tracking-normal">
              {t(`series.header.seriesStatus.${series.seriesStatus}`)}
            </StatusBadge>
          )}
        </motion.div>

        {becauseOf && becauseOf.length > 0 && (
          <motion.p
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start"
            {...stagedItem}
          >
            <Sparkles className="h-3 w-3 shrink-0 text-primary" />
            <span>
              {t("home.recommendations.because")}{" "}
              <span className="font-medium text-foreground/75">{becauseOf.join(", ")}</span>
            </span>
          </motion.p>
        )}

        <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          <SplitWords text={series.name} />
        </h2>

        {(authorsText || series.startYear != null) && (
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start"
            {...stagedItem}
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
          </motion.div>
        )}

        {genres.length > 0 && (
          <motion.div
            className="flex flex-wrap justify-center gap-1.5 sm:justify-start"
            {...stagedItem}
          >
            {genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {genre}
              </span>
            ))}
          </motion.div>
        )}

        {summary && (
          <motion.p
            className="line-clamp-2 text-sm text-muted-foreground sm:text-base"
            {...stagedItem}
          >
            {summary}
          </motion.p>
        )}

        {showMatchReasons && (
          <motion.div {...stagedItem}>
            <SeriesMatchReasonPills reasons={series.matchReasons} />
          </motion.div>
        )}

        {hasProgress && (
          <motion.div className="mx-auto w-full max-w-md space-y-2 sm:mx-0" {...stagedItem}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
              <motion.div
                className="h-full origin-left rounded-full bg-primary"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: percent / 100 }}
                transition={{ duration: 1, ease: EASE_PROJECTION, delay: 0.35 }}
                style={{ width: "100%" }}
              />
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
          </motion.div>
        )}

        <motion.div className="mt-1 flex justify-center sm:justify-start" {...stagedItem}>
          <Magnetic>
            <Button onClick={onOpen} size="lg" className="group/cta gap-2 font-semibold">
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1" />
            </Button>
          </Magnetic>
        </motion.div>
      </div>
    </motion.div>
  );
}
