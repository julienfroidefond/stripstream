"use server";

import { revalidatePath } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import type { ScanStatus } from "@/lib/providers/types";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

export interface ScanActionResult {
  success: boolean;
  message: string;
  /** Backend job id when the scan can be followed, otherwise null. */
  jobId: string | null;
  /** True when `getScanStatus` can report progress for this scan. */
  progressSupported: boolean;
  /** True when the provider refused the scan for lack of privileges. */
  forbidden?: boolean;
}

/** Only backend-generated ids are accepted back from the client. */
const JOB_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export async function scanLibrary(libraryId: string): Promise<ScanActionResult> {
  const noProgress = { jobId: null, progressSupported: false } as const;

  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré", ...noProgress };

    const result = await provider.scanLibrary(libraryId);

    revalidatePath(`/libraries/${libraryId}`);
    revalidatePath("/libraries");

    return { success: true, message: "Scan lancé", ...result };
  } catch (error) {
    if (error instanceof AppError) {
      return {
        success: false,
        message: error.message,
        ...noProgress,
        forbidden:
          error.code === ERROR_CODES.KOMGA.FORBIDDEN ||
          error.code === ERROR_CODES.STRIPSTREAM.FORBIDDEN,
      };
    }
    return { success: false, message: "Erreur lors du scan", ...noProgress };
  }
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
): Promise<{ success: boolean; thumbnailUrl?: string; message?: string }> {
  try {
    if (!libraryIds.length) {
      return { success: false, message: "Au moins une bibliothèque doit être sélectionnée" };
    }

    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    const bookId = await provider.getRandomBook(libraryIds);
    if (!bookId) {
      return { success: false, message: "Aucun livre trouvé dans les bibliothèques sélectionnées" };
    }

    return { success: true, thumbnailUrl: provider.getBookThumbnailUrl(bookId) };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la récupération d'un livre aléatoire" };
  }
}
