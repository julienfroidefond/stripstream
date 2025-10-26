import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { AppError } from "@/utils/errors";
import { AuthServerService } from "@/lib/services/auth-server.service";
import logger from "@/lib/logger";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword) {
      return NextResponse.json(
        { error: "Nouveau mot de passe manquant" },
        { status: 400 }
      );
    }

    // Vérifier que le mot de passe est fort
    if (!AuthServerService.isPasswordStrong(newPassword)) {
      return NextResponse.json(
        { 
          error: "Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre" 
        },
        { status: 400 }
      );
    }

    await AdminService.resetUserPassword(userId, newPassword);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la réinitialisation du mot de passe:");

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { 
          status: error.code === "AUTH_FORBIDDEN" ? 403 : 
                  error.code === "AUTH_UNAUTHENTICATED" ? 401 :
                  error.code === "AUTH_USER_NOT_FOUND" ? 404 :
                  error.code === "ADMIN_CANNOT_RESET_OWN_PASSWORD" ? 400 : 500 
        }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
}

