"use server";

import { revalidatePath } from "next/cache";
import { getProvider } from "@/lib/providers/provider.factory";
import { AppError } from "@/utils/errors";

export async function scanLibrary(
  libraryId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const provider = await getProvider();
    if (!provider) return { success: false, message: "Provider non configuré" };

    await provider.scanLibrary(libraryId);

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
