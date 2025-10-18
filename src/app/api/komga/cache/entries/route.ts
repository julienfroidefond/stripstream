import { NextResponse } from "next/server";
import type { ServerCacheService } from "@/lib/services/server-cache.service";
import { getServerCacheService } from "@/lib/services/server-cache.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";

export async function GET() {
  try {
    const cacheService: ServerCacheService = await getServerCacheService();
    const entries = await cacheService.getCacheEntries();
    
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Erreur lors de la récupération des entrées du cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.SIZE_FETCH_ERROR,
          name: "Cache entries fetch error",
          message: getErrorMessage(ERROR_CODES.CACHE.SIZE_FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

