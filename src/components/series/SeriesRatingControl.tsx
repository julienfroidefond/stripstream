"use client";

import { useState } from "react";
import { RatingStars } from "./RatingStars";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import { setSeriesRating, deleteSeriesRating } from "@/app/actions/ratings";
import { getErrorMessage } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";
import type { NormalizedProviderRating } from "@/lib/providers/types";

interface SeriesRatingControlProps {
  seriesId: string;
  /** Rating on the 1-10 half-star scale, or null if unrated. */
  initialRating: number | null;
  /** Read-only aggregate ratings from linked metadata providers. */
  providerRatings: NormalizedProviderRating[];
  disabled?: boolean;
}

/** Capitalize a provider slug for display (e.g. "anilist" → "AniList"). */
function displayProvider(provider: string): string {
  if (!provider) return "";
  // Heuristique : on met en majuscule les petites particules connues, sinon capitalize simple.
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function SeriesRatingControl({
  seriesId,
  initialRating,
  providerRatings,
  disabled = false,
}: SeriesRatingControlProps) {
  const { toast } = useToast();
  const { t } = useTranslate();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [saving, setSaving] = useState(false);

  async function handleChange(newRating: number) {
    setSaving(true);
    try {
      const result = await setSeriesRating(seriesId, newRating);
      if (result.success) {
        setRating(newRating);
        toast({ title: t("series.header.rating.saved") });
      } else {
        toast({ title: t("series.header.rating.error"), description: result.message, variant: "destructive" });
      }
    } catch (error) {
      logger.error({ err: error, seriesId }, "Erreur notation série");
      toast({
        title: t("series.header.rating.error"),
        description: getErrorMessage(ERROR_CODES.SERIES.RATING_ERROR),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      const result = await deleteSeriesRating(seriesId);
      if (result.success) {
        setRating(null);
        toast({ title: t("series.header.rating.deleted") });
      } else {
        toast({ title: t("series.header.rating.error"), description: result.message, variant: "destructive" });
      }
    } catch (error) {
      logger.error({ err: error, seriesId }, "Erreur suppression note série");
      toast({
        title: t("series.header.rating.error"),
        description: getErrorMessage(ERROR_CODES.SERIES.RATING_ERROR),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1" data-testid="series-rating">
      <div
        className={`flex items-center gap-2 ${saving || disabled ? "opacity-40 pointer-events-none" : ""}`}
        title={!rating ? t("series.header.rating.empty") : undefined}
      >
        <RatingStars value={rating} onChange={handleChange} onClear={handleClear} size="md" />
        {rating !== null && (
          <span data-testid="series-rating-value" className="text-sm font-medium tabular-nums text-white/90">
            {(rating / 2).toFixed(1)}
          </span>
        )}
        {saving && (
          <svg className="w-3.5 h-3.5 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
      {providerRatings.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/70">
          {providerRatings.map((p) => (
            <span key={p.provider} className="tabular-nums">
              {displayProvider(p.provider)} {(p.rating / (p.ratingScale || 10) * 10).toFixed(1)}/10
              {p.ratingCount != null ? ` (${p.ratingCount})` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default SeriesRatingControl;
