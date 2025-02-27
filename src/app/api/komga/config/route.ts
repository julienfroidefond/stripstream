import { NextResponse } from "next/server";
import { ConfigDBService } from "@/lib/services/config-db.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { KomgaConfig, KomgaConfigData } from "@/types/komga";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data: KomgaConfigData = await request.json();
    const mongoConfig: KomgaConfig = await ConfigDBService.saveConfig(data);

    return NextResponse.json(
      { message: "⚙️ Configuration sauvegardée avec succès", mongoConfig },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la configuration:", error);
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
          code: ERROR_CODES.CONFIG.SAVE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.CONFIG.SAVE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const mongoConfig: KomgaConfig | null = await ConfigDBService.getConfig();

    return NextResponse.json(mongoConfig, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration:", error);
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
      if (error.message === "Configuration non trouvée") {
        return NextResponse.json(
          {
            error: {
              code: ERROR_CODES.KOMGA.MISSING_CONFIG,
              message: ERROR_MESSAGES[ERROR_CODES.KOMGA.MISSING_CONFIG],
            },
          },
          { status: 404 }
        );
      }
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CONFIG.FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.CONFIG.FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
