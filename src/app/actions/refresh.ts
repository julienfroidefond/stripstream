"use server";

import { revalidatePath, updateTag } from "next/cache";
import { HOME_CACHE_TAG, LIBRARY_SERIES_CACHE_TAG, BOOK_CACHE_TAG } from "@/constants/cacheConstants";

export type RefreshScope = "home" | "library" | "series" | "book";

/**
 * Invalide le cache Next.js pour forcer un re-fetch au prochain router.refresh().
 * À appeler côté client avant router.refresh() sur les boutons / pull-to-refresh.
 */
export async function revalidateForRefresh(scope: RefreshScope, id: string): Promise<void> {
  switch (scope) {
    case "home":
      updateTag(HOME_CACHE_TAG);
      revalidatePath("/");
      break;
    case "library":
      updateTag(LIBRARY_SERIES_CACHE_TAG);
      revalidatePath(`/libraries/${id}`);
      revalidatePath("/libraries");
      break;
    case "series":
      revalidatePath(`/series/${id}`);
      revalidatePath("/series");
      break;
    case "book":
      updateTag(`${BOOK_CACHE_TAG}:${id}`);
      revalidatePath(`/books/${id}`);
      break;
    default:
      break;
  }
}
