import { NextResponse } from "next/server";
import { ConfigDBService } from "@/lib/services/config-db.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { TTLConfig } from "@/types/komga";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";

export async function GET() {
  try {
    const config: TTLConfig | null = await ConfigDBService.getTTLConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration TTL:", error);
    if (error instanceof Error) {
      if (error.message === getErrorMessage(ERROR_CODES.MIDDLEWARE.UNAUTHORIZED)) {
        return NextResponse.json(
          {
            error: {
              name: "Unauthorized",
              code: ERROR_CODES.MIDDLEWARE.UNAUTHORIZED,
              message: getErrorMessage(ERROR_CODES.MIDDLEWARE.UNAUTHORIZED),
            },
          },
          { status: 401 }
        );
      }
    }
    return NextResponse.json(
      {
        error: {
          name: "TTL fetch error",
          code: ERROR_CODES.CONFIG.TTL_FETCH_ERROR,
          message: getErrorMessage(ERROR_CODES.CONFIG.TTL_FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const config: TTLConfig = await ConfigDBService.saveTTLConfig(data);

    return NextResponse.json({
      message: "⏱️ Configuration TTL sauvegardée avec succès",
      config: {
        defaultTTL: config.defaultTTL,
        homeTTL: config.homeTTL,
        librariesTTL: config.librariesTTL,
        seriesTTL: config.seriesTTL,
        booksTTL: config.booksTTL,
        imagesTTL: config.imagesTTL,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la configuration TTL:", error);
    if (
      error instanceof Error &&
      error.message === getErrorMessage(ERROR_CODES.MIDDLEWARE.UNAUTHORIZED)
    ) {
      return NextResponse.json(
        {
          error: {
            name: "Unauthorized",
            code: ERROR_CODES.MIDDLEWARE.UNAUTHORIZED,
            message: getErrorMessage(ERROR_CODES.MIDDLEWARE.UNAUTHORIZED),
          },
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error: {
          name: "TTL save error",
          code: ERROR_CODES.CONFIG.TTL_SAVE_ERROR,
          message: getErrorMessage(ERROR_CODES.CONFIG.TTL_SAVE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
