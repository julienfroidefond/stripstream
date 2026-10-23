"use client";

import { useRef } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { usePresence } from "@/components/motion";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { SeriesRatingControl } from "@/components/series/SeriesRatingControl";
import type { NormalizedSeriesRating } from "@/lib/providers/types";

interface EndOfSeriesModalProps {
  show: boolean;
  onClose: (currentPage: number) => void;
  currentPage: number;
  /** Série notée à la fin de la lecture, si le provider la supporte. */
  seriesId?: string | null;
  seriesRating?: NormalizedSeriesRating | null;
}

export function EndOfSeriesModal({
  show,
  onClose,
  currentPage,
  seriesId,
  seriesRating,
}: EndOfSeriesModalProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();

  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const canRate = !isAnonymous && Boolean(seriesId) && seriesRating != null;

  // Le rideau tombe sur la lecture, puis le carton de fin se lève vers le
  // spectateur, comme les scènes de l'accueil.
  const rendered = usePresence(show, overlayRef, {
    enter: (timeline, overlay, still) => {
      timeline.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0);
      if (cardRef.current && !still) {
        timeline.fromTo(
          cardRef.current,
          { opacity: 0, y: 50, rotateX: 22, scale: 0.9, transformPerspective: 1200 },
          { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" },
          0.08
        );
      }
    },
    exit: (timeline, overlay, still) => {
      if (cardRef.current && !still) {
        timeline.to(
          cardRef.current,
          { opacity: 0, y: 20, scale: 0.96, duration: 0.25, ease: "power2.in" },
          0
        );
      }
      timeline.to(overlay, { opacity: 0, duration: 0.3 }, still ? 0 : 0.1);
    },
  });

  if (!rendered) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-of-series-title"
      className="absolute inset-0 flex items-center justify-center bg-background/80 z-50"
    >
      <div ref={cardRef} className="bg-surface-2 rounded-lg p-6 max-w-md text-center">
        <h3 id="end-of-series-title" className="text-lg font-semibold mb-2">
          {t("reader.endOfSeries")}
        </h3>
        <p className="text-muted-foreground mb-4">{t("reader.endOfSeriesMessage")}</p>
        {canRate && seriesId && (
          <div className="mb-5">
            <div className="mb-4 h-px bg-border" />
            <p className="text-sm text-muted-foreground mb-3">{t("reader.endOfSeriesRate")}</p>
            <div className="flex justify-center" data-testid="end-of-series-rating">
              <SeriesRatingControl
                seriesId={seriesId}
                initialRating={seriesRating?.userRating ?? null}
                providerRatings={seriesRating?.providerRatings ?? []}
                tone="surface"
              />
            </div>
          </div>
        )}
        <button
          onClick={() => onClose(currentPage)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {t("reader.backToSeries")}
        </button>
      </div>
    </div>
  );
}
