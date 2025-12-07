import { NextResponse } from "next/server";
import type { ServerCacheService } from "@/lib/services/server-cache.service";
import { getServerCacheService } from "@/lib/services/server-cache.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { revalidatePath } from "next/cache";
import logger from "@/lib/logger";

export async function POST() {
  try {
    const cacheService: ServerCacheService = await getServerCacheService();
    await cacheService.clear();

    // Revalider toutes les pages importantes après le vidage du cache
    revalidatePath("/");
    revalidatePath("/libraries");
    revalidatePath("/series");
    revalidatePath("/books");

    return NextResponse.json({ message: "🧹 Cache vidé avec succès" });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression du cache:");
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.CLEAR_ERROR,
          name: "Cache clear error",
          message: getErrorMessage(ERROR_CODES.CACHE.CLEAR_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
