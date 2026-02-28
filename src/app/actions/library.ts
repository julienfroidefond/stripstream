"use server";

import { revalidatePath } from "next/cache";
import { LibraryService } from "@/lib/services/library.service";
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
