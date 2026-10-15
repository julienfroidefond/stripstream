"use client";

import { Library } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { NormalizedLibrary, NormalizedSeries } from "@/lib/providers/types";
import { RefreshButton } from "./RefreshButton";
import { ScanButton } from "./ScanButton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeriesCover } from "@/components/ui/series-cover";
import { useTranslate } from "@/hooks/useTranslate";
import { ProjectionBackdrop } from "@/components/ui/projection-backdrop";
import { fadeUp, liftIn, maskUp, staggerContainer } from "@/lib/motion";

interface LibraryHeaderProps {
  library: NormalizedLibrary;
  seriesCount: number;
  series: NormalizedSeries[];
}

const getHeaderSeries = (series: NormalizedSeries[]) => {
  if (series.length === 0) {
    return { featured: null, background: null };
  }

  const featured = series[0] ?? null;

  if (!featured) {
    return { featured: null, background: null };
  }

  const background = series[1] ?? featured;

  return { featured, background };
};

/**
 * Bandeau de bibliothèque : l'affiche du "film". La couverture floutée éclaire
 * le fond, puis le thème décide de la salle — écran noir en sombre, papier en
 * clair — pour que le titre reste toujours le point le plus net de la page.
 */
export function LibraryHeader({
  library,
  seriesCount,
  series,
}: LibraryHeaderProps) {
  const { t } = useTranslate();
  const reduce = useReducedMotion();
  const { featured, background } = getHeaderSeries(series);
  const seriesLabel = t(
    seriesCount > 1 ? "library.header.series_plural" : "library.header.series",
    { count: seriesCount }
  );

  const staged = reduce
    ? {}
    : { variants: staggerContainer(0.08, 0.05), initial: "hidden" as const, animate: "visible" as const };

  return (
    <div className="relative w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
      <div className="absolute inset-0">
        {background ? (
          <ProjectionBackdrop src={background.thumbnailUrl} />
        ) : (
          <div className="h-full w-full bg-surface-2" />
        )}
      </div>

      <div className="relative container mx-auto flex min-h-[240px] items-end px-4 py-8 md:min-h-[320px] md:py-10">
        <motion.div className="flex w-full items-end gap-5 md:gap-8" {...staged}>
          <motion.div
            variants={reduce ? undefined : liftIn}
            className="relative aspect-2/3 w-[92px] shrink-0 overflow-hidden rounded-xl bg-surface-1 ring-1 ring-border md:w-[136px]"
          >
            {featured ? (
              <SeriesCover
                series={featured}
                alt={t("library.coverAlt", { name: library.name })}
                showProgressUi={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-3">
                <Library className="h-10 w-10 text-primary" />
              </div>
            )}
          </motion.div>

          <div className="min-w-0 flex-1 space-y-3 pb-1">
            <span className="block overflow-hidden">
              <motion.h1
                variants={reduce ? undefined : maskUp}
                className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-5xl"
              >
                {library.name}
              </motion.h1>
            </span>

            <motion.div
              variants={reduce ? undefined : fadeUp}
              className="flex flex-wrap items-center gap-2"
            >
              <StatusBadge status="unread" icon={Library}>
                {seriesLabel}
              </StatusBadge>

              <RefreshButton libraryId={library.id} />
              <ScanButton libraryId={library.id} />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
