"use server";

import { revalidatePath } from "next/cache";
import { LibraryService } from "@/lib/services/library.service";
import { BookService } from "@/lib/services/book.service";
import { AppError } from "@/utils/errors";

/**
 * Lance un scan de bibliothèque
 */
export async function scanLibrary(
  libraryId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await LibraryService.scanLibrary(libraryId, false);

    // Invalider le cache de la bibliothèque
    revalidatePath(`/libraries/${libraryId}`);
    revalidatePath("/libraries");

    return { success: true, message: "Scan lancé" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors du scan" };
  }
}

/**
 * Retourne un livre aléatoire depuis les bibliothèques sélectionnées
 */
export async function getRandomBookFromLibraries(
  libraryIds: string[]
): Promise<{ success: boolean; bookId?: string; message?: string }> {
  try {
    if (!libraryIds.length) {
      return { success: false, message: "Au moins une bibliothèque doit être sélectionnée" };
    }

    const bookId = await BookService.getRandomBookFromLibraries(libraryIds);
    return { success: true, bookId };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }

    return { success: false, message: "Erreur lors de la récupération d'un livre aléatoire" };
  }
}
