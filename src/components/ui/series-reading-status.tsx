"use client";

import { useTranslate } from "@/hooks/useTranslate";
import {
  getSeriesReadingState,
  type SeriesReadingState,
  type SeriesReadingStatus,
} from "@/lib/series/reading-status";
import type { NormalizedSeries } from "@/lib/providers/types";

type Translate = (
  key: string,
  values?: { [key: string]: string | number }
) => string;

/** Classes de la pastille de lecture, partagées par la grille et la liste. */
export const seriesReadingStatusClassNames: Record<SeriesReadingStatus, string> = {
  "no-books": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  read: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "in-progress": "bg-primary/10 text-primary",
  unread: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function getSeriesReadingStatusLabel(t: Translate, state: SeriesReadingState): string {
  switch (state.status) {
    case "no-books":
      return t("series.status.noBooks");
    case "read":
      return t("series.status.read");
    case "in-progress":
      return t("series.status.progress", { read: state.read, total: state.total });
    case "unread":
      return t("series.status.unread");
  }
}

/** Résout le statut et son libellé traduit pour une série. */
export function useSeriesReadingStatus(
  series: Pick<NormalizedSeries, "bookCount" | "booksReadCount">
): SeriesReadingState & { label: string; className: string } {
  const { t } = useTranslate();
  const state = getSeriesReadingState(series);

  return {
    ...state,
    label: getSeriesReadingStatusLabel(t, state),
    className: seriesReadingStatusClassNames[state.status],
  };
}
