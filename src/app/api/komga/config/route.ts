import { NextResponse } from "next/server";
import { ConfigDBService } from "@/lib/services/config-db.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const mongoConfig = await ConfigDBService.saveConfig(data);
    // Convertir le document Mongoose en objet simple
    const config = {
      url: mongoConfig.url,
      username: mongoConfig.username,
      password: mongoConfig.password,
      userId: mongoConfig.userId,
    };
    return NextResponse.json(
      { message: "⚙️ Configuration sauvegardée avec succès", config },
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
    const mongoConfig = await ConfigDBService.getConfig();
    // Convertir le document Mongoose en objet simple
    const config = {
      url: mongoConfig.url,
      username: mongoConfig.username,
      password: mongoConfig.password,
      userId: mongoConfig.userId,
    };
    return NextResponse.json(config, { status: 200 });
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
