import { NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";

export async function GET() {
  try {
    const stats = await AdminService.getUserStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des stats:");

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { 
          status: error.code === "AUTH_FORBIDDEN" ? 403 : 
                  error.code === "AUTH_UNAUTHENTICATED" ? 401 : 500 
        }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération des stats" },
      { status: 500 }
    );
  }
}

