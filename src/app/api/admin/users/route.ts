import { NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin.service";
import { AppError } from "@/utils/errors";

export async function GET() {
  try {
    const users = await AdminService.getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);

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
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}
