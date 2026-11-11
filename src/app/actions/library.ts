"use server";

import { revalidatePath } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import type { ScanStatus } from "@/lib/providers/types";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import {
  ActionError,
  runProviderAction,
  type ActionResult,
} from "@/lib/actions/action-runner";

interface ScanActionData {
  /** Backend job id when the scan can be followed, otherwise null. */
  jobId: string | null;
  /** True when `getScanStatus` can report progress for this scan. */
  progressSupported: boolean;
  /** True when the provider refused the scan for lack of privileges. */
  forbidden?: boolean;
}

export type ScanActionResult = ActionResult<ScanActionData>;

/** Only backend-generated ids are accepted back from the client. */
const JOB_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

function scanFailureData(error: unknown): Partial<ScanActionData> {
  return {
    jobId: null,
    progressSupported: false,
    forbidden:
      error instanceof AppError &&
      (error.code === ERROR_CODES.KOMGA.FORBIDDEN ||
        error.code === ERROR_CODES.STRIPSTREAM.FORBIDDEN),
  };
}

export async function scanLibrary(libraryId: string): Promise<ScanActionResult> {
  return runProviderAction<ScanActionData>({
    name: "scanLibrary",
    fallbackCode: ERROR_CODES.LIBRARY.SCAN_ERROR,
    fallbackMessage: "Erreur lors du scan",
    logContext: { libraryId },
    failureData: scanFailureData,
    invalidate: () => {
      revalidatePath(`/libraries/${libraryId}`);
      revalidatePath("/libraries");
    },
    execute: async ({ provider }) => {
      const result = await provider.scanLibrary(libraryId);
      return { message: "Scan lancé", ...result };
    },
  });
}

/**
 * Follow the scan started by `scanLibrary`. Never throws: a provider that
 * cannot report progress (Komga), a read-scoped token (403) or a network blip
 * all degrade to `unavailable`, which tells the client to stop polling.
 */
export async function getScanStatus(libraryId: string, jobId: string): Promise<ScanStatus> {
  if (!JOB_ID_PATTERN.test(jobId)) return { state: "unavailable" };

  try {
    const provider = await getProvider();
    if (!provider) return { state: "unavailable" };

    return await provider.getScanStatus(libraryId, jobId);
  } catch {
    return { state: "unavailable" };
  }
}

export async function getRandomBookFromLibraries(
  libraryIds: string[]
): Promise<ActionResult<{ thumbnailUrl: string }>> {
  return runProviderAction<{ thumbnailUrl: string }>({
    name: "getRandomBookFromLibraries",
    fallbackCode: ERROR_CODES.LIBRARY.FETCH_ERROR,
    fallbackMessage: "Erreur lors de la récupération d'un livre aléatoire",
    logContext: { libraryIds },
    guard: () => {
      if (!libraryIds.length) {
        throw new ActionError(
          ERROR_CODES.LIBRARY.FETCH_ERROR,
          {},
          "Au moins une bibliothèque doit être sélectionnée"
        );
      }
    },
    execute: async ({ provider }) => {
      const bookId = await provider.getRandomBook(libraryIds);
      if (!bookId) {
        throw new ActionError(
          ERROR_CODES.BOOK.NOT_FOUND,
          {},
          "Aucun livre trouvé dans les bibliothèques sélectionnées"
        );
      }

      return {
        message: "Livre aléatoire trouvé",
        thumbnailUrl: provider.getBookThumbnailUrl(bookId),
      };
    },
  });
}
