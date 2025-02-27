import { NextResponse } from "next/server";
import { getServerCacheService, ServerCacheService } from "@/lib/services/server-cache.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";

export async function POST() {
  try {
    const cacheService: ServerCacheService = await getServerCacheService();
    cacheService.clear();
    return NextResponse.json({ message: "🧹 Cache vidé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.CLEAR_ERROR,
          message: getErrorMessage(ERROR_CODES.CACHE.CLEAR_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
