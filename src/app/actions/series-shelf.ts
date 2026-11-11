"use server";

import { invalidateSeriesShelf } from "@/lib/cache/invalidation";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  runProviderAction,
  type ActionResult,
} from "@/lib/actions/action-runner";

export type SeriesShelfResult = ActionResult;

async function updateShelf(
  seriesId: string,
  shelved: boolean,
  libraryId?: string
): Promise<SeriesShelfResult> {
  return runProviderAction({
    name: shelved ? "shelveSeries" : "unshelveSeries",
    fallbackCode: ERROR_CODES.SERIES.SHELF_ERROR,
    logContext: { seriesId, shelved, libraryId },
    invalidate: () => invalidateSeriesShelf(seriesId, libraryId),
    execute: async ({ provider }) => {
      if (shelved) {
        await provider.shelveSeries(seriesId);
      } else {
        await provider.unshelveSeries(seriesId);
      }
      return { message: shelved ? "Série mise de côté" : "Série reprise" };
    },
  });
}

/** Met une série de côté pour le lecteur courant (idempotent). */
export async function shelveSeries(
  seriesId: string,
  libraryId?: string
): Promise<SeriesShelfResult> {
  return updateShelf(seriesId, true, libraryId);
}

/** Reprend une série mise de côté par le lecteur courant (idempotent). */
export async function unshelveSeries(
  seriesId: string,
  libraryId?: string
): Promise<SeriesShelfResult> {
  return updateShelf(seriesId, false, libraryId);
}
