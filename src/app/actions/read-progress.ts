"use server";

import { revalidateTag } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, SERIES_BOOKS_CACHE_TAG } from "@/constants/cacheConstants";
import { AppError } from "@/utils/errors";

function revalidateReadCaches() {
  revalidateTag(HOME_CACHE_TAG, "max");
  revalidateTag(LIBRARY_SERIES_CACHE_TAG, "max");
  revalidateTag(SERIES_BOOKS_CACHE_TAG, "max");
}

export async function updateReadProgress(
  bookId: string,
  page: number,
  completed: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    await provider.saveReadProgress(bookId, page, completed);
    revalidateReadCaches();

    return { success: true, message: "Progression mise à jour" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour" };
  }
}

export async function deleteReadProgress(
  bookId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    await provider.resetReadProgress(bookId);
    revalidateReadCaches();

    return { success: true, message: "Progression supprimée" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la suppression" };
  }
}
