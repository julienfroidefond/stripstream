import { NextResponse } from "next/server";
import { ConfigDBService } from "@/lib/services/config-db.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { TTLConfig } from "@/types/komga";

export async function GET() {
  try {
    const config: TTLConfig | null = await ConfigDBService.getTTLConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration TTL:", error);
    if (error instanceof Error) {
      if (error.message === "Utilisateur non authentifié") {
        return NextResponse.json(
          {
            error: {
              code: ERROR_CODES.MIDDLEWARE.UNAUTHORIZED,
              message: ERROR_MESSAGES[ERROR_CODES.MIDDLEWARE.UNAUTHORIZED],
            },
          },
          { status: 401 }
        );
      }
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CONFIG.TTL_FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.CONFIG.TTL_FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    if (error instanceof Error && error.message === "Utilisateur non authentifié") {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.MIDDLEWARE.UNAUTHORIZED,
            message: ERROR_MESSAGES[ERROR_CODES.MIDDLEWARE.UNAUTHORIZED],
          },
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CONFIG.TTL_SAVE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.CONFIG.TTL_SAVE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
