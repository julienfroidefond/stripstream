import { NextResponse } from "next/server";
import { getServerCacheService } from "@/lib/services/server-cache.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

export async function POST() {
  try {
    const cacheService = await getServerCacheService();
    cacheService.clear();
    return NextResponse.json({ message: "🧹 Cache vidé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.CLEAR_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.CACHE.CLEAR_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
