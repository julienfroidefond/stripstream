import { NextResponse } from "next/server";
import type { ServerCacheService } from "@/lib/services/server-cache.service";
import { getServerCacheService } from "@/lib/services/server-cache.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";

export async function GET() {
  try {
    const cacheService: ServerCacheService = await getServerCacheService();
    const { sizeInBytes, itemCount } = await cacheService.getCacheSize();
    
    return NextResponse.json({ 
      sizeInBytes, 
      itemCount,
      mode: cacheService.getCacheMode()
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la taille du cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.SIZE_FETCH_ERROR,
          name: "Cache size fetch error",
          message: getErrorMessage(ERROR_CODES.CACHE.SIZE_FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

