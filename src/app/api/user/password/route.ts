import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { AppError } from "@/utils/errors";
import { AuthServerService } from "@/lib/services/auth-server.service";
import logger from "@/lib/logger";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Mots de passe manquants" }, { status: 400 });
    }

    // Vérifier que le nouveau mot de passe est fort
    if (!AuthServerService.isPasswordStrong(newPassword)) {
      return NextResponse.json(
        {
          error:
            "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre",
        },
        { status: 400 }
      );
    }

    await UserService.changePassword(currentPassword, newPassword);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du changement de mot de passe:");

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status:
            error.code === "AUTH_INVALID_PASSWORD"
              ? 400
              : error.code === "AUTH_UNAUTHENTICATED"
                ? 401
                : 500,
        }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors du changement de mot de passe" },
      { status: 500 }
    );
  }
}
