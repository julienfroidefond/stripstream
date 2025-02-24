import { NextResponse } from "next/server";
import { getServerCacheService } from "@/lib/services/server-cache.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

export async function GET() {
  try {
    const cacheService = await getServerCacheService();
    return NextResponse.json({ mode: cacheService.getCacheMode() });
  } catch (error) {
    console.error("Erreur lors de la récupération du mode de cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.MODE_FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.CACHE.MODE_FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { mode } = await request.json();
    if (mode !== "file" && mode !== "memory") {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.CACHE.INVALID_MODE,
            message: ERROR_MESSAGES[ERROR_CODES.CACHE.INVALID_MODE],
          },
        },
        { status: 400 }
      );
    }

    const cacheService = await getServerCacheService();
    cacheService.setCacheMode(mode);
    return NextResponse.json({ mode: cacheService.getCacheMode() });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mode de cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.MODE_UPDATE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.CACHE.MODE_UPDATE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
