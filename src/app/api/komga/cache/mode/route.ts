import { NextResponse } from "next/server";
import {
  CacheMode,
  getServerCacheService,
  ServerCacheService,
} from "@/lib/services/server-cache.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";

export async function GET() {
  try {
    const cacheService: ServerCacheService = await getServerCacheService();
    return NextResponse.json({ mode: cacheService.getCacheMode() });
  } catch (error) {
    console.error("Erreur lors de la récupération du mode de cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.MODE_FETCH_ERROR,
          name: "Cache mode fetch error",
          message: getErrorMessage(ERROR_CODES.CACHE.MODE_FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { mode }: { mode: CacheMode } = await request.json();
    if (mode !== "file" && mode !== "memory") {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.CACHE.INVALID_MODE,
            name: "Invalid cache mode",
            message: getErrorMessage(ERROR_CODES.CACHE.INVALID_MODE),
          },
        },
        { status: 400 }
      );
    }

    const cacheService: ServerCacheService = await getServerCacheService();
    cacheService.setCacheMode(mode);
    return NextResponse.json({ mode: cacheService.getCacheMode() });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mode de cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.MODE_UPDATE_ERROR,
          name: "Cache mode update error",
          message: getErrorMessage(ERROR_CODES.CACHE.MODE_UPDATE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
