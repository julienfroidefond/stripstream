"use server";

import { invalidateSeriesRating } from "@/lib/cache/invalidation";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  ActionError,
  runProviderAction,
  type ActionResult,
} from "@/lib/actions/action-runner";

export async function setSeriesRating(
  seriesId: string,
  rating: number
): Promise<ActionResult> {
  return runProviderAction({
    name: "setSeriesRating",
    fallbackCode: ERROR_CODES.SERIES.RATING_ERROR,
    logContext: { seriesId, rating },
    guard: () => {
      if (!(1 <= rating && rating <= 10)) {
        throw new ActionError(ERROR_CODES.SERIES.RATING_ERROR);
      }
    },
    invalidate: () => invalidateSeriesRating(seriesId),
    execute: async ({ provider }) => {
      await provider.setSeriesRating(seriesId, rating);
      return { message: "Note enregistrée" };
    },
  });
}

export async function deleteSeriesRating(seriesId: string): Promise<ActionResult> {
  return runProviderAction({
    name: "deleteSeriesRating",
    fallbackCode: ERROR_CODES.SERIES.RATING_ERROR,
    logContext: { seriesId },
    invalidate: () => invalidateSeriesRating(seriesId),
    execute: async ({ provider }) => {
      await provider.deleteSeriesRating(seriesId);
      return { message: "Note supprimée" };
    },
  });
}
