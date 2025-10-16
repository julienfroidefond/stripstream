import { NextResponse } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { AppError } from "@/utils/errors";

export async function GET() {
  try {
    const [profile, stats] = await Promise.all([
      UserService.getUserProfile(),
      UserService.getUserStats(),
    ]);

    return NextResponse.json({ ...profile, stats });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "AUTH_UNAUTHENTICATED" ? 401 : 500 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}
