"use server";

import { revalidateTag } from "next/cache";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

const HOME_CACHE_TAG = "home-data";

/**
 * Met à jour la progression de lecture d'un livre
 * Note: ne pas utiliser "use server" avec redirect - on gère manuellement
 */
export async function updateReadProgress(
  bookId: string,
  page: number,
  completed: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    await BookService.updateReadProgress(bookId, page, completed);

    // Invalider le cache de la home (sans refresh auto)
    revalidateTag(HOME_CACHE_TAG, "min");

    return { success: true, message: "Progression mise à jour" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour" };
  }
}

/**
 * Supprime la progression de lecture d'un livre
 */
export async function deleteReadProgress(
  bookId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await BookService.deleteReadProgress(bookId);

    // Invalider le cache de la home (sans refresh auto)
    revalidateTag(HOME_CACHE_TAG, "min");

    return { success: true, message: "Progression supprimée" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la suppression" };
  }
}
