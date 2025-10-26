import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { roles } = body;

    if (!roles || !Array.isArray(roles)) {
      return NextResponse.json(
        { error: "Rôles invalides" },
        { status: 400 }
      );
    }

    await AdminService.updateUserRoles(userId, roles);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la mise à jour de l'utilisateur:");

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { 
          status: error.code === "AUTH_FORBIDDEN" ? 403 : 
                  error.code === "AUTH_UNAUTHENTICATED" ? 401 :
                  error.code === "AUTH_USER_NOT_FOUND" ? 404 : 500 
        }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    await AdminService.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression de l'utilisateur:");

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { 
          status: error.code === "AUTH_FORBIDDEN" ? 403 : 
                  error.code === "AUTH_UNAUTHENTICATED" ? 401 :
                  error.code === "AUTH_USER_NOT_FOUND" ? 404 :
                  error.code === "ADMIN_CANNOT_DELETE_SELF" ? 400 : 500 
        }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    );
  }
}

